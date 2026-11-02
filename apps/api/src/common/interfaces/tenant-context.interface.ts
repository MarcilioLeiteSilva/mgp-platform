import { UserRole } from '@mgp/database';

export interface TenantContext {
  organizationId: string;
  role: UserRole;
  userId: string;
  isSuperadmin: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  isSuperadmin: boolean;
  defaultOrganizationId?: string;
}

