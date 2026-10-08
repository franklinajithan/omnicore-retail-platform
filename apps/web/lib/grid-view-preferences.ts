/**
 * Shared, tenant-scoped AG Grid view preferences.
 *
 * Consumers must pass the authenticated tenant/user/store identifiers.
 * This module never uses unscoped localStorage keys and never stores row data.
 */
export interface GridViewScope {
  tenantId: string;
  userId: string;
  storeId?: string | null;
  gridId: string;
}

export interface GridViewPreferences {
  version: 1;
  columnState: Array<{
    colId: string;
    hide?: boolean | null;
    width?: number;
    pinned?: 'left' | 'right' | null;
    sort?: 'asc' | 'desc' | null;
    sortIndex?: number | null;
  }>;
  filterModel: Record<string, unknown>;
  pageSize?: number;
}

const PREFIX = 'omnicore:grid-view:v1';
const MAX_BYTES = 100_000;

function validScope(scope: GridViewScope): boolean {
  return Boolean(scope.tenantId?.trim() && scope.userId?.trim() && scope.gridId?.trim());
}

export function gridViewStorageKey(scope: GridViewScope): string {
  if (!validScope(scope)) throw new Error('Grid view scope requires tenantId, userId and gridId');
  return [PREFIX, scope.tenantId, scope.userId, scope.storeId || 'all-stores', scope.gridId]
    .map(encodeURIComponent)
    .join(':');
}

function availableStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadGridView(scope: GridViewScope): GridViewPreferences | null {
  const storage = availableStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(gridViewStorageKey(scope));
    if (!raw || raw.length > MAX_BYTES) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<GridViewPreferences>;
    if (candidate.version !== 1 || !Array.isArray(candidate.columnState) ||
        !candidate.filterModel || typeof candidate.filterModel !== 'object' ||
        Array.isArray(candidate.filterModel)) return null;
    if (!candidate.columnState.every(column =>
      column && typeof column.colId === 'string' && column.colId.length > 0
    )) return null;
    return candidate as GridViewPreferences;
  } catch {
    return null;
  }
}

export function saveGridView(scope: GridViewScope, preferences: GridViewPreferences): boolean {
  const storage = availableStorage();
  if (!storage || preferences.version !== 1 ||
      !Array.isArray(preferences.columnState) ||
      !preferences.filterModel || typeof preferences.filterModel !== 'object') return false;
  try {
    const json = JSON.stringify(preferences);
    if (json.length > MAX_BYTES) return false;
    storage.setItem(gridViewStorageKey(scope), json);
    return true;
  } catch {
    return false;
  }
}

export function resetGridView(scope: GridViewScope): void {
  const storage = availableStorage();
  if (!storage) return;
  try {
    storage.removeItem(gridViewStorageKey(scope));
  } catch {
    // Storage can be disabled by browser policy.
  }
}
