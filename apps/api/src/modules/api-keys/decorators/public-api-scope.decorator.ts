import { SetMetadata } from '@nestjs/common';

export const PUBLIC_API_SCOPE_KEY = 'public_api_scope';
export const PublicApiScope = (scope: string) => SetMetadata(PUBLIC_API_SCOPE_KEY, scope);
