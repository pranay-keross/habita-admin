import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { ErrorBox, PageHeader, RangePicker, StatusBadge, useAsync } from '../components/ui';
import { fmtDate, fmtExact, fmtNumber, fmtRelativeDay } from '../format';

const STATUSES = [
  ['ALL', 'All statuses'],
  ['ACTIVE', 'Active'],
  ['SUSPENDED', 'Suspended'],
  ['PENDING_DELETION', 'Deletion pending'],
  ['UNVERIFIED', 'Unverified'],
] as const;

const SORTS = [
  ['createdAt', 'Newest first'],
  ['lastActive', 'Recently active'],
  ['requests', 'Most requests'],
  ['aiTokens', 'Most AI tokens'],
  ['name', 'Name A–Z'],
] as const;

const PAGE_SIZE = 20;

export default function UsersPage() {
  // Filters live in the URL so a filtered list can be bookmarked and survives "back" from a user.
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'ALL';
  const sort = params.get('sort') ?? 'createdAt';
  const days = Number(params.get('days') ?? 30);
  const page = Number(params.get('page') ?? 0);

  const [search, setSearch] = useState(q);
  const update = (patch: Record<string, string | number>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => next.set(k, String(v)));
    if (!('page' in patch)) next.set('page', '0');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => update({ q: search }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const users = useAsync(() => api.users({ q, status, sort, days, page, size: PAGE_SIZE }), [q, status, sort, days, page]);
  const data = users.data;

  return (
    <>
      <PageHeader title="Users" subtitle={data ? `${fmtExact(data.totalElements)} matching accounts` : 'Manage app accounts'}>
        <RangePicker value={days} onChange={(d) => update({ days: d })} />
      </PageHeader>

      <div className="filters">
        <input
          className="input search"
          type="search"
          placeholder="Search name, phone or email"
          aria-label="Search users"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" aria-label="Status" value={status} onChange={(e) => update({ status: e.target.value })}>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input" aria-label="Sort" value={sort} onChange={(e) => update({ sort: e.target.value })}>
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {users.error && <ErrorBox message={users.error} onRetry={users.reload} />}

      <section className="panel flush">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last active</th>
                <th className="num">Requests ({days}d)</th>
                <th className="num">AI calls ({days}d)</th>
                <th className="num">AI tokens ({days}d)</th>
              </tr>
            </thead>
            <tbody className={users.loading ? 'loading' : undefined}>
              {data?.content.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link to={`/users/${u.id}`} className="user-cell">
                      <span className="user-name">{u.name || 'Unnamed user'}</span>
                      <span className="muted small">{u.phone}{u.email ? ` · ${u.email}` : ''}</span>
                    </Link>
                  </td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>{fmtRelativeDay(u.lastActiveDate)}</td>
                  <td className="num">{fmtExact(u.requests)}</td>
                  <td className="num">{fmtExact(u.aiCalls)}</td>
                  <td className="num">{fmtNumber(u.aiTokens)}</td>
                </tr>
              ))}
              {data && data.content.length === 0 && (
                <tr><td colSpan={7} className="empty">No users match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="pager">
            <button className="btn btn-sm" disabled={page <= 0} onClick={() => update({ page: page - 1 })}>Previous</button>
            <span className="muted small">Page {page + 1} of {data.totalPages}</span>
            <button className="btn btn-sm" disabled={page + 1 >= data.totalPages} onClick={() => update({ page: page + 1 })}>Next</button>
          </div>
        )}
      </section>
    </>
  );
}
