import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Guardião que restringe acesso exclusivamente a usuários com papel global SUPERADMIN.
 */
@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    if (!user.isSuperadmin) {
      throw new ForbiddenException(
        'Acesso negado: Este recurso é restrito ao time operacional e engenharia da MGP (Superadmin).',
      );
    }

    return true;
  }
}
