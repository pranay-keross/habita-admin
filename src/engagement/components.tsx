import { useEffect, useState, type ReactNode } from 'react';
import { api, type UserSummary } from '../api';
import { engagementApi } from './api';
import {
  LANG_LABELS,
  LANGS,
  TARGET_LABELS,
  TARGETS,
  TARGETS_WITH_PARAM,
  type Lang,
  type LocalizedText,
  type Target,
} from './types';

// ---------------------------------------------------------------- helpers

/** The English text (always present on required fields), for lists and previews. */
export const enText = (t: LocalizedText | null | undefined) => t?.en?.trim() ?? '';

/** Drops blank languages. Returns null when nothing is left (for optional fields). */
export function cleanText(t: LocalizedText | null | undefined): LocalizedText | null {
  if (!t) return null;
  const out: LocalizedText = {};
  for (const lang of LANGS) {
    const v = t[lang]?.trim();
    if (v) out[lang] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export const filledLangs = (t: LocalizedText | null | undefined) => LANGS.filter((l) => t?.[l]?.trim());

/** ISO instant → value for <input type="datetime-local"> in the browser's own timezone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (browser-local) → ISO instant. */
export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : '';
}

/** Same instant rendered in IST, so an admin outside India can see what users will see. */
export function fmtIst(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }) + ' IST';
}

export const browserIsIst = () => Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Kolkata';

/** yyyy-mm-dd shifted by `days`, computed on the calendar (no timezone drift). */
export function addDays(day: string, days: number) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export const isHexColor = (v: string | null | undefined) => !v || /^#[0-9a-fA-F]{6}$/.test(v);

// ---------------------------------------------------------------- layout bits

export function Field({ label, hint, children, wide }: { label: ReactNode; hint?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? 'field field-wide' : 'field'}>
      <span>{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function SuccessBox({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="success-box" role="status">
      <span>{message}</span>
      {onDismiss && <button className="btn btn-ghost btn-sm" onClick={onDismiss}>Dismiss</button>}
    </div>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pager">
      <button className="btn btn-sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="muted small">Page {page + 1} of {totalPages}</span>
      <button className="btn btn-sm" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

/** Coverage chips: which of the six languages a text has. */
export function LangCoverage({ text }: { text: LocalizedText | null | undefined }) {
  const filled = filledLangs(text);
  return (
    <span className="lang-coverage" title={filled.map((l) => LANG_LABELS[l]).join(', ')}>
      {LANGS.map((l) => (
        <span key={l} className={filled.includes(l) ? 'lang-chip on' : 'lang-chip'}>{l}</span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- LocalizedTextInput

export function LocalizedTextInput({
  label,
  value,
  onChange,
  required,
  multiline,
  maxLength,
  placeholder,
}: {
  label: string;
  value: LocalizedText | null;
  onChange: (v: LocalizedText) => void;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  const [lang, setLang] = useState<Lang>('en');
  const current = value?.[lang] ?? '';
  const set = (text: string) => onChange({ ...(value ?? {}), [lang]: text });
  const missingEn = required && !value?.en?.trim();

  const common = {
    className: 'input',
    value: current,
    maxLength,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    lang,
    placeholder: lang === 'en' ? placeholder : value?.en ? `Falls back to English: ${value.en}` : placeholder,
    'aria-label': `${label} (${LANG_LABELS[lang]})`,
    onChange: (e: { target: { value: string } }) => set(e.target.value),
  } as const;

  return (
    <div className="field field-wide">
      <span>
        {label}
        {required && <span className="req" aria-hidden> *</span>}
      </span>
      <div className="lang-tabs" role="tablist" aria-label={`${label} language`}>
        {LANGS.map((l) => {
          const filled = !!value?.[l]?.trim();
          return (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={l === lang}
              className={`lang-tab${l === lang ? ' active' : ''}${filled ? ' filled' : ''}${l === 'en' && missingEn ? ' missing' : ''}`}
              onClick={() => setLang(l)}
              title={`${LANG_LABELS[l]}${filled ? ' — filled' : l === 'en' && required ? ' — required' : ' — optional'}`}
            >
              {l.toUpperCase()}
              <span className="lang-dot" aria-hidden />
            </button>
          );
        })}
      </div>
      {multiline ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
      <span className="field-hint">
        {lang === 'en'
          ? required ? 'English is required — other languages fall back to it.' : 'Optional.'
          : `${LANG_LABELS[lang]} — optional; users on this language see English if left blank.`}
        {maxLength && ` ${current.length}/${maxLength}`}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- TargetPicker

interface ParamOption { id: string; label: string }

/** Loads the selectable challenges / templates once per target type. */
function useParamOptions(target: Target) {
  const [options, setOptions] = useState<ParamOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setOptions(null);
    setError(null);
    const load: Promise<ParamOption[]> | null =
      target === 'CHALLENGE'
        ? engagementApi.challenges({ status: 'ALL', size: 100 }).then((p) =>
            p.content.map((c) => ({ id: c.id, label: `${enText(c.title)} (${c.status.toLowerCase()}, ${c.startsOn})` })))
        : target === 'EVENT_TEMPLATE'
          ? engagementApi.eventTemplates({ size: 100 }).then((p) =>
              p.content.map((t) => ({ id: t.id, label: `${t.emoji ?? ''} ${enText(t.name)}${t.active ? '' : ' (inactive)'}`.trim() })))
          : null;
    if (!load) return;
    load.then((o) => current && setOptions(o)).catch((e: Error) => current && setError(e.message));
    return () => {
      current = false;
    };
  }, [target]);
  return { options, error };
}

export function TargetPicker({
  target,
  targetParam,
  onChange,
  label = 'When tapped, open',
}: {
  target: Target;
  targetParam: string | null;
  onChange: (target: Target, targetParam: string | null) => void;
  label?: string;
}) {
  const needsParam = TARGETS_WITH_PARAM.includes(target);
  const { options, error } = useParamOptions(target);

  return (
    <>
      <Field label={label}>
        <select className="input" value={target} onChange={(e) => onChange(e.target.value as Target, null)}>
          {TARGETS.map((t) => <option key={t} value={t}>{TARGET_LABELS[t]}</option>)}
        </select>
      </Field>
      {needsParam && (
        <Field label={target === 'CHALLENGE' ? 'Challenge' : 'Event template'} hint={error ?? undefined}>
          <select className="input" value={targetParam ?? ''} onChange={(e) => onChange(target, e.target.value || null)}>
            <option value="">{options ? 'Select…' : 'Loading…'}</option>
            {options?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            {targetParam && options && !options.some((o) => o.id === targetParam) && (
              <option value={targetParam}>Unknown ({targetParam.slice(0, 8)}…)</option>
            )}
          </select>
        </Field>
      )}
    </>
  );
}

/** Validation shared by every form that embeds a TargetPicker. */
export function targetError(target: Target, targetParam: string | null) {
  return TARGETS_WITH_PARAM.includes(target) && !targetParam
    ? `Choose which ${target === 'CHALLENGE' ? 'challenge' : 'event template'} to open.`
    : null;
}

// ---------------------------------------------------------------- UserPicker

/** Search app users by name / phone / email (reuses /api/admin/users). */
export function UserPicker({ value, onChange }: { value: UserSummary | null; onChange: (u: UserSummary | null) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value || q.trim().length < 2) {
      setResults([]);
      return;
    }
    let current = true;
    setLoading(true);
    const t = setTimeout(() => {
      api.users({ q: q.trim(), size: 8 })
        .then((p) => current && setResults(p.content))
        .catch(() => current && setResults([]))
        .finally(() => current && setLoading(false));
    }, 250);
    return () => {
      current = false;
      clearTimeout(t);
    };
  }, [q, value]);

  if (value) {
    return (
      <div className="picked-user">
        <span><span className="strong">{value.name || 'Unnamed user'}</span> <span className="muted small">{value.phone}</span></span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>Change</button>
      </div>
    );
  }
  return (
    <div className="user-search">
      <input
        className="input"
        type="search"
        placeholder="Search name, phone or email"
        aria-label="Search users"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {(results.length > 0 || loading) && (
        <ul className="user-results">
          {loading && results.length === 0 && <li className="muted small">Searching…</li>}
          {results.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => onChange(u)}>
                <span className="strong">{u.name || 'Unnamed user'}</span>
                <span className="muted small">{u.phone}{u.city ? ` · ${u.city}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- previews

/** The in-app banner card as the app roughly renders it. */
export function BannerPreview({
  title,
  body,
  ctaLabel,
  emoji,
  accentColor,
  imageUrl,
}: {
  title: string;
  body?: string | null;
  ctaLabel?: string | null;
  emoji?: string | null;
  accentColor?: string | null;
  imageUrl?: string | null;
}) {
  const accent = accentColor && isHexColor(accentColor) ? accentColor : '#7a4dd8';
  return (
    <div className="banner-preview" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
      <div className="banner-text">
        <div className="banner-title">{emoji && <span className="banner-emoji">{emoji}</span>}{title || 'Banner title'}</div>
        {body && <div className="banner-body">{body}</div>}
        {ctaLabel && <span className="banner-cta">{ctaLabel} →</span>}
      </div>
      {imageUrl && <img src={imageUrl} alt="" className="banner-img" onError={(e) => (e.currentTarget.style.display = 'none')} />}
    </div>
  );
}
