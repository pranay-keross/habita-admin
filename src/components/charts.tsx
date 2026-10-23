import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmtDay, fmtExact, fmtNumber } from '../format';

const axisProps = {
  tick: { fill: 'var(--text-muted)', fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: 'var(--border)' },
} as const;

const tooltipProps = {
  contentStyle: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
  },
  labelStyle: { color: 'var(--text-secondary)', marginBottom: 4 },
  cursor: { stroke: 'var(--border-strong)', strokeWidth: 1 },
} as const;

export interface LineSeries<T> {
  key: keyof T & string;
  label: string;
  color: string;
}

/** Daily time series sharing one y-axis (all series must be the same unit). */
export function DailyLineChart<T extends { date: string }>({ data, series, height = 280 }: {
  data: T[];
  series: LineSeries<T>[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtDay} minTickGap={24} {...axisProps} />
        <YAxis allowDecimals={false} tickFormatter={fmtNumber} width={48} {...axisProps} axisLine={false} />
        <Tooltip {...tooltipProps} labelFormatter={(d) => fmtDay(String(d))} formatter={(v) => fmtExact(Number(v))} />
        {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, color: 'var(--text-secondary)' }} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--surface-1)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Single-series daily bars. */
export function DailyBarChart<T extends { date: string }>({ data, dataKey, label, format = fmtExact, height = 240 }: {
  data: T[];
  dataKey: keyof T & string;
  label: string;
  format?: (n: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtDay} minTickGap={24} {...axisProps} />
        <YAxis tickFormatter={fmtNumber} width={48} {...axisProps} axisLine={false} />
        <Tooltip
          {...tooltipProps}
          cursor={{ fill: 'var(--hover)' }}
          labelFormatter={(d) => fmtDay(String(d))}
          formatter={(v) => [format(Number(v)), label]}
        />
        <Bar dataKey={dataKey as string} name={label} fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Secondary text shown after the value, e.g. "12 users". */
  detail?: string;
}

/** Ranked horizontal bars in plain HTML: labels never collide and every row is hoverable. */
export function HBarList({ rows, format = fmtNumber, emptyText = 'No data in this range.' }: {
  rows: BarRow[];
  format?: (n: number) => string;
  emptyText?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (rows.length === 0 || max === 0) return <div className="empty">{emptyText}</div>;
  return (
    <ul className="hbar-list">
      {rows.map((r) => (
        <li key={r.key} className="hbar-row" title={`${r.label}: ${fmtExact(r.value)}${r.detail ? ` · ${r.detail}` : ''}`}>
          <span className="hbar-label">{r.label}</span>
          <span className="hbar-track">
            <span className="hbar-fill" style={{ width: `${Math.max((r.value / max) * 100, r.value > 0 ? 1.5 : 0)}%` }} />
          </span>
          <span className="hbar-value">
            {format(r.value)}
            {r.detail && <span className="hbar-detail"> · {r.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Sequential blue ramp (light → dark), steps 100–650 of the reference palette.
const SEQ_LIGHT = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'];
const SEQ_DARK = ['#1c2a3d', '#184f95', '#1c5cab', '#2a78d6', '#5598e7', '#9ec5f4'];

/** Cell colour for a value in [0, max]; zero stays on the surface so "unused" reads as empty. */
export function heatColor(value: number, max: number, dark: boolean) {
  if (value <= 0 || max <= 0) return 'transparent';
  const ramp = dark ? SEQ_DARK : SEQ_LIGHT;
  const idx = Math.min(ramp.length - 1, Math.floor(Math.sqrt(value / max) * ramp.length));
  return ramp[idx];
}

/** Whether text on heatColor(value) needs light ink. */
export function heatInkIsLight(value: number, max: number, dark: boolean) {
  if (value <= 0 || max <= 0) return dark;
  const idx = Math.min(5, Math.floor(Math.sqrt(value / max) * 6));
  return dark ? idx < 4 : idx >= 3;
}
