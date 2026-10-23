# Habita AI — Admin panel

Web console for operators: user management, user activity, feature usage per user, and AI
consumption. React 19 + Vite + TypeScript + Recharts. Talks only to the backend's
`/api/admin/**` routes (`backend/Saheli-Backend`, package `admin/`).

## Run it

1. **Backend** — set an admin account in `backend/Saheli-Backend/.env` and start it as usual:

   ```
   ADMIN_BOOTSTRAP_EMAIL=you@example.com
   ADMIN_BOOTSTRAP_PASSWORD=<12+ characters>
   ```

   On startup the backend runs migration `V43__admin_panel.sql` and creates that admin if it
   doesn't exist. Nothing is created when either variable is empty.

2. **Panel**

   ```
   npm install
   npm run dev        # http://localhost:5174, proxies /api → http://localhost:8080
   ```

   Point the proxy elsewhere with `HABITA_API_URL=http://host:port npm run dev`. For a
   production build served from a different origin, set `VITE_API_BASE_URL` before
   `npm run build`.

## Pages

| Page | Shows | Endpoint |
| --- | --- | --- |
| Overview | Registered/active users, DAU/WAU/MAU, activity graph, top features, AI by feature | `analytics/overview`, `activity`, `categories`, `ai-usage` |
| Users | Search, filter by status, sort by activity / AI tokens, paginated | `GET users` |
| User detail | Daily activity, features used, AI usage by feature, families, devices, **suspend / reactivate** | `GET users/{id}`, `PATCH users/{id}/status` |
| Feature usage | Requests and reach per feature; heatmap of the top 25 users × feature | `analytics/categories`, `user-categories` |
| AI consumption | Tokens per day, per-feature tokens / latency / failures / cost, top consumers | `analytics/ai-usage` |

## Where the numbers come from

- **Activity** — every authenticated app request is counted per user, per day, per feature
  area (`UserActivityInterceptor` → `user_activity_daily`, flushed every 30 s). Feature area
  comes from the URL (`ActivityCategory.fromPath`). Data starts when V43 is deployed;
  there is no backfill.
- **AI consumption** — every model call is recorded with its token counts
  (`AiUsageAdvisor` on all ChatClients, plus Whisper transcription and gpt-image-1 try-on)
  in `ai_usage_events`.
- **Cost** is an estimate from `AI_PRICING` (USD per 1M tokens, default `gpt-4o-mini` only).
  Models without a configured rate count as $0 and are flagged on the AI page. Whisper is
  billed per audio minute, so it shows calls but no tokens or cost.
- **Suspend** sets `users.active = false` and a Redis marker, so the user's existing tokens
  are rejected immediately (HTTP 403) and login/refresh are refused.
