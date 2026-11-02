import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@mgp/database';
import { TenantContext } from '../interfaces/tenant-context.interface';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Acesso não autenticado: Usuário não identificado na requisição.');
    }

    let organizationId =
      (request.headers['x-organization-id'] as string) ||
      (request.query?.organizationId as string);

    // Se não informou organização no header, buscar a organização padrão do usuário
    if (!organizationId) {
      const defaultMembership = await this.prisma.membership.findFirst({
        where: {
          userId: user.id,
          isDefault: true,
        },
      });

      if (defaultMembership) {
        organizationId = defaultMembership.organizationId;
      } else {
        // Fallback para a primeira organização do usuário
        const anyMembership = await this.prisma.membership.findFirst({
          where: { userId: user.id },
        });

        if (anyMembership) {
          organizationId = anyMembership.organizationId;
        } else {
          throw new BadRequestException(
            'Cabeçalho X-Organization-Id é obrigatório. O usuário não possui organizações vinculadas.',
          );
        }
      }
    }

    // Se o usuário for Superadmin global, conceder acesso com papel OWNER
    if (user.isSuperadmin) {
      const tenantContext: TenantContext = {
        organizationId,
        role: UserRole.OWNER,
        userId: user.id,
        isSuperadmin: true,
      };
      request.tenant = tenantContext;
      return true;
    }

    // Verificar se o usuário possui membresia válida e ativa na organização
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Acesso negado: Você não possui vínculo com a organização informada.');
    }

    const tenantContext: TenantContext = {
      organizationId: membership.organizationId,
      role: membership.role,
      userId: user.id,
      isSuperadmin: false,
    };

    request.tenant = tenantContext;
    return true;
  }
}

