import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@mgp/database';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Ordem hierárquica de papéis de gestão na plataforma MGP
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.OWNER]: 100,
  [UserRole.ADMIN]: 80,
  [UserRole.MANAGER]: 60,
  [UserRole.DEVELOPER]: 40,
  [UserRole.ANALYST]: 30,
  [UserRole.PUBLISHER]: 20,
  [UserRole.ADVERTISER]: 20,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;
    const user = request.user;

    if (user?.isSuperadmin) {
      return true;
    }

    if (!tenant || !tenant.role) {
      throw new ForbiddenException('Acesso negado: Contexto de organização ou papel não definido.');
    }

    const userRole = tenant.role as UserRole;

    // O OWNER da organização sempre possui acesso irrestrito dentro do seu tenant
    if (userRole === UserRole.OWNER) {
      return true;
    }

    // Se o papel exato está na lista de papéis permitidos
    const hasExactRole = requiredRoles.includes(userRole);
    if (hasExactRole) {
      return true;
    }

    // Se a rota exige um papel gerencial mínimo e o usuário possui hierarquia superior
    const requiredMinHierarchy = Math.min(
      ...requiredRoles.map((r) => ROLE_HIERARCHY[r] || 0),
    );
    const userHierarchy = ROLE_HIERARCHY[userRole] || 0;

    if (userHierarchy >= requiredMinHierarchy) {
      return true;
    }

    throw new ForbiddenException(
      `Privilégios insuficientes. Esta operação exige o(s) papel(is): [${requiredRoles.join(', ')}]. Seu papel atual: [${userRole}].`,
    );
  }
}
