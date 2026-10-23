import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { STATUS_LABELS } from '../format';

/** Runs an async loader whenever deps change; ignores stale responses. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    load()
      .then((d) => current && setData(d))
      .catch((e: Error) => current && setError(e.message))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}

export const RANGES = [7, 30, 90] as const;

export function RangePicker({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Date range">
      {RANGES.map((d) => (
        <button key={d} className={d === value ? 'seg active' : 'seg'} aria-pressed={d === value} onClick={() => onChange(d)}>
          {d}d
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

/** A titled card. When `table` is given, a toggle swaps the chart for an accessible table view. */
export function Panel({ title, subtitle, table, children, className }: {
  title: string;
  subtitle?: ReactNode;
  table?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`panel ${className ?? ''}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <div className="panel-sub">{subtitle}</div>}
        </div>
        {table && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowTable((s) => !s)}>
            {showTable ? 'Show chart' : 'Show table'}
          </button>
        )}
      </div>
      {showTable && table ? <div className="table-wrap">{table}</div> : children}
    </section>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABELS[status] ?? status}</span>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <span>{message}</span>
      {onRetry && <button className="btn btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
