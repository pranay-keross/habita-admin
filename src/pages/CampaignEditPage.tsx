import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { UserSummary } from '../api';
import { ErrorBox, Kpi, PageHeader, Panel, StatusBadge } from '../components/ui';
import { engagementApi } from '../engagement/api';
import {
  browserIsIst,
  cleanText,
  Field,
  fmtIst,
  fromLocalInput,
  LocalizedTextInput,
  SuccessBox,
  TargetPicker,
  targetError,
  toLocalInput,
  UserPicker,
} from '../engagement/components';
import {
  LANG_LABELS,
  LANGS,
  TARGET_LABELS,
  type AudienceEstimate,
  type AudienceType,
  type Campaign,
  type CampaignRequest,
  type Lang,
} from '../engagement/types';
import { fmtExact } from '../format';
import { audienceLabel } from './CampaignsPage';

const EMPTY: CampaignRequest = {
  name: '',
  title: { en: '' },
  body: { en: '' },
  imageUrl: null,
  target: 'DASHBOARD',
  targetParam: null,
  audienceType: 'ALL',
  audienceValue: null,
};

const AUDIENCES: [AudienceType, string][] = [
  ['ALL', 'All users'],
  ['PLATFORM', 'By platform'],
  ['CITY', 'By city'],
  ['USERS', 'Specific users'],
];

const EDITABLE = ['DRAFT', 'SCHEDULED'];

function toRequest(c: Campaign): CampaignRequest {
  return {
    name: c.name,
    title: c.title,
    body: c.body,
    imageUrl: c.imageUrl,
    target: c.target,
    targetParam: c.targetParam,
    audienceType: c.audienceType,
    audienceValue: c.audienceValue,
  };
}

function validate(f: CampaignRequest): string | null {
  if (!f.name.trim()) return 'Give the campaign an internal name.';
  if (f.name.trim().length > 120) return 'Name must be 120 characters or fewer.';
  if (!f.title.en?.trim()) return 'English title is required.';
  if (f.title.en.trim().length > 80) return 'English title must be 80 characters or fewer.';
  if (!f.body.en?.trim()) return 'English message is required.';
  if (f.body.en.trim().length > 300) return 'English message must be 300 characters or fewer.';
  if (f.audienceType !== 'ALL' && !f.audienceValue?.trim()) {
    return f.audienceType === 'CITY' ? 'Enter a city.' : f.audienceType === 'USERS' ? 'Pick at least one user.' : 'Choose a platform.';
  }
  return targetError(f.target, f.targetParam);
}

function normalize(f: CampaignRequest): CampaignRequest {
  return {
    ...f,
    name: f.name.trim(),
    title: cleanText(f.title) ?? { en: '' },
    body: cleanText(f.body) ?? { en: '' },
    imageUrl: f.imageUrl?.trim() || null,
    audienceValue: f.audienceType === 'ALL' ? null : f.audienceValue?.trim() || null,
  };
}

export default function CampaignEditPage() {
  const { campaignId } = useParams();
  const isNew = !campaignId;
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { copy?: CampaignRequest; notice?: string } | null;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignRequest>(() => (isNew && routeState?.copy) || EMPTY);
  const [saved, setSaved] = useState<string>(JSON.stringify(EMPTY));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(routeState?.notice ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState<Lang>('en');
  const [estimate, setEstimate] = useState<AudienceEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [testUser, setTestUser] = useState<UserSummary | null>(null);
  const [pickedUsers, setPickedUsers] = useState<Record<string, UserSummary>>({});

  const load = (c: Campaign) => {
    setCampaign(c);
    const req = toRequest(c);
    setForm(req);
    setSaved(JSON.stringify(req));
    setScheduleAt(toLocalInput(c.scheduledAt));
  };

  useEffect(() => {
    if (isNew) return;
    let current = true;
    engagementApi.campaign(campaignId).then((c) => current && load(c)).catch((e: Error) => current && setLoadError(e.message));
    return () => {
      current = false;
    };
  }, [campaignId, isNew]);

  // Poll while the backend is still fanning out.
  useEffect(() => {
    if (campaign?.status !== 'SENDING') return;
    const t = setInterval(() => {
      engagementApi.campaign(campaign.id).then((c) => {
        setCampaign(c);
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [campaign?.status, campaign?.id]);

  // Live audience estimate.
  useEffect(() => {
    const value = form.audienceType === 'ALL' ? null : form.audienceValue?.trim() || null;
    if (form.audienceType !== 'ALL' && !value) {
      setEstimate(null);
      return;
    }
    let current = true;
    const t = setTimeout(() => {
      engagementApi.estimateAudience(form.audienceType, value)
        .then((e) => { if (current) { setEstimate(e); setEstimateError(null); } })
        .catch((e: Error) => current && setEstimateError(e.message));
    }, 400);
    return () => {
      current = false;
      clearTimeout(t);
    };
  }, [form.audienceType, form.audienceValue]);

  const editable = isNew || (campaign != null && EDITABLE.includes(campaign.status));
  const dirty = JSON.stringify(form) !== saved;
  const set = <K extends keyof CampaignRequest>(key: K, value: CampaignRequest[K]) => setForm((f) => ({ ...f, [key]: value }));

  const userIds = useMemo(
    () => (form.audienceType === 'USERS' && form.audienceValue ? form.audienceValue.split(',').map((s) => s.trim()).filter(Boolean) : []),
    [form.audienceType, form.audienceValue],
  );

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  /** Saves pending edits (or creates the draft). Returns the up-to-date campaign. */
  async function persist(): Promise<Campaign> {
    const problem = validate(form);
    if (problem) throw new Error(problem);
    const body = normalize(form);
    const result = isNew || !campaign
      ? await engagementApi.createCampaign(body)
      : await engagementApi.updateCampaign(campaign.id, body);
    load(result);
    // The edit route remounts and re-reads the campaign; carry the confirmation across.
    if (isNew) navigate(`/campaigns/${result.id}`, { replace: true, state: { notice: 'Draft saved. Send a test, schedule it or send it now.' } });
    return result;
  }

  async function ensureSaved(): Promise<Campaign> {
    if (!campaign || (editable && dirty)) return persist();
    return campaign;
  }

  const onSave = () => run('save', async () => {
    await persist();
    if (!isNew) setNotice('Changes saved.');
  });

  const onTest = () => run('test', async () => {
    if (!testUser) throw new Error('Pick a user to send the test to.');
    const c = await ensureSaved();
    const r = await engagementApi.testCampaign(c.id, testUser.id);
    setNotice(r.targetDevices === 0
      ? `${testUser.name || testUser.phone} has no active devices — nothing was sent.`
      : `Test sent to ${testUser.name || testUser.phone}: ${r.successCount} delivered, ${r.failureCount} failed (of ${r.targetDevices} device${r.targetDevices === 1 ? '' : 's'}).`);
  });

  const onSchedule = () => run('schedule', async () => {
    if (!scheduleAt) throw new Error('Pick a date and time.');
    const iso = fromLocalInput(scheduleAt);
    if (new Date(iso).getTime() <= Date.now()) throw new Error('Schedule time must be in the future.');
    const c = await ensureSaved();
    load(await engagementApi.scheduleCampaign(c.id, iso));
    setNotice(`Scheduled for ${fmtIst(iso)}.`);
  });

  const onSendNow = () => run('send', async () => {
    const problem = validate(form);
    if (problem) throw new Error(problem);
    const devices = estimate ? `about ${fmtExact(estimate.devices)} device${estimate.devices === 1 ? '' : 's'} (${fmtExact(estimate.users)} users)` : 'the selected audience';
    if (!window.confirm(`Send "${form.title.en}" now to ${devices}? This cannot be undone.`)) return;
    const c = await ensureSaved();
    load(await engagementApi.sendCampaign(c.id));
    setNotice('Sending started.');
  });

  const onCancel = () => run('cancel', async () => {
    if (!campaign || !window.confirm('Cancel this scheduled campaign? It will not be sent.')) return;
    load(await engagementApi.cancelCampaign(campaign.id));
    setNotice('Campaign cancelled.');
  });

  const onDelete = () => run('delete', async () => {
    if (!campaign || !window.confirm(`Delete "${campaign.name}"?`)) return;
    await engagementApi.deleteCampaign(campaign.id);
    navigate('/campaigns', { replace: true });
  });

  const onDuplicate = () => {
    if (!campaign) return;
    navigate('/campaigns/new', { state: { copy: { ...toRequest(campaign), name: `${campaign.name} (copy)` } } });
  };

  if (loadError) return <ErrorBox message={loadError} />;
  if (!isNew && !campaign) return <div className="boot">Loading…</div>;

  const previewTitle = form.title[previewLang]?.trim() || form.title.en || 'Notification title';
  const previewBody = form.body[previewLang]?.trim() || form.body.en || 'Your message appears here.';
  const sentish = campaign && ['SENDING', 'SENT', 'FAILED'].includes(campaign.status);

  return (
    <>
      <Link to="/campaigns" className="back-link">← All campaigns</Link>
      <PageHeader
        title={isNew ? 'New campaign' : campaign!.name}
        subtitle={isNew ? 'Write the push, choose who gets it and where a tap lands.' : `Created by ${campaign!.createdBy ?? 'unknown'}`}
      >
        {campaign && <StatusBadge status={campaign.status} />}
        {campaign && <button className="btn" onClick={onDuplicate}>Duplicate</button>}
        {editable && (
          <button className="btn btn-primary" onClick={onSave} disabled={!!busy || (!isNew && !dirty)}>
            {busy === 'save' ? 'Saving…' : isNew ? 'Save draft' : 'Save changes'}
          </button>
        )}
      </PageHeader>

      {error && <ErrorBox message={error} />}
      {notice && <SuccessBox message={notice} onDismiss={() => setNotice(null)} />}
      {campaign?.status === 'SCHEDULED' && (
        <div className="notice">Scheduled for {fmtIst(campaign.scheduledAt)}. Edits are saved to the scheduled send.</div>
      )}

      {sentish && (
        <div className="kpi-grid">
          <Kpi label="Target devices" value={campaign!.targetDevices == null ? '—' : fmtExact(campaign!.targetDevices)} />
          <Kpi label="Delivered" value={campaign!.successCount == null ? '—' : fmtExact(campaign!.successCount)}
            hint={campaign!.targetDevices ? `${Math.round(((campaign!.successCount ?? 0) / campaign!.targetDevices) * 100)}% of devices` : undefined} />
          <Kpi label="Failed" value={campaign!.failureCount == null ? '—' : fmtExact(campaign!.failureCount)} />
          <Kpi label="Sent at" value={<span className="kpi-small">{fmtIst(campaign!.sentAt)}</span>} />
        </div>
      )}
      {campaign?.lastError && <ErrorBox message={`Last error: ${campaign.lastError}`} />}

      <div className="editor-grid">
        <div>
          <Panel title="Message">
            <fieldset className="form-grid" disabled={!editable}>
              <Field label="Internal name" hint="Only admins see this." wide>
                <input className="input" value={form.name} maxLength={120} onChange={(e) => set('name', e.target.value)} placeholder="Karwa Chauth reminder — evening" />
              </Field>
              <LocalizedTextInput label="Title" required maxLength={80} value={form.title} onChange={(v) => set('title', v)} placeholder="Karwa Chauth is tomorrow 🌙" />
              <LocalizedTextInput label="Message" required multiline maxLength={300} value={form.body} onChange={(v) => set('body', v)} placeholder="Your outfit and thali checklist are ready in Habita." />
              <Field label="Image URL" hint="Optional. Large-format image shown in the expanded notification (https)." wide>
                <input className="input" value={form.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
              </Field>
              <TargetPicker target={form.target} targetParam={form.targetParam} onChange={(t, p) => setForm((f) => ({ ...f, target: t, targetParam: p }))} />
            </fieldset>
          </Panel>

          <Panel title="Audience" subtitle={estimateError ? `Estimate unavailable: ${estimateError}` : estimate ? `≈ ${fmtExact(estimate.users)} users · ${fmtExact(estimate.devices)} devices with notifications on` : undefined}>
            <fieldset className="form-grid" disabled={!editable}>
              <Field label="Send to">
                <select className="input" value={form.audienceType} onChange={(e) => {
                  const type = e.target.value as AudienceType;
                  setForm((f) => ({ ...f, audienceType: type, audienceValue: type === 'PLATFORM' ? 'ANDROID' : null }));
                }}>
                  {AUDIENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              {form.audienceType === 'PLATFORM' && (
                <Field label="Platform">
                  <select className="input" value={form.audienceValue ?? 'ANDROID'} onChange={(e) => set('audienceValue', e.target.value)}>
                    <option value="ANDROID">Android</option>
                    <option value="IOS">iOS</option>
                  </select>
                </Field>
              )}
              {form.audienceType === 'CITY' && (
                <Field label="City" hint="Matches the city on the user's profile (case-insensitive).">
                  <input className="input" value={form.audienceValue ?? ''} onChange={(e) => set('audienceValue', e.target.value)} placeholder="Kolkata" />
                </Field>
              )}
              {form.audienceType === 'USERS' && (
                <div className="field field-wide">
                  <span>Users</span>
                  <div className="chips">
                    {userIds.map((id) => {
                      const u = pickedUsers[id];
                      return (
                        <span key={id} className="chip">
                          {u ? u.name || u.phone : `${id.slice(0, 8)}…`}
                          {editable && (
                            <button type="button" aria-label="Remove" onClick={() => set('audienceValue', userIds.filter((x) => x !== id).join(',') || null)}>×</button>
                          )}
                        </span>
                      );
                    })}
                    {userIds.length === 0 && <span className="muted small">No users picked yet.</span>}
                  </div>
                  {editable && (
                    <UserPicker value={null} onChange={(u) => {
                      if (!u || userIds.includes(u.id)) return;
                      setPickedUsers((p) => ({ ...p, [u.id]: u }));
                      set('audienceValue', [...userIds, u.id].join(','));
                    }} />
                  )}
                </div>
              )}
            </fieldset>
          </Panel>
        </div>

        <div>
          <Panel title="Preview" subtitle={`Opens: ${TARGET_LABELS[form.target]}`}>
            <div className="segmented lang-preview" role="group" aria-label="Preview language">
              {LANGS.map((l) => (
                <button key={l} className={l === previewLang ? 'seg active' : 'seg'} onClick={() => setPreviewLang(l)} title={LANG_LABELS[l]}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="phone">
              <div className="phone-notif" dir={previewLang === 'ar' && form.title.ar ? 'rtl' : 'ltr'}>
                <div className="phone-notif-head"><span className="phone-app-icon">H</span> Habita AI · now</div>
                <div className="phone-notif-title">{previewTitle}</div>
                <div className="phone-notif-body">{previewBody}</div>
                {form.imageUrl?.trim() && <img className="phone-notif-img" src={form.imageUrl.trim()} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />}
              </div>
            </div>
            {previewLang !== 'en' && !form.title[previewLang]?.trim() && (
              <p className="muted small">No {LANG_LABELS[previewLang]} text — these users get the English version.</p>
            )}
          </Panel>

          {campaign && (
            <Panel title="Send a test" subtitle="Goes only to this user's devices; the campaign status doesn't change.">
              <UserPicker value={testUser} onChange={setTestUser} />
              <button className="btn btn-block mt" onClick={onTest} disabled={!!busy || !testUser}>
                {busy === 'test' ? 'Sending…' : editable && dirty ? 'Save & send test' : 'Send test'}
              </button>
            </Panel>
          )}

          {isNew && (
            <Panel title="Deliver">
              <p className="muted">Save the draft first — then you can send a test, schedule it, or send it now.</p>
            </Panel>
          )}

          {editable && campaign && (
            <Panel title="Deliver" subtitle={`Audience: ${audienceLabel(form)}`}>
              <Field label="Schedule for" hint={browserIsIst() ? 'Times are IST.' : `Your local time. ${scheduleAt ? `= ${fmtIst(fromLocalInput(scheduleAt))}` : 'Users are mostly on IST.'}`}>
                <input className="input" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
              </Field>
              <div className="btn-row mt">
                <button className="btn" onClick={onSchedule} disabled={!!busy || !scheduleAt}>
                  {busy === 'schedule' ? 'Scheduling…' : campaign?.status === 'SCHEDULED' ? 'Reschedule' : 'Schedule'}
                </button>
                <button className="btn btn-primary" onClick={onSendNow} disabled={!!busy}>
                  {busy === 'send' ? 'Sending…' : 'Send now'}
                </button>
              </div>
            </Panel>
          )}

          {campaign && (campaign.status === 'SCHEDULED' || campaign.status === 'DRAFT' || campaign.status === 'CANCELLED') && (
            <div className="btn-row">
              {campaign.status === 'SCHEDULED' && <button className="btn btn-danger" onClick={onCancel} disabled={!!busy}>Cancel schedule</button>}
              {(campaign.status === 'DRAFT' || campaign.status === 'CANCELLED') && (
                <button className="btn btn-danger" onClick={onDelete} disabled={!!busy}>Delete campaign</button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
