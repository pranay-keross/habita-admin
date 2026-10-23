// Endpoints for /api/admin/{campaigns,banners,challenges,event-templates}.
import { qs, request, type Page } from '../api';
import type {
  AudienceEstimate,
  AudienceType,
  Banner,
  BannerRequest,
  BannerSeriesRequest,
  Campaign,
  CampaignRequest,
  Challenge,
  ChallengeRequest,
  ChallengeStats,
  EventTemplate,
  EventTemplateRequest,
  SendResult,
} from './types';

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export interface ListQuery { status?: string; page?: number; size?: number }

export const engagementApi = {
  // ---- campaigns
  campaigns: (q: ListQuery) => request<Page<Campaign>>(`/api/admin/campaigns?${qs({ ...q })}`),
  campaign: (id: string) => request<Campaign>(`/api/admin/campaigns/${id}`),
  createCampaign: (body: CampaignRequest) => request<Campaign>('/api/admin/campaigns', json('POST', body)),
  updateCampaign: (id: string, body: CampaignRequest) => request<Campaign>(`/api/admin/campaigns/${id}`, json('PUT', body)),
  scheduleCampaign: (id: string, scheduledAt: string) =>
    request<Campaign>(`/api/admin/campaigns/${id}/schedule`, json('POST', { scheduledAt })),
  sendCampaign: (id: string) => request<Campaign>(`/api/admin/campaigns/${id}/send`, json('POST')),
  cancelCampaign: (id: string) => request<Campaign>(`/api/admin/campaigns/${id}/cancel`, json('POST')),
  deleteCampaign: (id: string) => request<void>(`/api/admin/campaigns/${id}`, json('DELETE')),
  testCampaign: (id: string, userId: string) =>
    request<SendResult>(`/api/admin/campaigns/${id}/test`, json('POST', { userId })),
  estimateAudience: (audienceType: AudienceType, audienceValue: string | null) =>
    request<AudienceEstimate>('/api/admin/campaigns/estimate', json('POST', { audienceType, audienceValue })),

  // ---- banners
  banners: (q: ListQuery & { placement?: string }) => request<Page<Banner>>(`/api/admin/banners?${qs({ ...q })}`),
  banner: (id: string) => request<Banner>(`/api/admin/banners/${id}`),
  createBanner: (body: BannerRequest) => request<Banner>('/api/admin/banners', json('POST', body)),
  updateBanner: (id: string, body: BannerRequest) => request<Banner>(`/api/admin/banners/${id}`, json('PUT', body)),
  setBannerActive: (id: string, active: boolean) =>
    request<Banner>(`/api/admin/banners/${id}/active`, json('PATCH', { active })),
  deleteBanner: (id: string) => request<void>(`/api/admin/banners/${id}`, json('DELETE')),
  createBannerSeries: (body: BannerSeriesRequest) => request<Banner[]>('/api/admin/banners/series', json('POST', body)),

  // ---- challenges
  challenges: (q: ListQuery) => request<Page<Challenge>>(`/api/admin/challenges?${qs({ ...q })}`),
  challenge: (id: string) => request<Challenge>(`/api/admin/challenges/${id}`),
  createChallenge: (body: ChallengeRequest) => request<Challenge>('/api/admin/challenges', json('POST', body)),
  updateChallenge: (id: string, body: ChallengeRequest) => request<Challenge>(`/api/admin/challenges/${id}`, json('PUT', body)),
  publishChallenge: (id: string) => request<Challenge>(`/api/admin/challenges/${id}/publish`, json('POST')),
  archiveChallenge: (id: string) => request<Challenge>(`/api/admin/challenges/${id}/archive`, json('POST')),
  deleteChallenge: (id: string) => request<void>(`/api/admin/challenges/${id}`, json('DELETE')),
  challengeStats: (id: string) => request<ChallengeStats>(`/api/admin/challenges/${id}/stats`),

  // ---- event templates
  eventTemplates: (q: { active?: string; page?: number; size?: number }) =>
    request<Page<EventTemplate>>(`/api/admin/event-templates?${qs({ ...q })}`),
  eventTemplate: (id: string) => request<EventTemplate>(`/api/admin/event-templates/${id}`),
  createEventTemplate: (body: EventTemplateRequest) => request<EventTemplate>('/api/admin/event-templates', json('POST', body)),
  updateEventTemplate: (id: string, body: EventTemplateRequest) =>
    request<EventTemplate>(`/api/admin/event-templates/${id}`, json('PUT', body)),
  setEventTemplateActive: (id: string, active: boolean) =>
    request<EventTemplate>(`/api/admin/event-templates/${id}/active`, json('PATCH', { active })),
  deleteEventTemplate: (id: string) => request<void>(`/api/admin/event-templates/${id}`, json('DELETE')),
};
