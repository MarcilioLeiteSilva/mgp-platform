import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestApiKeyMeta {
  organizationId: string;
  keyId: string;
  scopes: string[];
  quotaUsed: number;
  quotaRemaining: number;
}

export const ApiKeyMeta = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestApiKeyMeta => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKeyMeta;
  },
);
