const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('en');

export const fmtNumber = (n: number) => (Math.abs(n) >= 10_000 ? compact.format(n) : whole.format(n));
export const fmtExact = (n: number) => whole.format(n);

export function fmtUsd(n: number) {
  if (n === 0) return '$0';
  if (n < 0.01) return '<$0.01';
  return new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Axis label for a yyyy-mm-dd day. Parsed as local date so it never shifts by a day. */
export function fmtDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function fmtRelativeDay(day: string | null) {
  if (!day) return 'Never';
  const [y, m, d] = day.split('-').map(Number);
  const then = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - then.getTime()) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 30) return `${diff} days ago`;
  return fmtDate(then.toISOString());
}

const CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT: 'Account & profile',
  FAMILY: 'Family',
  MEDICINE: 'Medicine chest',
  STAFF: 'Staff & payroll',
  HOME_RESOURCES: 'Bills & utilities',
  EXPENSES: 'Expenses',
  WELLNESS: 'Wellness',
  VAULT: 'Document vault',
  WARDROBE: 'Wardrobe',
  PANTRY: 'Smart pantry',
  EVENTS: 'Events',
  VOICE_ASSISTANT: 'Voice assistant',
  OTHER: 'Other',
};

export const categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c;

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  PENDING_DELETION: 'Deletion pending',
  UNVERIFIED: 'Unverified',
};
