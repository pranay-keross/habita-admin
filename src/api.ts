// Typed client for the backend's /api/admin/** endpoints (admin/controller/* in Saheli-Backend).

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const TOKEN_KEY = 'habita.admin.token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — the session just won't survive a reload */
  }
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      // Bean-validation failures put the per-field reasons in `details`.
      if (Array.isArray(body?.details) && body.details.length > 0) message += ` — ${body.details.join('; ')}`;
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401 && !path.endsWith('/auth/login')) onUnauthorized();
    throw new ApiError(res.status, message);
  }
  // 204 No Content (deletes) and empty bodies resolve to undefined.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const qs = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();

// ---------------------------------------------------------------- types

export interface AdminProfile { id: string; email: string; name: string; lastLoginAt: string | null }
export interface AdminAuthResponse { accessToken: string; expiresIn: number; admin: AdminProfile }

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_DELETION' | 'UNVERIFIED';

export interface UserSummary {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  status: UserStatus;
  verified: boolean;
  profileCompleted: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  deletionRequestedAt: string | null;
  lastActiveDate: string | null;
  requests: number;
  aiCalls: number;
  aiTokens: number;
}

export interface Page<T> { content: T[]; totalElements: number; totalPages: number; page: number; size: number }

export interface Overview {
  totalUsers: number;
  verifiedUsers: number;
  suspendedUsers: number;
  pendingDeletionUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  aiCalls30d: number;
  aiTokens30d: number;
  aiFailedCalls30d: number;
  aiEstimatedCostUsd30d: number;
}

export interface DailyActivityPoint { date: string; activeUsers: number; newUsers: number; requests: number; aiCalls: number }
export interface CategoryUsage { category: string; users: number; requests: number; aiCalls: number; aiTokens: number }
export interface AiFeatureUsage {
  feature: string;
  label: string;
  category: string;
  calls: number;
  users: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  failedCalls: number;
  avgLatencyMs: number;
  estimatedCostUsd: number;
}
export interface AiDailyUsage { date: string; calls: number; totalTokens: number; estimatedCostUsd: number }
export interface AiUserUsage {
  userId: string;
  name: string | null;
  phone: string;
  calls: number;
  totalTokens: number;
  estimatedCostUsd: number;
  topFeature: string | null;
}
export interface AiUsageReport {
  days: number;
  totalCalls: number;
  failedCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  unpricedModels: string[];
  byFeature: AiFeatureUsage[];
  byDay: AiDailyUsage[];
  topUsers: AiUserUsage[];
}
export interface UserCategoryRow {
  userId: string;
  name: string | null;
  phone: string;
  totalRequests: number;
  requestsByCategory: Record<string, number>;
}
export interface FamilyMembership { familyId: string; familyName: string; role: string; memberCount: number }
export interface UserDetail {
  user: UserSummary;
  days: number;
  families: FamilyMembership[];
  devicePlatforms: string[];
  activity: DailyActivityPoint[];
  categories: CategoryUsage[];
  aiUsage: AiFeatureUsage[];
  aiEstimatedCostUsd: number;
}

export interface UserListQuery {
  q?: string;
  status?: string;
  sort?: string;
  days?: number;
  page?: number;
  size?: number;
}

// ---------------------------------------------------------------- endpoints

export const api = {
  login: (email: string, password: string) =>
    request<AdminAuthResponse>('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<AdminProfile>('/api/admin/auth/me'),

  users: (query: UserListQuery) => request<Page<UserSummary>>(`/api/admin/users?${qs({ ...query })}`),
  user: (id: string, days: number) => request<UserDetail>(`/api/admin/users/${id}?${qs({ days })}`),
  setUserActive: (id: string, active: boolean) =>
    request<UserSummary>(`/api/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ active }) }),

  overview: () => request<Overview>('/api/admin/analytics/overview'),
  activity: (days: number) => request<DailyActivityPoint[]>(`/api/admin/analytics/activity?${qs({ days })}`),
  categories: (days: number) => request<CategoryUsage[]>(`/api/admin/analytics/categories?${qs({ days })}`),
  userCategories: (days: number, limit = 25) =>
    request<UserCategoryRow[]>(`/api/admin/analytics/user-categories?${qs({ days, limit })}`),
  aiUsage: (days: number, topUsers = 10) =>
    request<AiUsageReport>(`/api/admin/analytics/ai-usage?${qs({ days, topUsers })}`),
};
