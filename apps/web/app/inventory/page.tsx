'use client';
import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Grid, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { AppSidebar, DrawerBackdrop } from '../app-shell';
import { WorkspaceTabs } from '../workspace';

type ValuationRow = { productId: string; sku: string; name: string; quantity: string; unitCost: string | null; estimatedValue: string | null };
type Valuation = { method: string; estimatedTotalOfPricedRows: string; missingCostRows: number; complete: boolean; rows: ValuationRow[] };
type Balance = { quantity: string; productId: string; storeId: string } | null;
const sections = ['Stock overview', 'Goods receiving', 'Store transfers', 'Stock adjustments', 'Valuation'] as const;
const fields: Record<string, { key: string; label: string }[]> = {
  'Goods receiving': [{ key: 'orderId', label: 'Purchase order ID' }, { key: 'productId', label: 'Product ID' }, { key: 'receivedQuantity', label: 'Received quantity' }],
  'Store transfers': [{ key: 'fromStoreId', label: 'Source store ID' }, { key: 'toStoreId', label: 'Destination store ID' }, { key: 'productId', label: 'Product ID' }, { key: 'quantity', label: 'Transfer quantity' }],
  'Stock adjustments': [{ key: 'productId', label: 'Product ID' }, { key: 'countedQuantity', label: 'Physical count' }, { key: 'reason', label: 'Adjustment reason' }],
};

export default function InventoryPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [apiOrigin, setApiOrigin] = useState(process.env.NEXT_PUBLIC_OMNICORE_API_URL || '');
  const [token, setToken] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [balance, setBalance] = useState<Balance>(null);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const section = sections[tab];
  async function request(path: string, init?: RequestInit) {
    if (!apiOrigin.trim() || !token.trim() || !tenantId.trim()) throw new Error('API URL, bearer token and tenant ID are required');
    const response = await fetch(`${apiOrigin.replace(/\/$/, '')}/inventory/v1/${path}`, {
      ...init, headers: { Authorization: `Bearer ${token.trim()}`, 'Content-Type': 'application/json' },
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof data === 'object' && data !== null && 'message' in data ? String(data.message) : `API error ${response.status}`);
    return data;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setResult('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setBusy(false); }
  }
  function post(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const referenceId = crypto.randomUUID();
      const idempotencyKey = crypto.randomUUID();
      let endpoint = '';
      let body: Record<string, unknown> = { tenantId, idempotencyKey, referenceId };
      if (section === 'Goods receiving') {
        endpoint = 'receipts';
        body = { tenantId, storeId, orderId: form.orderId, idempotencyKey,
          lines: [{ productId: form.productId, receivedQuantity: form.receivedQuantity }] };
      } else if (section === 'Store transfers') {
        endpoint = 'transfers';
        body = { ...body, fromStoreId: form.fromStoreId, toStoreId: form.toStoreId,
          productId: form.productId, quantity: form.quantity };
      } else if (section === 'Stock adjustments') {
        endpoint = 'adjustments';
        body = { ...body, storeId, productId: form.productId,
          countedQuantity: form.countedQuantity, reason: form.reason };
      } else return;
      const data = await request(endpoint, { method: 'POST', body: JSON.stringify(body) });
      setResult(JSON.stringify(data, null, 2));
    });
  }
  return <Box className="app">
    <DrawerBackdrop open={menuOpen} onClose={() => setMenuOpen(false)} />
    <AppSidebar active="Inventory" open={menuOpen} onClose={() => setMenuOpen(false)} />
    <Box component="main" className="main" sx={{ minWidth: 0 }}>
      <Box component="header" className="top"><Button onClick={() => setMenuOpen(true)}>☰</Button><WorkspaceTabs /><Typography fontWeight={700}>Inventory & Warehouse</Typography></Box>
      <Box className="content" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>Inventory & Warehouse</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Live stock workflows. No sample stock data is displayed.</Typography>
        <Card sx={{ mb: 3 }}><CardContent>
          <Typography variant="h6" gutterBottom>Connection & store scope</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="API origin" value={apiOrigin} onChange={e => setApiOrigin(e.target.value)} placeholder="https://api.example.com" /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="password" label="Head-office API bearer token" value={token} onChange={e => setToken(e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Tenant ID" value={tenantId} onChange={e => setTenantId(e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Store ID" value={storeId} onChange={e => setStoreId(e.target.value)} /></Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">Token stays in page memory. This temporary connection form must be replaced by session-based RBAC before production.</Typography>
        </CardContent></Card>
        <Card><CardContent>
          <Tabs value={tab} onChange={(_, value: number) => { setTab(value); setError(''); setResult(''); }} variant="scrollable" scrollButtons="auto" sx={{ mb: 3 }}>
            {sections.map(item => <Tab key={item} label={item} />)}
          </Tabs>
          {section === 'Stock overview' && <Stack spacing={2}>
            <Typography variant="h6">Product stock balance</Typography>
            <TextField label="Product ID" value={form.productId || ''} onChange={e => setForm({ ...form, productId: e.target.value })} />
            <Button disabled={busy} variant="contained" onClick={() => void run(async () => {
              if (!storeId || !form.productId) throw new Error('Store ID and product ID required');
              const data = await request(`stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(form.productId)}/balance?tenantId=${encodeURIComponent(tenantId)}`);
              setBalance(data as Balance);
            })}>Load stock balance</Button>
            {balance && <Chip label={`Available stock: ${balance.quantity}`} color="primary" />}
            {result && <Typography>{result}</Typography>}
          </Stack>}
          {section === 'Valuation' && <Stack spacing={2}>
            <Typography variant="h6">Indicative stock valuation</Typography>
            <Button disabled={busy} variant="contained" onClick={() => void run(async () => {
              if (!storeId) throw new Error('Store ID required');
              setValuation(await request(`valuation/stores/${encodeURIComponent(storeId)}?tenantId=${encodeURIComponent(tenantId)}`) as Valuation);
            })}>Load valuation</Button>
            {valuation && <>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip label={`Estimated value: ${valuation.estimatedTotalOfPricedRows}`} color="primary" />
                <Chip label={`Missing costs: ${valuation.missingCostRows}`} color={valuation.complete ? 'success' : 'warning'} />
              </Stack>
              <Box sx={{ overflowX: 'auto' }}><Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& td, & th': { p: 1.5, textAlign: 'left', borderBottom: '1px solid #ddd' } }}>
                <thead><tr><th>SKU</th><th>Product</th><th>Quantity</th><th>Unit cost</th><th>Estimated value</th></tr></thead>
                <tbody>{valuation.rows.map(row => <tr key={row.productId}><td>{row.sku}</td><td>{row.name}</td><td>{row.quantity}</td><td>{row.unitCost ?? 'Missing'}</td><td>{row.estimatedValue ?? 'Unpriced'}</td></tr>)}</tbody>
              </Box></Box>
              <Alert severity="info">Uses latest purchase-order cost. Not an accounting-grade FIFO or weighted-average valuation.</Alert>
            </>}
          </Stack>}
          {section in fields && <Box component="form" onSubmit={post}>
            <Typography variant="h6" gutterBottom>{section}</Typography>
            <Grid container spacing={2}>{fields[section].map(field => <Grid size={{ xs: 12, md: 6 }} key={field.key}>
              <TextField required fullWidth label={field.label} value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })} />
            </Grid>)}</Grid>
            <Divider sx={{ my: 3 }} />
            <Alert severity="warning" sx={{ mb: 2 }}>Posting changes real stock balances. Verify identifiers and quantities before submitting.</Alert>
            <Button type="submit" variant="contained" disabled={busy || !storeId || !tenantId}>{busy ? 'Processing…' : `Post ${section.toLowerCase()}`}</Button>
          </Box>}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {result && <Box component="pre" sx={{ mt: 2, p: 2, bgcolor: 'action.hover', overflowX: 'auto', whiteSpace: 'pre-wrap', fontSize: 13 }}>{result}</Box>}
        </CardContent></Card>
      </Box>
    </Box>;
}
