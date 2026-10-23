import { Link, useSearchParams } from 'react-router-dom';
import { ErrorBox, PageHeader, StatusBadge, useAsync } from '../components/ui';
import { engagementApi } from '../engagement/api';
import { enText, fmtIst, LangCoverage, Pager } from '../engagement/components';
import { TARGET_LABELS, type Campaign } from '../engagement/types';
import { fmtDate, fmtExact } from '../format';

const STATUSES = [
  ['ALL', 'All statuses'],
  ['DRAFT', 'Draft'],
  ['SCHEDULED', 'Scheduled'],
  ['SENDING', 'Sending'],
  ['SENT', 'Sent'],
  ['FAILED', 'Failed'],
  ['CANCELLED', 'Cancelled'],
] as const;

const PAGE_SIZE = 20;

export function audienceLabel(c: Pick<Campaign, 'audienceType' | 'audienceValue'>) {
  switch (c.audienceType) {
    case 'ALL': return 'All users';
    case 'PLATFORM': return c.audienceValue === 'IOS' ? 'iOS devices' : 'Android devices';
    case 'CITY': return `City: ${c.audienceValue ?? '—'}`;
    case 'USERS': {
      const n = c.audienceValue ? c.audienceValue.split(',').filter(Boolean).length : 0;
      return `${n} selected user${n === 1 ? '' : 's'}`;
    }
  }
}

export default function CampaignsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'ALL';
  const page = Number(params.get('page') ?? 0);
  const update = (patch: Record<string, string | number>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, String(v)));
    if (!('page' in patch)) next.set('page', '0');
    setParams(next, { replace: true });
  };

  const list = useAsync(() => engagementApi.campaigns({ status, page, size: PAGE_SIZE }), [status, page]);
  const data = list.data;

  return (
    <>
      <PageHeader title="Push campaigns" subtitle="Festive pushes sent to app users — now or on a schedule">
        <Link to="/campaigns/new" className="btn btn-primary">New campaign</Link>
      </PageHeader>

      <div className="filters">
        <select className="input" aria-label="Status" value={status} onChange={(e) => update({ status: e.target.value })}>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {list.error && <ErrorBox message={list.error} onRetry={list.reload} />}

      <section className="panel flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Audience</th>
                <th>Opens</th>
                <th>When</th>
                <th className="num">Delivered</th>
                <th className="num">Failed</th>
              </tr>
            </thead>
            <tbody className={list.loading ? 'loading' : undefined}>
              {data?.content.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/campaigns/${c.id}`} className="user-cell">
                      <span className="user-name">{c.name}</span>
                      <span className="muted small">{enText(c.title)}</span>
                    </Link>
                    <LangCoverage text={c.title} />
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{audienceLabel(c)}</td>
                  <td>{TARGET_LABELS[c.target] ?? c.target}</td>
                  <td className="small">
                    {c.sentAt ? <>Sent {fmtIst(c.sentAt)}</>
                      : c.scheduledAt ? <>Scheduled {fmtIst(c.scheduledAt)}</>
                        : <>Created {fmtDate(c.createdAt)}</>}
                  </td>
                  <td className="num">{c.successCount == null ? '—' : fmtExact(c.successCount)}</td>
                  <td className="num">{c.failureCount == null ? '—' : fmtExact(c.failureCount)}</td>
                </tr>
              ))}
              {data && data.content.length === 0 && (
                <tr><td colSpan={7} className="empty">No campaigns yet. Create one to reach users with a festive push.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && <Pager page={page} totalPages={data.totalPages} onPage={(p) => update({ page: p })} />}
      </section>
    </>
  );
}
