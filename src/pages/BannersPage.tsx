import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorBox, PageHeader, StatusBadge, useAsync } from '../components/ui';
import { engagementApi } from '../engagement/api';
import { enText, fmtIst, LangCoverage, Pager } from '../engagement/components';
import { PLACEMENT_LABELS, PLACEMENTS, TARGET_LABELS, type Banner } from '../engagement/types';

const STATUSES = [
  ['ALL', 'All statuses'],
  ['LIVE', 'Live now'],
  ['SCHEDULED', 'Scheduled'],
  ['EXPIRED', 'Expired'],
  ['INACTIVE', 'Inactive'],
] as const;

const PAGE_SIZE = 20;

export default function BannersPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'ALL';
  const placement = params.get('placement') ?? '';
  const page = Number(params.get('page') ?? 0);
  const update = (patch: Record<string, string | number>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, String(v)));
    if (!('page' in patch)) next.set('page', '0');
    setParams(next, { replace: true });
  };

  const list = useAsync(() => engagementApi.banners({ status, placement, page, size: PAGE_SIZE }), [status, placement, page]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(b: Banner, action: () => Promise<unknown>) {
    setBusyId(b.id);
    setActionError(null);
    try {
      await action();
      list.reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const data = list.data;

  return (
    <>
      <PageHeader title="Banners & content of the day" subtitle="Cards shown inside the app between a start and end time">
        <Link to="/banners/series" className="btn">Daily series</Link>
        <Link to="/banners/new" className="btn btn-primary">New banner</Link>
      </PageHeader>

      <div className="filters">
        <select className="input" aria-label="Status" value={status} onChange={(e) => update({ status: e.target.value })}>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input" aria-label="Placement" value={placement} onChange={(e) => update({ placement: e.target.value })}>
          <option value="">All placements</option>
          {PLACEMENTS.map((p) => <option key={p} value={p}>{PLACEMENT_LABELS[p]}</option>)}
        </select>
      </div>

      {list.error && <ErrorBox message={list.error} onRetry={list.reload} />}
      {actionError && <ErrorBox message={actionError} />}

      <section className="panel flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Banner</th>
                <th>Status</th>
                <th>Placement</th>
                <th>Runs</th>
                <th>Opens</th>
                <th className="num">Priority</th>
                <th />
              </tr>
            </thead>
            <tbody className={list.loading ? 'loading' : undefined}>
              {data?.content.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link to={`/banners/${b.id}`} className="banner-cell">
                      <span className="swatch" style={{ background: b.accentColor ?? 'var(--neutral-bg)' }} aria-hidden>{b.emoji}</span>
                      <span className="user-cell">
                        <span className="user-name">{b.name}</span>
                        <span className="muted small">{enText(b.title)}</span>
                      </span>
                    </Link>
                    <LangCoverage text={b.title} />
                  </td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>{PLACEMENT_LABELS[b.placement] ?? b.placement}</td>
                  <td className="small">{fmtIst(b.startsAt)}<br /><span className="muted">→ {fmtIst(b.endsAt)}</span></td>
                  <td>{TARGET_LABELS[b.target] ?? b.target}</td>
                  <td className="num">{b.priority}</td>
                  <td className="row-actions">
                    <button className="btn btn-sm" disabled={busyId === b.id} onClick={() => act(b, () => engagementApi.setBannerActive(b.id, !b.active))}>
                      {b.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={busyId === b.id}
                      onClick={() => window.confirm(`Delete "${b.name}"?`) && act(b, () => engagementApi.deleteBanner(b.id))}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {data && data.content.length === 0 && (
                <tr><td colSpan={7} className="empty">No banners match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && <Pager page={page} totalPages={data.totalPages} onPage={(p) => update({ page: p })} />}
      </section>
    </>
  );
}
