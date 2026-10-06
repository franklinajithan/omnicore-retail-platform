export interface TenantContext {
  tenantId: string;
  userId?: string;
  roles: string[];
  permissions: string[];
}

export interface AuthenticatedRequest {
  tenant: TenantContext;
}
