'use client';

import { useCallback, useState } from 'react';
import { AppSidebar, DrawerBackdrop } from '../app-shell';
import { WorkspaceTabs } from '../workspace';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

type EventRow = {
  id: string;
  action: string;
  actorId: string | null;
  saleId: string | null;
  quantity: number | null;
  remainingBefore: number | null;
  remainingAfter: number | null;
  reason: string | null;
  createdAt: string;
  rtc: { id: string; labelCode: string; productId: string; status: string };
};

const columns: ColDef<EventRow>[] = [
  { field: 'createdAt', headerName: 'Time', minWidth: 175, valueFormatter: p => p.value ? new Date(p.value).toLocaleString() : '' },
  { field: 'rtc.labelCode', headerName: 'RTC Label', minWidth: 160 },
  { field: 'rtc.productId', headerName: 'Product', minWidth: 200 },
  { field: 'action', minWidth: 120 },
  { field: 'quantity', headerName: 'Qty Changed', minWidth: 130 },
  { field: 'remainingBefore', headerName: 'Before', minWidth: 100 },
  { field: 'remainingAfter', headerName: 'After', minWidth: 100 },
  { field: 'actorId', headerName: 'Employee / Cashier', minWidth: 200 },
  { field: 'saleId', headerName: 'Sale', minWidth: 200 },
  { field: 'reason', minWidth: 180 },
];

export default function RtcHistoryPage() {
  const [storeId, setStoreId] = useState('');
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<EventRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const load = useCallback(async () => {
    if (!storeId.trim() || !token.trim()) { setError('Store ID and store credential required'); return; }
    setLoading(true); setError('');
    try {
      const origin = process.env.NEXT_PUBLIC_OMNICORE_API_URL;
      if (!origin) throw new Error('API URL is not configured');
      const response = await fetch(`${origin.replace(/\/$/, '')}/retail/v1/stores/${encodeURIComponent(storeId.trim())}/rtc-history?limit=200`, {
        headers: { Authorization: `Bearer ${token.trim()}` }, cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Unable to load RTC history (HTTP ${response.status})`);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error('Unexpected API response');
      setRows(data as EventRow[]);
    } catch (err) { setRows([]); setError(err instanceof Error ? err.message : 'Request failed'); }
    finally { setLoading(false); }
  }, [storeId, token]);

  return (
    <div className="app"><DrawerBackdrop open={menuOpen} onClose={() => setMenuOpen(false)} /><AppSidebar active="RTC & Markdown" open={menuOpen} onClose={() => setMenuOpen(false)} /><main className="main"><header className="top"><button className="menuButton" onClick={() => setMenuOpen(true)} aria-label="Open navigation">Menu</button><WorkspaceTabs /></header><div className="content" style={{ display: 'grid', gap: 16 }}>
      <header><h1>RTC History</h1><p>Review reduced-to-clear label activity for your store.</p></header>
      <form onSubmit={e => { e.preventDefault(); void load(); }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <label>Store <input value={storeId} onChange={e => setStoreId(e.target.value)} placeholder="Store code or ID" required /></label>
        <label>Store credential <input type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} required /></label>
        <button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Load history'}</button>
      </form>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      <div style={{ height: 620, width: '100%' }}>
        <AgGridReact<EventRow> rowData={rows} columnDefs={columns} defaultColDef={{ sortable: true, filter: true, resizable: true }} pagination paginationPageSize={25} />
      </div>
      <p>{rows.length} events loaded. The API currently returns the latest 200 events.</p>
    </div></main></div>
  );
}
