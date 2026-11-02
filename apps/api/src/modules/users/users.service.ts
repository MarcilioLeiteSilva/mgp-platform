import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PasswordService } from '../auth/password.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Obtém os dados completos de perfil do usuário, suas organizações e contagem de sessões ativas.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        isSuperadmin: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            isDefault: true,
            createdAt: true,
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
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            sessions: {
              where: {
                isRevoked: false,
                expiresAt: { gt: new Date() },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isSuperadmin: user.isSuperadmin,
      activeSessionsCount: user._count.sessions,
      memberships: user.memberships.map((m) => ({
        membershipId: m.id,
        role: m.role,
        isDefault: m.isDefault,
        joinedAt: m.createdAt,
        organization: m.organization,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Atualiza informações cadastrais do usuário (ex: nome completo).
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        isSuperadmin: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_PROFILE_UPDATED',
        entityType: 'User',
        entityId: userId,
        diffBefore: { fullName: user.fullName },
        diffAfter: { fullName: updated.fullName },
      },
    });

    return updated;
  }

  /**
   * Altera a senha do usuário com verificação da senha anterior e revogação preventiva de sessões.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const isCurrentValid = await this.passwordService.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentValid) {
      throw new BadRequestException('A senha atual fornecida está incorreta.');
    }

    const newHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      // 1. Atualiza hash da senha
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      // 2. Revoga todas as sessões anteriores por segurança
      await tx.session.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });

      // 3. Auditoria
      await tx.auditLog.create({
        data: {
          userId,
          action: 'USER_PASSWORD_CHANGED',
          entityType: 'User',
          entityId: userId,
        },
      });
    });

    return {
      success: true,
      message: 'Senha alterada com sucesso! Todas as sessões anteriores foram revogadas por segurança.',
    };
  }
}
