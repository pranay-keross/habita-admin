import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBox, PageHeader, Panel } from '../components/ui';
import { engagementApi } from '../engagement/api';
import {
  addDays,
  BannerPreview,
  cleanText,
  Field,
  isHexColor,
  LocalizedTextInput,
  TargetPicker,
  targetError,
} from '../engagement/components';
import { PLACEMENT_LABELS, PLACEMENTS, type BannerSeriesDay, type BannerSeriesRequest } from '../engagement/types';
import { fmtDay } from '../format';

const MAX_DAYS = 31;

const blankDay = (): BannerSeriesDay => ({ title: { en: '' }, body: null, ctaLabel: null, emoji: null, accentColor: null, imageUrl: null });

// The nine forms of Durga, one per night — titles only; colours are left for the admin to set.
const NAVRATRI_FORMS = [
  'Shailaputri', 'Brahmacharini', 'Chandraghanta', 'Kushmanda', 'Skandamata',
  'Katyayani', 'Kalaratri', 'Mahagauri', 'Siddhidatri',
];

export default function BannerSeriesPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Omit<BannerSeriesRequest, 'days'>>({
    name: '',
    placement: 'HOME_TOP',
    startDate: new Date().toISOString().slice(0, 10),
    timezone: 'Asia/Kolkata',
    target: 'DASHBOARD',
    targetParam: null,
    priority: 10,
  });
  const [days, setDays] = useState<BannerSeriesDay[]>(() => Array.from({ length: 9 }, blankDay));
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setDay = (i: number, patch: Partial<BannerSeriesDay>) => setDays((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  function resize(n: number) {
    const count = Math.max(1, Math.min(MAX_DAYS, n || 1));
    setDays((ds) => (count <= ds.length ? ds.slice(0, count) : [...ds, ...Array.from({ length: count - ds.length }, blankDay)]));
  }

  function applyNavratri() {
    if (days.some((d) => d.title.en?.trim()) && !window.confirm('Replace the current day titles with the Navratri template?')) return;
    setForm((f) => ({ ...f, name: f.name || 'Navratri colour of the day', startDate: '2026-10-11' }));
    setDays(NAVRATRI_FORMS.map((form, i) => ({
      ...blankDay(),
      title: { en: `Navratri Day ${i + 1} · Maa ${form}` },
      body: { en: "Today's colour is ready in Style Mirror — see your outfit for the day." },
      ctaLabel: { en: 'See my outfit' },
      emoji: '🪔',
    })));
    setForm((f) => ({ ...f, target: 'STYLE_MIRROR', targetParam: null }));
  }

  function copyStyleDown(i: number) {
    const src = days[i];
    setDays((ds) => ds.map((d, j) => (j > i ? { ...d, emoji: src.emoji, body: src.body, ctaLabel: src.ctaLabel, imageUrl: src.imageUrl } : d)));
  }

  async function submit() {
    if (!form.name.trim()) return setError('Give the series a name.');
    const missing = days.findIndex((d) => !d.title.en?.trim());
    if (missing >= 0) return setError(`Day ${missing + 1} needs an English title.`);
    const badColour = days.findIndex((d) => !isHexColor(d.accentColor));
    if (badColour >= 0) return setError(`Day ${badColour + 1}: colour must look like #RRGGBB.`);
    const t = targetError(form.target, form.targetParam);
    if (t) return setError(t);
    setBusy(true);
    setError(null);
    try {
      await engagementApi.createBannerSeries({
        ...form,
        name: form.name.trim(),
        days: days.map((d) => ({
          title: cleanText(d.title) ?? { en: '' },
          body: cleanText(d.body),
          ctaLabel: cleanText(d.ctaLabel),
          emoji: d.emoji?.trim() || null,
          accentColor: d.accentColor?.trim() || null,
          imageUrl: d.imageUrl?.trim() || null,
        })),
      });
      navigate('/banners?status=ALL', { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <Link to="/banners" className="back-link">← All banners</Link>
      <PageHeader title="Daily series" subtitle="One banner per day — e.g. a Navratri colour of the day. Each runs midnight to midnight.">
        <button className="btn" onClick={applyNavratri}>Use Navratri template</button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? 'Creating…' : `Create ${days.length} banners`}</button>
      </PageHeader>

      {error && <ErrorBox message={error} />}

      <Panel title="Series settings">
        <div className="form-grid">
          <Field label="Series name" hint="Each banner is named “<series> — Day N”." wide>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Navratri colour of the day" />
          </Field>
          <Field label="First day">
            <input className="input" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
          </Field>
          <Field label="Number of days">
            <input className="input" type="number" min={1} max={MAX_DAYS} value={days.length} onChange={(e) => resize(Number(e.target.value))} />
          </Field>
          <Field label="Day boundaries in">
            <select className="input" value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
              <option value="Asia/Kolkata">India (IST)</option>
              <option value="Asia/Dubai">Gulf (GST)</option>
              <option value="UTC">UTC</option>
            </select>
          </Field>
          <Field label="Placement">
            <select className="input" value={form.placement} onChange={(e) => set('placement', e.target.value as BannerSeriesRequest['placement'])}>
              {PLACEMENTS.map((p) => <option key={p} value={p}>{PLACEMENT_LABELS[p]}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <input className="input" type="number" value={form.priority} onChange={(e) => set('priority', Number(e.target.value) || 0)} />
          </Field>
          <TargetPicker target={form.target} targetParam={form.targetParam} onChange={(t, p) => setForm((f) => ({ ...f, target: t, targetParam: p }))} />
        </div>
      </Panel>

      <Panel title="Days" subtitle="Set a title, emoji and colour per day. “More” adds translations, body, button and image.">
        <div className="series-list">
          {days.map((d, i) => {
            const date = form.startDate ? addDays(form.startDate, i) : '';
            return (
              <div key={i} className="series-row">
                <div className="series-main">
                  <div className="series-day">
                    <span className="strong">Day {i + 1}</span>
                    {date && <span className="muted small">{fmtDay(date)}</span>}
                  </div>
                  <input className="input series-emoji" aria-label={`Day ${i + 1} emoji`} value={d.emoji ?? ''} maxLength={8} placeholder="🪔" onChange={(e) => setDay(i, { emoji: e.target.value })} />
                  <div className="color-row">
                    <input type="color" aria-label={`Day ${i + 1} colour`} value={isHexColor(d.accentColor) && d.accentColor ? d.accentColor : '#cccccc'} onChange={(e) => setDay(i, { accentColor: e.target.value })} />
                    <input className="input series-hex" aria-label={`Day ${i + 1} colour hex`} value={d.accentColor ?? ''} placeholder="#RRGGBB" onChange={(e) => setDay(i, { accentColor: e.target.value })} />
                  </div>
                  <input className="input series-title" aria-label={`Day ${i + 1} title (English)`} value={d.title.en ?? ''} placeholder="Title (English)" onChange={(e) => setDay(i, { title: { ...d.title, en: e.target.value } })} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(expanded === i ? null : i)}>{expanded === i ? 'Less' : 'More'}</button>
                  {i < days.length - 1 && <button type="button" className="btn btn-ghost btn-sm" title="Copy this day's emoji, body, button and image to every later day" onClick={() => copyStyleDown(i)}>Copy down</button>}
                </div>
                {expanded === i && (
                  <div className="series-more">
                    <div className="form-grid">
                      <LocalizedTextInput label="Title" required value={d.title} onChange={(v) => setDay(i, { title: v })} />
                      <LocalizedTextInput label="Body" multiline value={d.body} onChange={(v) => setDay(i, { body: v })} />
                      <LocalizedTextInput label="Button label" value={d.ctaLabel} onChange={(v) => setDay(i, { ctaLabel: v })} />
                      <Field label="Image URL" wide>
                        <input className="input" value={d.imageUrl ?? ''} onChange={(e) => setDay(i, { imageUrl: e.target.value })} placeholder="https://…" />
                      </Field>
                    </div>
                    <BannerPreview title={d.title.en ?? ''} body={d.body?.en} ctaLabel={d.ctaLabel?.en} emoji={d.emoji} accentColor={d.accentColor} imageUrl={d.imageUrl} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
