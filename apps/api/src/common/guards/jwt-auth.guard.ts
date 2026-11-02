import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../../config/app-config.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token de acesso JWT não fornecido no cabeçalho Authorization.');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato de autorização inválido. Utilize o padrão: Bearer <token>.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.jwtAccessSecret,
      });

      request.user = {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
        isSuperadmin: payload.isSuperadmin,
        activeOrgId: payload.activeOrgId,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Access token JWT inválido ou expirado.');
    }
  }
}

