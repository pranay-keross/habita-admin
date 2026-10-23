import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, PageHeader, Panel, StatusBadge } from '../components/ui';
import { engagementApi } from '../engagement/api';
import {
  BannerPreview,
  browserIsIst,
  cleanText,
  Field,
  fmtIst,
  fromLocalInput,
  isHexColor,
  LocalizedTextInput,
  SuccessBox,
  TargetPicker,
  targetError,
  toLocalInput,
} from '../engagement/components';
import { LANG_LABELS, LANGS, PLACEMENT_LABELS, PLACEMENTS, type Banner, type BannerRequest, type Lang } from '../engagement/types';

function defaults(): BannerRequest {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return {
    name: '',
    placement: 'HOME_TOP',
    title: { en: '' },
    body: null,
    ctaLabel: null,
    imageUrl: null,
    emoji: null,
    accentColor: '#e8590c',
    target: 'DASHBOARD',
    targetParam: null,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    priority: 0,
    active: true,
  };
}

function toRequest(b: Banner): BannerRequest {
  const { id: _id, status: _s, createdAt: _c, updatedAt: _u, ...rest } = b;
  return rest;
}

function validate(f: BannerRequest): string | null {
  if (!f.name.trim()) return 'Give the banner an internal name.';
  if (!f.title.en?.trim()) return 'English title is required.';
  if (!f.startsAt || !f.endsAt) return 'Set both start and end.';
  if (new Date(f.endsAt) <= new Date(f.startsAt)) return 'End must be after start.';
  if (!isHexColor(f.accentColor)) return 'Accent colour must look like #RRGGBB.';
  return targetError(f.target, f.targetParam);
}

export default function BannerEditPage() {
  const { bannerId } = useParams();
  const isNew = !bannerId;
  const navigate = useNavigate();
  const location = useLocation();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerRequest>(defaults);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>((location.state as { notice?: string } | null)?.notice ?? null);
  const [busy, setBusy] = useState(false);
  const [previewLang, setPreviewLang] = useState<Lang>('en');

  useEffect(() => {
    if (isNew) return;
    let current = true;
    engagementApi.banner(bannerId).then((b) => {
      if (!current) return;
      setBanner(b);
      setForm(toRequest(b));
    }).catch((e: Error) => current && setLoadError(e.message));
    return () => {
      current = false;
    };
  }, [bannerId, isNew]);

  const set = <K extends keyof BannerRequest>(key: K, value: BannerRequest[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    const problem = validate(form);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body: BannerRequest = {
        ...form,
        name: form.name.trim(),
        title: cleanText(form.title) ?? { en: '' },
        body: cleanText(form.body),
        ctaLabel: cleanText(form.ctaLabel),
        imageUrl: form.imageUrl?.trim() || null,
        emoji: form.emoji?.trim() || null,
        accentColor: form.accentColor?.trim() || null,
      };
      if (isNew) {
        const created = await engagementApi.createBanner(body);
        navigate(`/banners/${created.id}`, { replace: true, state: { notice: 'Banner created.' } });
      } else {
        const updated = await engagementApi.updateBanner(bannerId, body);
        setBanner(updated);
        setForm(toRequest(updated));
        setNotice('Banner saved.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!banner || !window.confirm(`Delete "${banner.name}"?`)) return;
    setBusy(true);
    try {
      await engagementApi.deleteBanner(banner.id);
      navigate('/banners', { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (loadError) return <ErrorBox message={loadError} />;
  if (!isNew && !banner) return <div className="boot">Loading…</div>;

  const pick = (t: Partial<Record<Lang, string>> | null) => t?.[previewLang]?.trim() || t?.en?.trim() || '';
  const tzHint = browserIsIst() ? 'IST' : 'Your local time';

  return (
    <>
      <Link to="/banners" className="back-link">← All banners</Link>
      <PageHeader title={isNew ? 'New banner' : banner!.name} subtitle="Shown in the app while active and within its time window.">
        {banner && <StatusBadge status={banner.status} />}
        {banner && <button className="btn btn-danger" onClick={remove} disabled={busy}>Delete</button>}
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create banner' : 'Save changes'}</button>
      </PageHeader>

      {error && <ErrorBox message={error} />}
      {notice && <SuccessBox message={notice} onDismiss={() => setNotice(null)} />}

      <div className="editor-grid">
        <div>
          <Panel title="Content">
            <div className="form-grid">
              <Field label="Internal name" wide>
                <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Diwali countdown banner" />
              </Field>
              <LocalizedTextInput label="Title" required value={form.title} onChange={(v) => set('title', v)} placeholder="Diwali is 5 days away" />
              <LocalizedTextInput label="Body" multiline value={form.body} onChange={(v) => set('body', v)} placeholder="Plan your puja budget and guest list." />
              <LocalizedTextInput label="Button label" value={form.ctaLabel} onChange={(v) => set('ctaLabel', v)} placeholder="Start planning" />
              <Field label="Emoji">
                <input className="input" value={form.emoji ?? ''} maxLength={8} onChange={(e) => set('emoji', e.target.value)} placeholder="🪔" />
              </Field>
              <Field label="Accent colour">
                <div className="color-row">
                  <input type="color" value={isHexColor(form.accentColor) && form.accentColor ? form.accentColor : '#e8590c'} onChange={(e) => set('accentColor', e.target.value)} aria-label="Pick accent colour" />
                  <input className="input" value={form.accentColor ?? ''} onChange={(e) => set('accentColor', e.target.value)} placeholder="#E8590C" />
                </div>
              </Field>
              <Field label="Image URL" hint="Optional (https)." wide>
                <input className="input" value={form.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
              </Field>
              <TargetPicker target={form.target} targetParam={form.targetParam} onChange={(t, p) => setForm((f) => ({ ...f, target: t, targetParam: p }))} />
            </div>
          </Panel>

          <Panel title="Placement & schedule">
            <div className="form-grid">
              <Field label="Placement">
                <select className="input" value={form.placement} onChange={(e) => set('placement', e.target.value as BannerRequest['placement'])}>
                  {PLACEMENTS.map((p) => <option key={p} value={p}>{PLACEMENT_LABELS[p]}</option>)}
                </select>
              </Field>
              <Field label="Priority" hint="Higher shows first when several are live.">
                <input className="input" type="number" value={form.priority} onChange={(e) => set('priority', Number(e.target.value) || 0)} />
              </Field>
              <Field label={`Starts (${tzHint})`} hint={browserIsIst() ? undefined : fmtIst(form.startsAt)}>
                <input className="input" type="datetime-local" value={toLocalInput(form.startsAt)} onChange={(e) => set('startsAt', fromLocalInput(e.target.value))} />
              </Field>
              <Field label={`Ends (${tzHint})`} hint={browserIsIst() ? undefined : fmtIst(form.endsAt)}>
                <input className="input" type="datetime-local" value={toLocalInput(form.endsAt)} onChange={(e) => set('endsAt', fromLocalInput(e.target.value))} />
              </Field>
              <label className="check field-wide">
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                Active (uncheck to hide without deleting)
              </label>
            </div>
          </Panel>
        </div>

        <div>
          <Panel title="Preview">
            <div className="segmented lang-preview" role="group" aria-label="Preview language">
              {LANGS.map((l) => (
                <button key={l} className={l === previewLang ? 'seg active' : 'seg'} onClick={() => setPreviewLang(l)} title={LANG_LABELS[l]}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <BannerPreview
              title={pick(form.title)}
              body={pick(form.body)}
              ctaLabel={pick(form.ctaLabel)}
              emoji={form.emoji}
              accentColor={form.accentColor}
              imageUrl={form.imageUrl}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
