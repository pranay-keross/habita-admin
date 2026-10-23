import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DailyBarChart } from '../components/charts';
import { ErrorBox, Kpi, PageHeader, Panel, RangePicker, useAsync } from '../components/ui';
import { categoryLabel, fmtDay, fmtExact, fmtNumber, fmtUsd } from '../format';

export default function AiUsagePage() {
  const [days, setDays] = useState(30);
  const report = useAsync(() => api.aiUsage(days, 15), [days]);
  const r = report.data;

  if (report.error) return <ErrorBox message={report.error} onRetry={report.reload} />;

  return (
    <>
      <PageHeader title="AI consumption" subtitle="Every model call the app makes, by feature and by user.">
        <RangePicker value={days} onChange={setDays} />
      </PageHeader>

      <div className="kpi-grid">
        <Kpi label="AI calls" value={r ? fmtExact(r.totalCalls) : '—'}
          hint={r ? (r.failedCalls > 0 ? `${fmtExact(r.failedCalls)} failed (${((r.failedCalls / Math.max(r.totalCalls, 1)) * 100).toFixed(1)}%)` : 'No failures') : undefined} />
        <Kpi label="Total tokens" value={r ? fmtNumber(r.totalTokens) : '—'}
          hint={r ? `${fmtNumber(r.promptTokens)} in · ${fmtNumber(r.completionTokens)} out` : undefined} />
        <Kpi label="Estimated cost" value={r ? fmtUsd(r.estimatedCostUsd) : '—'} hint="From configured per-model rates" />
        <Kpi label="Avg tokens / call" value={r && r.totalCalls ? fmtExact(Math.round(r.totalTokens / r.totalCalls)) : '—'} />
      </div>

      {r && r.unpricedModels.length > 0 && (
        <div className="notice">
          No price configured for {r.unpricedModels.join(', ')} — their tokens count as $0 in cost estimates.
          Add them to <code>AI_PRICING</code> on the backend.
        </div>
      )}

      <Panel
        title="Tokens per day"
        table={r && (
          <table className="table">
            <thead><tr><th>Day</th><th className="num">Calls</th><th className="num">Tokens</th><th className="num">Est. cost</th></tr></thead>
            <tbody>
              {[...r.byDay].reverse().map((d) => (
                <tr key={d.date}><td>{fmtDay(d.date)}</td><td className="num">{fmtExact(d.calls)}</td><td className="num">{fmtExact(d.totalTokens)}</td><td className="num">{fmtUsd(d.estimatedCostUsd)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      >
        <DailyBarChart data={r?.byDay ?? []} dataKey="totalTokens" label="Tokens" />
      </Panel>

      <Panel title="By feature" subtitle="Voice transcription is billed per audio minute, so it shows calls but no tokens">
        {r && r.byFeature.length === 0 ? <div className="empty">No AI calls in this range.</div> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Feature</th><th>Area</th><th className="num">Calls</th><th className="num">Users</th>
                  <th className="num">Prompt</th><th className="num">Completion</th><th className="num">Total tokens</th>
                  <th className="num">Avg latency</th><th className="num">Failed</th><th className="num">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {r?.byFeature.map((f) => (
                  <tr key={f.feature}>
                    <td>{f.label}</td>
                    <td className="muted">{categoryLabel(f.category)}</td>
                    <td className="num">{fmtExact(f.calls)}</td>
                    <td className="num">{fmtExact(f.users)}</td>
                    <td className="num">{fmtNumber(f.promptTokens)}</td>
                    <td className="num">{fmtNumber(f.completionTokens)}</td>
                    <td className="num strong">{fmtNumber(f.totalTokens)}</td>
                    <td className="num">{(f.avgLatencyMs / 1000).toFixed(1)}s</td>
                    <td className="num">{f.failedCalls > 0 ? fmtExact(f.failedCalls) : '—'}</td>
                    <td className="num">{fmtUsd(f.estimatedCostUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Top consumers" subtitle={`Users with the most AI tokens in the last ${days} days`}>
        {r && r.topUsers.length === 0 ? <div className="empty">No AI usage attributed to users in this range.</div> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>User</th><th>Most-used AI feature</th><th className="num">Calls</th><th className="num">Tokens</th><th className="num">Est. cost</th></tr>
              </thead>
              <tbody>
                {r?.topUsers.map((u) => (
                  <tr key={u.userId}>
                    <td><Link to={`/users/${u.userId}`}>{u.name || u.phone}</Link></td>
                    <td>{u.topFeature ?? '—'}</td>
                    <td className="num">{fmtExact(u.calls)}</td>
                    <td className="num strong">{fmtNumber(u.totalTokens)}</td>
                    <td className="num">{fmtUsd(u.estimatedCostUsd)}</td>
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
