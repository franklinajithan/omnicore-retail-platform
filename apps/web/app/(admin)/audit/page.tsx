'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { getStoredToken } from '@/app/lib/auth';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

const formatAction = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.replace('/'); return; }
    let active = true;
    api.get<{ logs: AuditLog[] }>('/api/v1/audit', token)
      .then((data) => { if (active) { setLogs(Array.isArray(data.logs) ? data.logs : []); setError(''); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Unable to load audit events'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router, reload]);

  const actions = useMemo(() => [...new Set(logs.map((log) => log.action))].sort(), [logs]);
  const entities = useMemo(() => [...new Set(logs.map((log) => log.entityType))].sort(), [logs]);
  const filtered = useMemo(() => logs.filter((log) => {
    const text = [log.action, log.entityType, log.entityId, log.user?.firstName, log.user?.lastName, log.user?.email].filter(Boolean).join(' ').toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (!action || log.action === action) && (!entity || log.entityType === entity);
  }), [logs, search, action, entity]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const resetPage = () => setPage(1);

  return (
    <div className="audit-page">
      <div className="audit-heading">
        <div><div className="audit-eyebrow">SECURITY & COMPLIANCE</div><h1>Audit trail</h1><p>Review activity across your organisation, users and stores.</p></div>
        <button type="button" className="btn btn-secondary" onClick={() => { setLoading(true); setReload((n) => n + 1); }}>↻ Refresh</button>
      </div>
      <div className="audit-stats">
        <div className="audit-stat"><span>Total events</span><strong>{logs.length.toLocaleString('en-GB')}</strong><small>Available audit records</small></div>
        <div className="audit-stat"><span>Event types</span><strong>{actions.length}</strong><small>Distinct actions</small></div>
        <div className="audit-stat"><span>Entity types</span><strong>{entities.length}</strong><small>Recorded resources</small></div>
      </div>
      <section className="audit-panel">
        <div className="audit-panel-heading"><div><h2>Activity history</h2><p>Search and filter recorded events</p></div><span className="audit-count">{filtered.length} results</span></div>
        <div className="audit-filters">
          <label className="audit-search"><span>Search events</span><input className="form-input" value={search} placeholder="Action, user, resource or ID…" onChange={(e) => { setSearch(e.target.value); resetPage(); }} /></label>
          <label><span>Action</span><select className="form-select" value={action} onChange={(e) => { setAction(e.target.value); resetPage(); }}><option value="">All actions</option>{actions.map((item) => <option key={item} value={item}>{formatAction(item)}</option>)}</select></label>
          <label><span>Entity</span><select className="form-select" value={entity} onChange={(e) => { setEntity(e.target.value); resetPage(); }}><option value="">All entities</option>{entities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          {(search || action || entity) && <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setAction(''); setEntity(''); resetPage(); }}>Clear</button>}
        </div>
        {loading ? <div className="audit-empty" role="status">Loading activity history…</div> : error ? <div className="audit-empty audit-error" role="alert"><strong>Unable to load audit events</strong><p>{error}</p><button className="btn btn-secondary" onClick={() => { setLoading(true); setReload((n) => n + 1); }}>Try again</button></div> : filtered.length === 0 ? <div className="audit-empty"><strong>No events found</strong><p>{logs.length ? 'Try changing your search or filters.' : 'Activity will appear here when events are recorded.'}</p></div> : <>
          <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>Date & time</th><th>Activity</th><th>Resource</th><th>Performed by</th><th>Reference</th></tr></thead><tbody>{visible.map((log) => <tr key={log.id}><td className="audit-date">{formatDate(log.createdAt)}</td><td><span className="audit-action">{formatAction(log.action)}</span></td><td><span className="audit-entity">{log.entityType}</span></td><td><strong>{log.user ? [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.email : 'System'}</strong>{log.user?.email && <small>{log.user.email}</small>}</td><td className="audit-reference" title={log.entityId || ''}>{log.entityId || '—'}</td></tr>)}</tbody></table></div>
          <div className="audit-pagination"><span>Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, filtered.length)} of {filtered.length}</span><div><button className="btn btn-secondary" disabled={current === 1} onClick={() => setPage((n) => Math.max(1, n - 1))}>Previous</button><span>Page {current} of {pages}</span><button className="btn btn-secondary" disabled={current === pages} onClick={() => setPage((n) => Math.min(pages, n + 1))}>Next</button></div></div>
        </>}
      </section>
    </div>
  );
}
