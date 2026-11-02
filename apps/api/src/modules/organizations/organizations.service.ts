import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UserRole, WalletAccountType, InvitationStatus } from '@mgp/database';

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
   * Atualiza dados cadastrais da organização (exige papel OWNER ou ADMIN).
   */
  async updateOrganization(
    organizationId: string,
    requesterUserId: string,
    dto: UpdateOrganizationDto,
    isSuperadmin = false,
  ) {
    if (!isSuperadmin) {
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
        throw new ForbiddenException(
          'Apenas proprietários (OWNER) ou administradores (ADMIN) podem atualizar a organização.',
        );
      }
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organização não encontrada.');
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.documentCnpjCpf !== undefined ? { documentCnpjCpf: dto.documentCnpjCpf } : {}),
        ...(dto.planTier ? { planTier: dto.planTier } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: requesterUserId,
        action: 'ORGANIZATION_UPDATED',
        entityType: 'Organization',
        entityId: organizationId,
        diffBefore: { name: org.name, documentCnpjCpf: org.documentCnpjCpf, planTier: org.planTier },
        diffAfter: { name: updated.name, documentCnpjCpf: updated.documentCnpjCpf, planTier: updated.planTier },
      },
    });

    return updated;
  }

  /**
   * Define uma organização como padrão do usuário.
   */
  async setDefaultOrganization(organizationId: string, userId: string) {
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

    await this.prisma.$transaction(async (tx) => {
      await tx.membership.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      await tx.membership.update({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
        data: { isDefault: true },
      });
    });

    return {
      success: true,
      message: 'Organização padrão definida com sucesso.',
      organizationId,
    };
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

  /**
   * Adiciona um membro diretamente a uma organização após checagem de permissão RBAC.
   */
  async addMember(organizationId: string, requesterUserId: string, dto: AddMemberDto, isSuperadmin = false) {
    if (!isSuperadmin) {
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
        throw new ForbiddenException(
          'Apenas proprietários (OWNER) ou administradores (ADMIN) podem convidar novos membros.',
        );
      }

      if (requesterMembership.role === UserRole.ADMIN && (dto.role === UserRole.OWNER || dto.role === UserRole.ADMIN)) {
        throw new ForbiddenException('Administradores não podem adicionar membros como OWNER ou ADMIN.');
      }
    }

    // Localizar usuário pelo e-mail
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!targetUser) {
      throw new NotFoundException(`Usuário com o e-mail '${dto.email}' não foi encontrado na plataforma.`);
    }

    // Checar se já é membro
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
   * Altera o papel RBAC de um membro da organização com salvaguardas estritas.
   */
  async updateMemberRole(
    organizationId: string,
    requesterUserId: string,
    memberUserId: string,
    dto: UpdateMemberRoleDto,
    isSuperadmin = false,
  ) {
    if (!isSuperadmin) {
      const requesterMembership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: requesterUserId,
            organizationId,
          },
        },
      });

      if (!requesterMembership) {
        throw new ForbiddenException('Acesso negado: Você não é membro desta organização.');
      }

      const isOwner = requesterMembership.role === UserRole.OWNER;
      const isAdmin = requesterMembership.role === UserRole.ADMIN;

      if (!isOwner && !isAdmin) {
        throw new ForbiddenException('Apenas OWNER ou ADMIN podem alterar papéis de membros.');
      }

      // ADMIN não pode conceder papel de OWNER ou ADMIN
      if (isAdmin && (dto.role === UserRole.OWNER || dto.role === UserRole.ADMIN)) {
        throw new ForbiddenException('Administradores não têm permissão para promover membros a OWNER ou ADMIN.');
      }
    }

    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: memberUserId,
          organizationId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Membro não encontrado nesta organização.');
    }

    // Se o alvo for OWNER e o novo papel não for OWNER, verificar se é o único OWNER
    if (targetMembership.role === UserRole.OWNER && dto.role !== UserRole.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          organizationId,
          role: UserRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Não é possível rebaixar o único proprietário (OWNER) da organização. Transfira a posse antes.',
        );
      }
    }

    const updated = await this.prisma.membership.update({
      where: {
        userId_organizationId: {
          userId: memberUserId,
          organizationId,
        },
      },
      data: {
        role: dto.role,
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

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: requesterUserId,
        action: 'MEMBER_ROLE_UPDATED',
        entityType: 'Membership',
        entityId: targetMembership.id,
        diffBefore: { role: targetMembership.role },
        diffAfter: { role: dto.role },
      },
    });

    return updated;
  }

  /**
   * Remove um membro da organização ou processa saída voluntária.
   */
  async removeMember(
    organizationId: string,
    requesterUserId: string,
    memberUserId: string,
    isSuperadmin = false,
  ) {
    const isSelfRemoval = requesterUserId === memberUserId;

    if (!isSuperadmin && !isSelfRemoval) {
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
        throw new ForbiddenException('Apenas OWNER ou ADMIN podem remover membros da organização.');
      }
    }

    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: memberUserId,
          organizationId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Membro não encontrado nesta organização.');
    }

    // Se o alvo for OWNER, não pode ser removido se for o único OWNER
    if (targetMembership.role === UserRole.OWNER) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          organizationId,
          role: UserRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Não é possível remover o único proprietário (OWNER) da organização. Transfira a posse antes.',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.membership.delete({
        where: {
          userId_organizationId: {
            userId: memberUserId,
            organizationId,
          },
        },
      });

      // Se a membresia era padrão, escolhe outra organização para ser a padrão
      if (targetMembership.isDefault) {
        const remaining = await tx.membership.findFirst({
          where: { userId: memberUserId },
          orderBy: { createdAt: 'asc' },
        });

        if (remaining) {
          await tx.membership.update({
            where: { id: remaining.id },
            data: { isDefault: true },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: requesterUserId,
          action: isSelfRemoval ? 'MEMBER_LEFT' : 'MEMBER_REMOVED',
          entityType: 'Membership',
          entityId: targetMembership.id,
          diffBefore: { userId: memberUserId, role: targetMembership.role },
        },
      });
    });

    return {
      success: true,
      message: isSelfRemoval
        ? 'Você saiu da organização com sucesso.'
        : 'Membro removido da organização com sucesso.',
    };
  }

  /**
   * Transfere a posse (OWNER) da organização para outro membro ativo.
   */
  async transferOwnership(
    organizationId: string,
    currentOwnerUserId: string,
    dto: TransferOwnershipDto,
    isSuperadmin = false,
  ) {
    if (!isSuperadmin) {
      const currentOwnerMembership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: currentOwnerUserId,
            organizationId,
          },
        },
      });

      if (!currentOwnerMembership || currentOwnerMembership.role !== UserRole.OWNER) {
        throw new ForbiddenException(
          'Apenas o proprietário atual (OWNER) pode transferir a posse da organização.',
        );
      }
    }

    if (currentOwnerUserId === dto.newOwnerUserId) {
      throw new BadRequestException('O novo proprietário deve ser um membro diferente do atual.');
    }

    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: dto.newOwnerUserId,
          organizationId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('O usuário indicado não é membro desta organização.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Promover novo OWNER
      await tx.membership.update({
        where: {
          userId_organizationId: {
            userId: dto.newOwnerUserId,
            organizationId,
          },
        },
        data: { role: UserRole.OWNER },
      });

      // Rebaixar antigo OWNER para ADMIN
      await tx.membership.update({
        where: {
          userId_organizationId: {
            userId: currentOwnerUserId,
            organizationId,
          },
        },
        data: { role: UserRole.ADMIN },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: currentOwnerUserId,
          action: 'OWNERSHIP_TRANSFERRED',
          entityType: 'Organization',
          entityId: organizationId,
          diffBefore: { ownerUserId: currentOwnerUserId },
          diffAfter: { ownerUserId: dto.newOwnerUserId },
        },
      });

      return {
        success: true,
        message: 'Posse da organização transferida com sucesso. O proprietário anterior agora é ADMIN.',
        newOwnerUserId: dto.newOwnerUserId,
      };
    });
  }

  // ==============================================================================
  // Gestão de Convites (Invitations)
  // ==============================================================================

  /**
   * Cria um convite seguro com token para um e-mail.
   */
  async createInvitation(
    organizationId: string,
    requesterUserId: string,
    dto: CreateInvitationDto,
    isSuperadmin = false,
  ) {
    if (!isSuperadmin) {
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
        throw new ForbiddenException(
          'Apenas proprietários (OWNER) ou administradores (ADMIN) podem enviar convites.',
        );
      }

      if (requesterMembership.role === UserRole.ADMIN && (dto.role === UserRole.OWNER || dto.role === UserRole.ADMIN)) {
        throw new ForbiddenException('Administradores não podem convidar novos membros como OWNER ou ADMIN.');
      }
    }

    // Verificar se já é membro ativo
    const existingMember = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          where: { organizationId },
        },
      },
    });

    if (existingMember && existingMember.memberships.length > 0) {
      throw new ConflictException(`O e-mail '${dto.email}' já pertence a um membro ativo desta organização.`);
    }

    // Revoga convite pendente anterior para o mesmo email se houver
    await this.prisma.organizationInvitation.updateMany({
      where: {
        organizationId,
        email: dto.email,
        status: InvitationStatus.PENDING,
      },
      data: {
        status: InvitationStatus.REVOKED,
      },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias de validade

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: dto.email,
        role: dto.role,
        token,
        invitedById: requesterUserId,
        status: InvitationStatus.PENDING,
        expiresAt,
      },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: requesterUserId,
        action: 'INVITATION_CREATED',
        entityType: 'OrganizationInvitation',
        entityId: invitation.id,
        diffAfter: { email: dto.email, role: dto.role, expiresAt },
      },
    });

    return invitation;
  }

  /**
   * Lista os convites da organização.
   */
  async listInvitations(organizationId: string, requesterUserId: string, isSuperadmin = false) {
    if (!isSuperadmin) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: requesterUserId,
            organizationId,
          },
        },
      });

      const isAuthorized =
        membership && (membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN);

      if (!isAuthorized) {
        throw new ForbiddenException('Apenas OWNER ou ADMIN podem listar convites da organização.');
      }
    }

    return this.prisma.organizationInvitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Revoga um convite pendente.
   */
  async revokeInvitation(
    organizationId: string,
    invitationId: string,
    requesterUserId: string,
    isSuperadmin = false,
  ) {
    if (!isSuperadmin) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: requesterUserId,
            organizationId,
          },
        },
      });

      const isAuthorized =
        membership && (membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN);

      if (!isAuthorized) {
        throw new ForbiddenException('Apenas OWNER ou ADMIN podem revogar convites.');
      }
    }

    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado.');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Apenas convites com status PENDENTE podem ser revogados.');
    }

    const revoked = await this.prisma.organizationInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: requesterUserId,
        action: 'INVITATION_REVOKED',
        entityType: 'OrganizationInvitation',
        entityId: invitationId,
      },
    });

    return revoked;
  }

  /**
   * Consulta os dados de um convite pelo token (público / antes de aceitar).
   */
  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        invitedBy: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado ou token inválido.');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Este convite já foi processado (Status: ${invitation.status}).`);
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Este convite expirou.');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
      invitedBy: invitation.invitedBy,
    };
  }

  /**
   * Aceita um convite com o usuário logado.
   */
  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado ou token inválido.');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Este convite não está mais pendente (Status: ${invitation.status}).`);
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Este convite expirou.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Checar se já é membro
      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMembership) {
        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.ACCEPTED },
        });

        return {
          success: true,
          message: 'Você já era membro desta organização. O convite foi marcado como aceito.',
          membership: existingMembership,
        };
      }

      // Checa se o usuário já tem outra organização padrão
      const existingDefault = await tx.membership.findFirst({
        where: { userId, isDefault: true },
      });

      const membership = await tx.membership.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
          isDefault: !existingDefault,
        },
        include: {
          organization: true,
        },
      });

      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      await tx.auditLog.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          action: 'INVITATION_ACCEPTED',
          entityType: 'OrganizationInvitation',
          entityId: invitation.id,
          diffAfter: { role: invitation.role },
        },
      });

      return {
        success: true,
        message: 'Convite aceito com sucesso! Bem-vindo à organização.',
        membership,
      };
    });
  }
}
