import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DailyLineChart, HBarList } from '../components/charts';
import { ErrorBox, Kpi, PageHeader, Panel, RangePicker, useAsync } from '../components/ui';
import { categoryLabel, fmtDay, fmtExact, fmtNumber, fmtUsd } from '../format';

export default function OverviewPage() {
  const [days, setDays] = useState(30);
  const overview = useAsync(() => api.overview(), []);
  const activity = useAsync(() => api.activity(days), [days]);
  const categories = useAsync(() => api.categories(days), [days]);
  const ai = useAsync(() => api.aiUsage(days, 5), [days]);

  const o = overview.data;
  return (
    <>
      <PageHeader title="Overview" subtitle="Who is using Habita AI, what they use, and what AI costs.">
        <RangePicker value={days} onChange={setDays} />
      </PageHeader>

      {overview.error && <ErrorBox message={overview.error} onRetry={overview.reload} />}
      <div className="kpi-grid">
        <Kpi label="Registered users" value={o ? fmtExact(o.verifiedUsers) : '—'}
          hint={o ? `+${fmtExact(o.newUsers7d)} this week · +${fmtExact(o.newUsers30d)} in 30d` : undefined} />
        <Kpi label="Active today" value={o ? fmtExact(o.dailyActiveUsers) : '—'}
          hint={o ? `${fmtExact(o.weeklyActiveUsers)} this week · ${fmtExact(o.monthlyActiveUsers)} in 30d` : undefined} />
        <Kpi label="AI calls (30d)" value={o ? fmtNumber(o.aiCalls30d) : '—'}
          hint={o && o.aiFailedCalls30d > 0 ? `${fmtExact(o.aiFailedCalls30d)} failed` : 'No failures'} />
        <Kpi label="AI tokens (30d)" value={o ? fmtNumber(o.aiTokens30d) : '—'}
          hint={o ? `≈ ${fmtUsd(o.aiEstimatedCostUsd30d)} estimated` : undefined} />
        <Kpi label="Suspended" value={o ? fmtExact(o.suspendedUsers) : '—'}
          hint={o ? `${fmtExact(o.pendingDeletionUsers)} pending deletion` : undefined} />
      </div>

      <Panel
        title="User activity"
        subtitle={`Daily active users and new sign-ups, last ${days} days`}
        table={activity.data && (
          <table className="table">
            <thead><tr><th>Day</th><th className="num">Active users</th><th className="num">New users</th><th className="num">API requests</th><th className="num">AI calls</th></tr></thead>
            <tbody>
              {[...activity.data].reverse().map((p) => (
                <tr key={p.date}><td>{fmtDay(p.date)}</td><td className="num">{p.activeUsers}</td><td className="num">{p.newUsers}</td><td className="num">{fmtExact(p.requests)}</td><td className="num">{fmtExact(p.aiCalls)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      >
        {activity.error ? <ErrorBox message={activity.error} onRetry={activity.reload} /> : (
          <DailyLineChart
            data={activity.data ?? []}
            series={[
              { key: 'activeUsers', label: 'Active users', color: 'var(--series-1)' },
              { key: 'newUsers', label: 'New users', color: 'var(--series-2)' },
            ]}
          />
        )}
      </Panel>

      <div className="grid-2">
        <Panel title="Most-used features" subtitle={<>API requests by area · <Link to="/categories">per-user breakdown →</Link></>}>
          {categories.error ? <ErrorBox message={categories.error} onRetry={categories.reload} /> : (
            <HBarList
              rows={(categories.data ?? []).slice(0, 8).map((c) => ({
                key: c.category,
                label: categoryLabel(c.category),
                value: c.requests,
                detail: `${fmtExact(c.users)} users`,
              }))}
            />
          )}
        </Panel>
        <Panel title="AI consumption by feature" subtitle={<>Tokens in the last {days} days · <Link to="/ai-usage">details →</Link></>}>
          {ai.error ? <ErrorBox message={ai.error} onRetry={ai.reload} /> : (
            <HBarList
              rows={(ai.data?.byFeature ?? []).slice(0, 8).map((f) => ({
                key: f.feature,
                label: f.label,
                value: f.totalTokens,
                detail: `${fmtExact(f.calls)} calls`,
              }))}
              emptyText="No AI calls recorded in this range."
            />
          )}
        </Panel>
      </div>
    </>
  );
}
