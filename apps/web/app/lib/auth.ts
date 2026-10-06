export function createMockToken(tenantId: string, userId: string, permissions: string[]) {
  const payload = {
    tenantId,
    userId,
    roles: ['TENANT_ADMIN'],
    permissions,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('omnicore_token');
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('omnicore_token', token);
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('omnicore_token');
}
