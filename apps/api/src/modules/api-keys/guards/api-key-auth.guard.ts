import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../services/api-keys.service';
import { PUBLIC_API_SCOPE_KEY } from '../decorators/public-api-scope.decorator';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const requiredScope = this.reflector.getAllAndOverride<string>(PUBLIC_API_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const rawHeader =
      request.headers['x-api-key'] ||
      request.headers['authorization'] ||
      '';

    let apiKey = '';
    if (typeof rawHeader === 'string') {
      if (rawHeader.startsWith('Bearer ') || rawHeader.startsWith('ApiKey ')) {
        apiKey = rawHeader.split(' ')[1]?.trim() || '';
      } else {
        apiKey = rawHeader.trim();
      }
    }

    if (!apiKey) {
      throw new UnauthorizedException(
        'Autenticação necessária. Forneça o cabeçalho "X-API-Key" ou "Authorization: Bearer <sua_chave>".',
      );
    }

    const authResult = await this.apiKeysService.validateAndConsumeKey(
      apiKey,
      requiredScope,
    );

    // Injeta metadados na requisição para controllers e logs
    request.organizationId = authResult.organizationId;
    request.apiKeyMeta = authResult;

    // Cabeçalhos HTTP informativos para o desenvolvedor externo
    if (response && typeof response.setHeader === 'function') {
      response.setHeader('X-RateLimit-Limit', '60');
      response.setHeader('X-Quota-Used', String(authResult.quotaUsed));
      response.setHeader('X-Quota-Remaining', String(authResult.quotaRemaining));
    }

    return true;
  }
}
