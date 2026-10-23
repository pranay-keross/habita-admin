import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { DailyLineChart, HBarList } from '../components/charts';
import { ErrorBox, Kpi, PageHeader, Panel, RangePicker, StatusBadge, useAsync } from '../components/ui';
import { categoryLabel, fmtDate, fmtDay, fmtExact, fmtNumber, fmtRelativeDay, fmtUsd } from '../format';

export default function UserDetailPage() {
  const { userId = '' } = useParams();
  const [days, setDays] = useState(30);
  const detail = useAsync(() => api.user(userId, days), [userId, days]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (detail.error) return <ErrorBox message={detail.error} onRetry={detail.reload} />;
  const d = detail.data;
  if (!d) return <div className="boot">Loading…</div>;
  const u = d.user;
  const suspended = u.status === 'SUSPENDED';

  async function toggleSuspend() {
    const verb = suspended ? 'Reactivate' : 'Suspend';
    const warning = suspended
      ? `Reactivate ${u.name || u.phone}? They will be able to sign in again.`
      : `Suspend ${u.name || u.phone}? They are signed out immediately and cannot sign in until reactivated.`;
    if (!window.confirm(warning)) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await api.setUserActive(u.id, suspended);
      detail.setData({ ...d!, user: updated });
    } catch (e) {
      setActionError(`${verb} failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const totalRequests = d.activity.reduce((s, p) => s + p.requests, 0);
  const activeDays = d.activity.filter((p) => p.requests > 0).length;
  const aiCalls = d.aiUsage.reduce((s, f) => s + f.calls, 0);
  const aiTokens = d.aiUsage.reduce((s, f) => s + f.totalTokens, 0);

  return (
    <>
      <Link to="/users" className="back-link">← All users</Link>
      <PageHeader title={u.name || 'Unnamed user'} subtitle={[u.phone, u.email, u.city].filter(Boolean).join(' · ')}>
        <RangePicker value={days} onChange={setDays} />
        <button className={suspended ? 'btn' : 'btn btn-danger'} onClick={toggleSuspend} disabled={busy}>
          {busy ? 'Saving…' : suspended ? 'Reactivate' : 'Suspend'}
        </button>
      </PageHeader>
      {actionError && <ErrorBox message={actionError} />}

      <div className="meta-row">
        <StatusBadge status={u.status} />
        <span>Joined {fmtDate(u.createdAt)}</span>
        <span>Last sign-in {fmtDate(u.lastLoginAt)}</span>
        <span>Last active {fmtRelativeDay(u.lastActiveDate)}</span>
        <span>Profile {u.profileCompleted ? 'complete' : 'incomplete'}</span>
        {d.devicePlatforms.length > 0 && <span>Devices: {d.devicePlatforms.join(', ')}</span>}
        {u.deletionRequestedAt && <span>Deletion requested {fmtDate(u.deletionRequestedAt)}</span>}
      </div>

      <div className="kpi-grid">
        <Kpi label={`Active days (${days}d)`} value={`${activeDays} / ${d.days}`} />
        <Kpi label={`Requests (${days}d)`} value={fmtExact(totalRequests)} />
        <Kpi label={`AI calls (${days}d)`} value={fmtExact(aiCalls)} />
        <Kpi label={`AI tokens (${days}d)`} value={fmtNumber(aiTokens)} hint={`≈ ${fmtUsd(d.aiEstimatedCostUsd)} estimated`} />
      </div>

      <Panel
        title="Daily activity"
        subtitle="API requests per day"
        table={
          <table className="table">
            <thead><tr><th>Day</th><th className="num">Requests</th><th className="num">AI calls</th></tr></thead>
            <tbody>
              {[...d.activity].reverse().map((p) => (
                <tr key={p.date}><td>{fmtDay(p.date)}</td><td className="num">{fmtExact(p.requests)}</td><td className="num">{fmtExact(p.aiCalls)}</td></tr>
              ))}
            </tbody>
          </table>
        }
      >
        <DailyLineChart data={d.activity} series={[{ key: 'requests', label: 'Requests', color: 'var(--series-1)' }]} height={220} />
      </Panel>

      <div className="grid-2">
        <Panel title="Features used" subtitle="API requests by area">
          <HBarList
            rows={d.categories.filter((c) => c.requests > 0).map((c) => ({
              key: c.category,
              label: categoryLabel(c.category),
              value: c.requests,
              detail: c.aiCalls > 0 ? `${fmtExact(c.aiCalls)} AI calls` : undefined,
            }))}
            emptyText="No activity in this range."
          />
        </Panel>
        <Panel title="AI consumption" subtitle="Tokens by AI feature">
          {d.aiUsage.length === 0 ? <div className="empty">No AI calls in this range.</div> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Feature</th><th className="num">Calls</th><th className="num">Tokens</th><th className="num">Est. cost</th></tr></thead>
                <tbody>
                  {d.aiUsage.map((f) => (
                    <tr key={f.feature}>
                      <td>{f.label}{f.failedCalls > 0 && <span className="muted small"> · {f.failedCalls} failed</span>}</td>
                      <td className="num">{fmtExact(f.calls)}</td>
                      <td className="num">{fmtNumber(f.totalTokens)}</td>
                      <td className="num">{fmtUsd(f.estimatedCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Families">
        {d.families.length === 0 ? <div className="empty">Not a member of any family.</div> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Family</th><th>Role</th><th className="num">Members</th></tr></thead>
              <tbody>
                {d.families.map((f) => (
                  <tr key={f.familyId}><td>{f.familyName}</td><td>{f.role === 'OWNER' ? 'Owner' : 'Member'}</td><td className="num">{f.memberCount}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
