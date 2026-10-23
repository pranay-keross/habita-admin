// DTOs for the festive-engagement admin endpoints (campaigns, banners, challenges, event templates).
// Shapes follow the shared backend ⇄ admin ⇄ app contract; JSON is camelCase, instants are ISO strings.

export const LANGS = ['en', 'hi', 'bn', 'ta', 'es', 'ar'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  es: 'Spanish',
  ar: 'Arabic',
};

/** `en` required on required fields; the other languages are optional. */
export type LocalizedText = Partial<Record<Lang, string>>;

export const TARGETS = [
  'NONE',
  'DASHBOARD',
  'NOTIFICATIONS',
  'FAMILY',
  'MEDICINE',
  'WELLNESS',
  'STAFF',
  'RESOURCES',
  'EVENTS',
  'EVENT_TEMPLATE',
  'CHALLENGES',
  'CHALLENGE',
  'EXPENSES',
  'DOCUMENTS',
  'PANTRY',
  'STYLE_MIRROR',
] as const;
export type Target = (typeof TARGETS)[number];

export const TARGET_LABELS: Record<Target, string> = {
  NONE: 'Just open the app',
  DASHBOARD: 'Home dashboard',
  NOTIFICATIONS: 'Notifications inbox',
  FAMILY: 'Family circle',
  MEDICINE: 'Medicine chest',
  WELLNESS: 'Mind & mood',
  STAFF: 'Staff & payroll',
  RESOURCES: 'Bills & utilities',
  EVENTS: 'Events & budgets',
  EVENT_TEMPLATE: 'Create event from template…',
  CHALLENGES: 'Challenges list',
  CHALLENGE: 'A specific challenge…',
  EXPENSES: 'Expense groups',
  DOCUMENTS: 'Document vault',
  PANTRY: 'Smart pantry',
  STYLE_MIRROR: 'Style mirror',
};

/** Targets whose `targetParam` must be a UUID of another entity. */
export const TARGETS_WITH_PARAM: Target[] = ['EVENT_TEMPLATE', 'CHALLENGE'];

// ---------------------------------------------------------------- campaigns

export type AudienceType = 'ALL' | 'PLATFORM' | 'CITY' | 'USERS';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface Campaign {
  id: string;
  name: string;
  title: LocalizedText;
  body: LocalizedText;
  imageUrl: string | null;
  target: Target;
  targetParam: string | null;
  audienceType: AudienceType;
  audienceValue: string | null;
  status: CampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  targetDevices: number | null;
  successCount: number | null;
  failureCount: number | null;
  lastError: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRequest {
  name: string;
  title: LocalizedText;
  body: LocalizedText;
  imageUrl: string | null;
  target: Target;
  targetParam: string | null;
  audienceType: AudienceType;
  audienceValue: string | null;
}

export interface SendResult { targetDevices: number; successCount: number; failureCount: number }
export interface AudienceEstimate { users: number; devices: number }

// ---------------------------------------------------------------- banners

export const PLACEMENTS = ['HOME_TOP', 'EVENTS', 'WELLNESS'] as const;
export type Placement = (typeof PLACEMENTS)[number];
export const PLACEMENT_LABELS: Record<Placement, string> = {
  HOME_TOP: 'Home — top',
  EVENTS: 'Events screen',
  WELLNESS: 'Wellness screen',
};

export type BannerStatus = 'LIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';

export interface Banner {
  id: string;
  name: string;
  placement: Placement;
  title: LocalizedText;
  body: LocalizedText | null;
  ctaLabel: LocalizedText | null;
  imageUrl: string | null;
  emoji: string | null;
  accentColor: string | null;
  target: Target;
  targetParam: string | null;
  startsAt: string;
  endsAt: string;
  priority: number;
  active: boolean;
  status: BannerStatus;
  createdAt: string;
  updatedAt: string;
}

export type BannerRequest = Omit<Banner, 'id' | 'status' | 'createdAt' | 'updatedAt'>;

export interface BannerSeriesDay {
  title: LocalizedText;
  body: LocalizedText | null;
  ctaLabel: LocalizedText | null;
  emoji: string | null;
  accentColor: string | null;
  imageUrl: string | null;
}

export interface BannerSeriesRequest {
  name: string;
  placement: Placement;
  startDate: string;
  timezone: string;
  target: Target;
  targetParam: string | null;
  priority: number;
  days: BannerSeriesDay[];
}

// ---------------------------------------------------------------- challenges

export type ChallengeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ChallengeTask {
  id?: string;
  dayNumber: number;
  title: LocalizedText;
  description: LocalizedText | null;
  target: Target;
  targetParam: string | null;
  sortOrder: number;
}

export interface Challenge {
  id: string;
  title: LocalizedText;
  description: LocalizedText | null;
  badgeTitle: LocalizedText;
  badgeEmoji: string | null;
  accentColor: string | null;
  imageUrl: string | null;
  startsOn: string;
  endsOn: string;
  status: ChallengeStatus;
  tasks: ChallengeTask[];
  participants: number;
  completers: number;
  createdAt: string;
  updatedAt: string;
}

export type ChallengeRequest = Omit<Challenge, 'id' | 'status' | 'participants' | 'completers' | 'createdAt' | 'updatedAt'>;

export interface ChallengeStats {
  participants: number;
  completers: number;
  tasks: { taskId: string; dayNumber: number; title: LocalizedText; completions: number }[];
}

// ---------------------------------------------------------------- event templates

export const EVENT_TYPES = ['BIRTHDAY', 'ANNIVERSARY', 'WEDDING', 'FESTIVAL', 'PUJA', 'PARTY', 'GATHERING', 'TRIP', 'OTHER'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EXPENSE_CATEGORIES = ['VENUE', 'FOOD', 'DECOR', 'GIFTS', 'ATTIRE', 'TRAVEL', 'ENTERTAINMENT', 'SERVICES', 'OTHER'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface BudgetLine { title: LocalizedText; category: ExpenseCategory; amount: number }
export interface TemplateTask { title: LocalizedText; daysBefore: number }

export interface EventTemplate {
  id: string;
  eventType: EventType;
  name: LocalizedText;
  description: LocalizedText | null;
  emoji: string | null;
  defaultTitle: LocalizedText;
  suggestedDate: string | null;
  defaultBudget: number | null;
  budgetLines: BudgetLine[];
  tasks: TemplateTask[];
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type EventTemplateRequest = Omit<EventTemplate, 'id' | 'createdAt' | 'updatedAt'>;
