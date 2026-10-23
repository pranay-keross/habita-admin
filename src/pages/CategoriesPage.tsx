import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { HBarList, heatColor, heatInkIsLight } from '../components/charts';
import { Empty, ErrorBox, PageHeader, Panel, RangePicker, useAsync } from '../components/ui';
import { categoryLabel, fmtExact, fmtNumber } from '../format';

function usePrefersDark() {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

export default function CategoriesPage() {
  const [days, setDays] = useState(30);
  const categories = useAsync(() => api.categories(days), [days]);
  const matrix = useAsync(() => api.userCategories(days, 25), [days]);
  const dark = usePrefersDark();

  const cats = categories.data ?? [];
  // Matrix columns: categories anyone in the top-25 actually used, ordered by overall popularity.
  const used = new Set((matrix.data ?? []).flatMap((r) => Object.keys(r.requestsByCategory)));
  const columns = cats.map((c) => c.category).filter((c) => used.has(c));
  const max = Math.max(0, ...(matrix.data ?? []).flatMap((r) => Object.values(r.requestsByCategory)));

  return (
    <>
      <PageHeader title="Feature usage" subtitle="Which parts of the app people use, and who uses what.">
        <RangePicker value={days} onChange={setDays} />
      </PageHeader>

      <div className="grid-2">
        <Panel title="Requests by feature" subtitle={`Last ${days} days`}>
          {categories.error ? <ErrorBox message={categories.error} onRetry={categories.reload} /> : (
            <HBarList rows={cats.map((c) => ({ key: c.category, label: categoryLabel(c.category), value: c.requests }))} />
          )}
        </Panel>
        <Panel title="Reach by feature" subtitle="Distinct users who used each feature">
          {categories.error ? <ErrorBox message={categories.error} /> : (
            <HBarList
              rows={[...cats].sort((a, b) => b.users - a.users).map((c) => ({
                key: c.category,
                label: categoryLabel(c.category),
                value: c.users,
                detail: c.aiCalls > 0 ? `${fmtExact(c.aiCalls)} AI calls` : undefined,
              }))}
              format={fmtExact}
            />
          )}
        </Panel>
      </div>

      <Panel title="Who uses what" subtitle="The 25 most active users, requests per feature (darker = more)">
        {matrix.error ? <ErrorBox message={matrix.error} onRetry={matrix.reload} /> : !matrix.data?.length ? (
          <Empty>No activity recorded in this range yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table heatmap">
              <thead>
                <tr>
                  <th>User</th>
                  <th className="num">Total</th>
                  {columns.map((c) => <th key={c} className="heat-head"><span>{categoryLabel(c)}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.data.map((row) => (
                  <tr key={row.userId}>
                    <td><Link to={`/users/${row.userId}`}>{row.name || row.phone}</Link></td>
                    <td className="num">{fmtExact(row.totalRequests)}</td>
                    {columns.map((c) => {
                      const v = row.requestsByCategory[c] ?? 0;
                      return (
                        <td
                          key={c}
                          className="heat-cell"
                          title={`${row.name || row.phone} · ${categoryLabel(c)}: ${fmtExact(v)} requests`}
                          style={{ background: heatColor(v, max, dark), color: heatInkIsLight(v, max, dark) ? '#ffffff' : '#0b0b0b' }}
                        >
                          {v > 0 ? fmtNumber(v) : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
