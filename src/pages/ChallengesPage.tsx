import { Link, useSearchParams } from 'react-router-dom';
import { ErrorBox, PageHeader, StatusBadge, useAsync } from '../components/ui';
import { engagementApi } from '../engagement/api';
import { daysBetween, enText, LangCoverage, Pager } from '../engagement/components';
import { fmtDay, fmtExact } from '../format';

const STATUSES = [
  ['ALL', 'All statuses'],
  ['DRAFT', 'Draft'],
  ['PUBLISHED', 'Published'],
  ['ARCHIVED', 'Archived'],
] as const;

const PAGE_SIZE = 20;

export default function ChallengesPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'ALL';
  const page = Number(params.get('page') ?? 0);
  const update = (patch: Record<string, string | number>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, String(v)));
    if (!('page' in patch)) next.set('page', '0');
    setParams(next, { replace: true });
  };

  const list = useAsync(() => engagementApi.challenges({ status, page, size: PAGE_SIZE }), [status, page]);
  const data = list.data;

  return (
    <>
      <PageHeader title="Seasonal challenges" subtitle="Multi-day checklists with a badge — Navratri, Diwali Ghar Ready, New Year Reset">
        <Link to="/challenges/new" className="btn btn-primary">New challenge</Link>
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
                <th>Challenge</th>
                <th>Status</th>
                <th>Runs</th>
                <th className="num">Days</th>
                <th className="num">Participants</th>
                <th className="num">Earned badge</th>
              </tr>
            </thead>
            <tbody className={list.loading ? 'loading' : undefined}>
              {data?.content.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/challenges/${c.id}`} className="banner-cell">
                      <span className="swatch" style={{ background: c.accentColor ?? 'var(--neutral-bg)' }} aria-hidden>{c.badgeEmoji}</span>
                      <span className="user-cell">
                        <span className="user-name">{enText(c.title)}</span>
                        <span className="muted small">Badge: {enText(c.badgeTitle)}</span>
                      </span>
                    </Link>
                    <LangCoverage text={c.title} />
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="small">{fmtDay(c.startsOn)} → {fmtDay(c.endsOn)}</td>
                  <td className="num">{daysBetween(c.startsOn, c.endsOn) + 1}</td>
                  <td className="num">{fmtExact(c.participants)}</td>
                  <td className="num">
                    {fmtExact(c.completers)}
                    {c.participants > 0 && <span className="muted small"> ({Math.round((c.completers / c.participants) * 100)}%)</span>}
                  </td>
                </tr>
              ))}
              {data && data.content.length === 0 && (
                <tr><td colSpan={6} className="empty">No challenges yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && <Pager page={page} totalPages={data.totalPages} onPage={(p) => update({ page: p })} />}
      </section>
    </>
  );
}
