import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { PasswordService } from './password.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, WalletAccountType, User } from '@mgp/database';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Cadastra um novo usuário, provisiona seu tenant inicial como OWNER e inicializa a Carteira.
   */
  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    // 1. Validar e-mail único
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException(`O e-mail '${dto.email}' já está em uso na plataforma.`);
    }

    // 2. Normalizar ou gerar slug da organização
    let slug =
      dto.organizationSlug ||
      dto.organizationName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    if (!slug) {
      slug = `org-${Date.now()}`;
    }

    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      slug = `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`;
    }

    // 3. Hash da senha
    const passwordHash = await this.passwordService.hash(dto.password);

    // 4. Criação atômica (User + Org + Membership + Wallet + 3 Accounts)
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          fullName: dto.fullName.trim(),
          passwordHash,
          isActive: true,
          isSuperadmin: false,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName.trim(),
          slug,
          planTier: 'FREE',
          isVerified: false,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: UserRole.OWNER,
          isDefault: true,
        },
      });

      const wallet = await tx.wallet.create({
        data: { organizationId: organization.id },
      });

      for (const accountType of [
        WalletAccountType.ADVERTISING_CREDITS,
        WalletAccountType.EXCHANGE_CREDITS,
        WalletAccountType.PUBLISHER_EARNINGS,
      ]) {
        await tx.walletAccount.create({
          data: {
            walletId: wallet.id,
            type: accountType,
            currency: accountType === WalletAccountType.EXCHANGE_CREDITS ? 'CREDITS' : 'BRL',
            cachedBalance: 0.0,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          action: 'USER_REGISTERED',
          entityType: 'User',
          entityId: user.id,
          ipAddress,
          userAgent,
        },
      });

      return { user, organization, membership };
    });

    // 5. Emissão de par de tokens
    return this.generateTokenPair(
      result.user,
      result.organization.id,
      result.organization.name,
      result.organization.slug,
      result.membership.role,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Autentica o usuário e emite par de tokens (Access + Refresh) com registro de sessão.
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        memberships: {
          include: { organization: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const isValidPassword = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Conta de usuário inativa. Entre em contato com o suporte.');
    }

    const activeMembership =
      user.memberships.find((m) => m.isDefault) || user.memberships[0];

    if (!activeMembership) {
      throw new ForbiddenException('Usuário não possui vínculo com nenhuma organização.');
    }

    return this.generateTokenPair(
      user,
      activeMembership.organizationId,
      activeMembership.organization.name,
      activeMembership.organization.slug,
      activeMembership.role,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Rotação obrigatória de refresh token com detecção de reuso e roubo de sessão.
   */
  async refreshToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token é obrigatório.');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { refreshToken: tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              include: { organization: true },
              orderBy: { isDefault: 'desc' },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Refresh token inválido ou não encontrado.');
    }

    // DETECÇÃO DE ROUBO: Token já consumido/revogado sendo apresentado novamente
    if (session.isRevoked) {
      await this.prisma.session.updateMany({
        where: { userId: session.userId },
        data: { isRevoked: true },
      });

      throw new UnauthorizedException(
        'Tentativa de reuso de token detectada. Todas as sessões deste usuário foram encerradas por segurança.',
      );
    }

    // Token expirado
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado. Realize um novo login.');
    }

    // Invalida a sessão atual (mecanismo de rotação atômica)
    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    const activeMembership =
      session.user.memberships.find((m) => m.isDefault) || session.user.memberships[0];

    if (!activeMembership) {
      throw new ForbiddenException('Usuário sem organização ativa.');
    }

    return this.generateTokenPair(
      session.user,
      activeMembership.organizationId,
      activeMembership.organization.name,
      activeMembership.organization.slug,
      activeMembership.role,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Encerra a sessão ativa revogando o refresh token.
   */
  async logout(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashRefreshToken(refreshToken);
      await this.prisma.session.updateMany({
        where: { refreshToken: tokenHash },
        data: { isRevoked: true },
      });
    }

    return { message: 'Sessão encerrada com sucesso.' };
  }

  /**
   * Obtém o perfil completo do usuário autenticado e suas organizações vinculadas.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isSuperadmin: true,
        isActive: true,
        createdAt: true,
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                planTier: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  /**
   * Gera o par de tokens (Access JWT + Refresh Token) e persiste a sessão no banco.
   */
  private async generateTokenPair(
    user: User,
    activeOrgId: string,
    orgName: string,
    orgSlug: string,
    role: UserRole,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      isSuperadmin: user.isSuperadmin,
      activeOrgId,
      role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.jwtAccessSecret,
      expiresIn: this.configService.jwtAccessExpiresIn as any,
    });

    const rawRefreshToken = `${randomUUID()}_${randomUUID().replace(/-/g, '')}`;
    const tokenHash = this.hashRefreshToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokenHash,
        userAgent,
        ipAddress,
        isRevoked: false,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isSuperadmin: user.isSuperadmin,
      },
      organization: {
        id: activeOrgId,
        name: orgName,
        slug: orgSlug,
        role,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: 900, // 15 minutos em segundos
        tokenType: 'Bearer',
      },
    };
  }

  /**
   * Gera hash SHA-256 do refresh token para armazenamento seguro e busca indexada.
   */
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
