import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UserRole, WalletAccountType } from '@mgp/database';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todas as organizações às quais o usuário pertence, incluindo seu papel e status padrão.
   */
  async listUserOrganizations(userId: string) {
    if (!userId) {
      throw new BadRequestException('Identificador de usuário não informado.');
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      isDefault: m.isDefault,
      joinedAt: m.createdAt,
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        documentCnpjCpf: m.organization.documentCnpjCpf,
        planTier: m.organization.planTier,
        isVerified: m.organization.isVerified,
        createdAt: m.organization.createdAt,
      },
    }));
  }

  /**
   * Retorna os detalhes de uma organização garantindo isolamento de tenant.
   */
  async findById(organizationId: string, userId: string, isSuperadmin = false) {
    if (!isSuperadmin) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException('Acesso negado: Você não é membro desta organização.');
      }
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        wallet: {
          include: {
            accounts: true,
          },
        },
        _count: {
          select: {
            memberships: true,
            apps: true,
            campaigns: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada.');
    }

    return organization;
  }

  /**
   * Cria uma nova organização, vincula o criador como OWNER e provisiona a Carteira Contábil com 3 contas.
   */
  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    // 1. Validar unicidade do slug
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`O identificador slug '${dto.slug}' já está em uso por outra organização.`);
    }

    // 2. Transação atômica ACID
    return this.prisma.$transaction(async (tx) => {
      // Criação da organização
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          documentCnpjCpf: dto.documentCnpjCpf,
          planTier: dto.planTier || 'FREE',
          isVerified: false,
        },
      });

      // Checa se o usuário já tem outra organização padrão
      const existingDefault = await tx.membership.findFirst({
        where: { userId, isDefault: true },
      });

      // Vincula o criador como OWNER
      const membership = await tx.membership.create({
        data: {
          userId,
          organizationId: organization.id,
          role: UserRole.OWNER,
          isDefault: !existingDefault,
        },
      });

      // Provisiona a Carteira Imutável (Wallet) da organização
      const wallet = await tx.wallet.create({
        data: {
          organizationId: organization.id,
        },
      });

      // Provisiona as 3 contas contábeis obrigatórias do Ledger
      const accountTypes = [
        WalletAccountType.ADVERTISING_CREDITS,
        WalletAccountType.EXCHANGE_CREDITS,
        WalletAccountType.PUBLISHER_EARNINGS,
      ];

      for (const accountType of accountTypes) {
        await tx.walletAccount.create({
          data: {
            walletId: wallet.id,
            type: accountType,
            currency: accountType === WalletAccountType.EXCHANGE_CREDITS ? 'CREDITS' : 'BRL',
            cachedBalance: 0.0,
          },
        });
      }

      // Registro de Auditoria
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId,
          action: 'ORGANIZATION_CREATED',
          entityType: 'Organization',
          entityId: organization.id,
          diffAfter: { name: organization.name, slug: organization.slug },
        },
      });

      return {
        ...organization,
        membership: {
          id: membership.id,
          role: membership.role,
          isDefault: membership.isDefault,
        },
      };
    });
  }

  /**
   * Adiciona um membro a uma organização após checagem de permissão RBAC (OWNER ou ADMIN).
   */
  async addMember(organizationId: string, requesterUserId: string, dto: AddMemberDto) {
    // 1. Checar se o requisitante tem privilégio OWNER ou ADMIN
    const requesterMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: requesterUserId,
          organizationId,
        },
      },
    });

    const isAuthorized =
      requesterMembership &&
      (requesterMembership.role === UserRole.OWNER || requesterMembership.role === UserRole.ADMIN);

    if (!isAuthorized) {
      throw new ForbiddenException('Apenas proprietários (OWNER) ou administradores (ADMIN) podem convidar novos membros.');
    }

    // 2. Localizar usuário pelo e-mail
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!targetUser) {
      throw new NotFoundException(`Usuário com o e-mail '${dto.email}' não foi encontrado na plataforma.`);
    }

    // 3. Checar se já é membro
    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUser.id,
          organizationId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException(`O usuário '${dto.email}' já é membro desta organização.`);
    }

    // 4. Inserir membresia
    const newMembership = await this.prisma.membership.create({
      data: {
        userId: targetUser.id,
        organizationId,
        role: dto.role,
        isDefault: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    // 5. Registrar em auditoria
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: requesterUserId,
        action: 'MEMBER_ADDED',
        entityType: 'Membership',
        entityId: newMembership.id,
        diffAfter: { invitedUserId: targetUser.id, role: dto.role },
      },
    });

    return newMembership;
  }

  /**
   * Lista os membros de uma organização garantindo que o solicitante pertence a ela.
   */
  async listMembers(organizationId: string, requesterUserId: string, isSuperadmin = false) {
    if (!isSuperadmin) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: requesterUserId,
            organizationId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException('Acesso negado: Você não possui vínculo com esta organização.');
      }
    }

    return this.prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
