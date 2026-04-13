# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind + shadcn/ui + wouter

## Project: BrandReady

A SaaS platform that analyzes brand credibility and ad-readiness for founders and sales marketers.

### Key Features
- In-app notification system: bell icon with unread badge, Messages page with filter tabs (all/unread/read), mark read, delete, clear-read
- Admin broadcast: send in-app notifications and/or emails to all/active/inactive/subscribed/unsubscribed/selected users
- Subscription management page (`/subscription`): current plan card, expiry countdown, auto-renewal toggle, cancel/reactivate, reminder schedule, real billing history
- Subscription scheduler: hourly background job that sends reminder emails + in-app notifications at 7/3/1 days before expiry, marks expired subscriptions inactive
- Auto-renewal toggle: per-subscription setting stored in DB, cancel schedules end-of-period cancellation with reactivation option
- Google OAuth sign-in/sign-up: "Continue with Google" on Login and Register pages; admin configures Client ID/Secret from Admin > API Integrations
- Email confirmation resend page (`/resend-confirmation`): for users with expired links; login auto-redirects unverified users here with email pre-filled
- Admin Panel link removed from user dashboard sidebar (accessible directly at /admin)
- Brand analysis form: website, social media handles, competitors, industry
- AI-powered scoring: website, social, content, reviews, competitor scores (6 dimensions)
- Ad Readiness Score (0-100) with readiness level (not_ready/getting_there/almost_ready/ready)
- Step-by-step action plan with task tracking
- Subscription plans with Flutterwave payment integration (USD fallback for unsupported currencies)
- Monthly/yearly billing toggle on Pricing page (yearly = 10% off, applied at API level)
- Coupon code system: DB table, admin CRUD (`/admin/coupons`), validate endpoint (`/subscriptions/validate-coupon`), applied in payment initiation with discount calculation
- Localized currency detection by IP geolocation (NGN, GHS, USD, EUR, GBP, etc.); unsupported currencies fall back to USD
- Plans loaded from DB `platform_plans` table; currency conversion from NGN base price using exchange rate table
- Notifications plan-gating: `competitorAlerts` and `adsIntelligenceAlerts` locked behind paid plan in Profile page
- Admin coupon management: full CRUD UI in AdminPlansAndPricing page with table, create/edit form, toggle active
- Dashboard with summary stats and recent analyses
- Daily tasks for monthly subscribers
- User profile, brand setup, and billing pages
- One-time onboarding wizard (5 steps after email confirmation)
- Admin username/password login (token-based sessions, `admin_accounts` DB table)
- Default admin: username=`admin`, password=`brandready-admin-2024` (change via ADMIN_USERNAME/ADMIN_PASSWORD env vars)
- Transactional email via Resend SDK (configurable from Admin > API Integrations: resendApiKey + resendFromEmail)
- Admin dashboard (stats, user management) and settings (logo upload, API keys, platform controls)

### Group 1 AI Features (12 features — fully implemented)
All AI features use the OpenAI API key configured at Admin > API Integrations (`openaiApiKey`).
- **AI Brand Coach** (`/ai-coach`) — Full chat interface with brand context; persistent chat history in `ai_chat_messages` DB table; clear history; streams responses via `gpt-4o-mini`
- **AI Content Generator** (`/content-generator`) — Blog, social, ad, email content generation; optional `gpt-image-1` image generation
- **Press Release Builder** (`/press-release`) — 5-field form → publication-ready press release + 15 journalist targets by industry/country
- **Review Request Templates** (`/review-templates`) — WhatsApp/email/DM templates for any review platform, personalized to brand
- **Industry Benchmark Database** (`/benchmarks`) — Anonymized aggregate scores by industry from all brand analyses; user score vs industry avg
- **Competitor Score Tracker** (`/competitor-tracker`) — Save score snapshots; 90-day trend line chart per competitor; `competitor_score_snapshots` DB table
- **Competitor Strategy Decoder** (`/strategy-decoder`) — AI analysis of competitor brand positioning, content strategy, ad approach, target audience, gaps
- **Ad Readiness Predictor** — On Results page: "Predict My Timeline" card shows AI estimate of days to ad-ready + weekly goal
- **Brand Mention Sentiment Analysis** — On Brand Mentions page: NLP insights panel with sentiment score bar + AI summary
- **Share of Voice** — On Dashboard: mini-widget showing your brand vs competitors as % of total credibility score
- **Auto-Roadmap Regeneration** — `POST /api/analyses/:id/tasks/regenerate`: AI reprioritizes pending tasks based on completed work + current scores
- **Weekly Credibility Digest** — Monday 7–9am scheduler sends email with brand score, delta, top 3 actions; respects `notificationPrefs.weeklyDigest === false`

**New DB tables**: `competitor_score_snapshots` (id, sessionId, competitorId, scores, recordedAt), `ai_chat_messages` (id, sessionId, role, content, createdAt)
**Shared OpenAI helper**: `artifacts/api-server/src/lib/openai.ts` — `getOpenAiClient()`, `chatCompletion()`, `generateImage()`; gracefully returns null if no API key

### Email Setup (Resend)
- Resend SDK (`resend` package) used for confirmation and welcome emails
- API key and from-address configurable from Admin > API Integrations page (stored in platform_settings)
- Falls back to env vars: RESEND_API_KEY, RESEND_FROM
- In dev mode (no key): confirmation URL is returned in signup response for testing
- NOTE: Resend Replit OAuth connector (ccfg_resend_01K69QKYK789WN202XSE3QS17V) was dismissed by user — using direct API key approach instead

### Admin Authentication
- Replaced secret-token gate with proper username/password login
- Sessions stored in-memory (Map) with 24h TTL, token sent as x-admin-token header
- Seed function creates default admin on first server start if none exists
- Endpoints: POST /api/admin/login, POST /api/admin/logout, GET /api/admin/me, POST /api/admin/change-password

### Pages
- `/` — Marketing landing page
- `/analyze` — Multi-step brand analysis form
- `/results/:id` — Analysis results with score breakdown
- `/dashboard` — Summary dashboard
- `/pricing` — Subscription plans with localized pricing
- `/tasks/:analysisId` — Task tracker
- `/payment/callback` — Flutterwave payment callback
- `/profile` — User profile (name, email, company, phone, country, timezone)
- `/billing` — Subscription lookup and payment history by email
- `/brand-setup` — Brand profile setup (social handles, competitors, audience)
- `/admin` — Overview: 5 KPIs + revenue sparkline + plan distribution + live API health monitor + users + payments table
- `/onboarding` — One-time 5-step onboarding wizard (name, role, ad experience, company size/revenue, industry) → redirects to /analyze
- `/admin/api-integrations` — All API key panels: SERP, Brand Mentions, Meta, X, LinkedIn, Google, Trustpilot, Flutterwave (live/test toggle), Resend (email), OpenAI, FX Rates
- `/admin/appearance` — Drag-drop logo upload, brand colors, typography, platform identity, legal links
- `/admin/general` — Platform toggles, security (2FA/reCAPTCHA/session/IP), analysis dimension weights, SMTP
- `/admin/plans` — Editable plan cards with feature toggling, plan summary table
- `/admin/analytics` — Monthly scans chart, score distribution, revenue by country, analyses by industry
- `/admin/users` — Searchable/filterable user table with disable/ban/unban/delete actions
- `/admin/notifications` — Broadcast notifications/emails to user segments (all/active/inactive/subscribed/unsubscribed/selected)
- `/admin/audit-logs` — Filterable audit log with CSV export; reads real data from `audit_logs` DB table; entries written on user disable/ban/delete, settings update, logo upload, plan assignment
- `/messages` — User notifications inbox (read, mark read, delete, clear read notifications)
- `/subscription` — Full subscription management: plan details, auto-renewal toggle, cancel/reactivate, expiry countdown, reminder schedule, real billing history
- `/resend-confirmation` — Email confirmation resend page (for expired/unsent verification links)
- `/auth/google/success` — Google OAuth callback landing (stores session, redirects to dashboard or onboarding)

### API Routes
**Analyses**
- `GET/POST /api/analyses` — List/create analyses
- `GET /api/analyses/:id` — Get specific analysis
- `POST /api/analyses/:id/run` — Run the AI analysis
- `GET /api/analyses/:id/tasks` — Get tasks for analysis
- `PATCH /api/tasks/:id/complete` — Mark task complete
- `PATCH /api/tasks/:id/uncomplete` — Mark task incomplete

**Subscriptions & Payments**
- `GET /api/subscriptions/plans` — Get subscription plans (with ?currency=)
- `GET /api/subscriptions/detect-currency` — Detect user currency by IP
- `POST /api/subscriptions/initiate-payment` — Initiate Flutterwave payment
- `POST /api/subscriptions/verify-payment` — Verify Flutterwave payment

**Dashboard**
- `GET /api/dashboard/summary` — Dashboard stats
- `GET /api/dashboard/recent-analyses` — 5 most recent completed analyses

**User**
- `GET /api/user/profile?sessionId=` — Get/create user profile
- `PATCH /api/user/profile?sessionId=` — Update user profile
- `GET /api/user/brand-profile?sessionId=` — Get brand profile
- `PUT /api/user/brand-profile?sessionId=` — Upsert brand profile
- `GET /api/user/subscription?email=` — Get subscription status + history
- `PATCH /api/user/profile/notifications` — Update notification preferences (stored as JSON in notificationPrefs)
- `PATCH /api/user/profile/bio` — Update user bio

**Competitors** (requires `x-session-id` header or `?sessionId=`)
- `GET /api/user/competitors` — List competitors for session
- `POST /api/user/competitors` — Add competitor (name, website?); score generated via deterministic hash
- `DELETE /api/user/competitors/:id` — Delete a competitor

**Brand Mentions** (requires `x-session-id` header or `?sessionId=`)
- `GET /api/user/mentions` — Returns `{ mentions: [...], settings: {...} }` for session
- `POST /api/user/mentions/refresh` — Re-seed mentions and return refresh count
- `PATCH /api/user/mentions/:id/read` — Mark mention as read
- `PUT /api/user/mentions/settings` — Update mention alert settings

**Admin** (requires `x-admin-secret` header or `?adminSecret=` query param)
- `GET /api/admin/settings` — Get all platform settings
- `PATCH /api/admin/settings` — Update platform settings
- `POST /api/admin/logo` — Upload site logo (base64)
- `GET /api/admin/stats` — Platform-wide statistics
- `GET /api/admin/users` — List all registered users
- `GET /api/admin/audit-logs` — Paginated audit log (supports ?limit, ?offset, ?action filters)
- `GET/PATCH /api/admin/users/:sessionId` — Get/update specific user
- `DELETE /api/admin/users/:sessionId` — Delete user account

### Database Schema
- `analyses` — brand analysis records (includes sessionId, messagingScore)
- `insights` — generated insights per analysis
- `action_tasks` — action plan tasks per analysis (includes dayNumber)
- `subscriptions` — payment subscriptions
- `user_profiles` — user profile (name, email, company, phone, country, timezone, bio, notificationPrefs)
- `brand_profiles` — per-user brand profile (handles, competitors, audience)
- `platform_settings` — key/value admin settings (logo, API keys, site config)
- `user_competitors` — per-session competitor list with estimated scores
- `brand_mentions` — seeded brand mentions per session (platform, sentiment, read status)
- `mention_settings` — alert preferences per session (frequency, tracked keywords, sentiment filters)
- `audit_logs` — actor, action, targetType/Id, IP, metadata, timestamp

### Auth & Identity
- Full email-based auth flow: signup → email confirmation → login
- Password hashing: bcryptjs, cost factor 12
- User session: UUID stored in `localStorage` under `brandready_session_id`; set on login + email confirm; cleared on logout
- Email confirmation: dev mode returns `confirmationUrl` in signup response (displayed on CheckEmail page); production uses nodemailer (SMTP_HOST/PORT/USER/PASS/FROM env vars)
- Login requires emailConfirmed = true; returns 403 "Please confirm your email" otherwise
- Admin access: secret token (`ADMIN_SECRET` env var, default `brandready-admin-2024`)
  - Send as `x-admin-secret` header or `?adminSecret=` query param
  - Stored in browser localStorage as `brandready_admin_secret`

### Auth Pages
- `/register` — Signup form (fullName, email, password with show/hide toggle) → redirects to /check-email
- `/login` — Login form → redirects to /dashboard
- `/check-email` — Confirmation pending page; dev mode shows clickable confirmation URL in amber box
- `/confirm-email?token=` — Auto-confirms token, auto-logs in, redirects to /dashboard

### Auth API Routes
- `POST /api/auth/signup` — Creates user with bcrypt-hashed password, sends confirmation email (or returns URL in dev mode)
- `POST /api/auth/login` — Validates email + password, returns sessionId (requires emailConfirmed)
- `GET /api/auth/confirm?token=` — Confirms email token, marks emailConfirmed=true, returns sessionId
- `POST /api/auth/resend-confirmation` — Resends confirmation email

### Database Schema (additional)
- `user_profiles` — extended with `passwordHash` (text) + `emailConfirmed` (boolean, default false)
- `email_confirmations` — token, userId, expiresAt, usedAt

### External Integrations
- **Flutterwave**: Payment processing (requires `FLUTTERWAVE_SECRET_KEY` env var — optional, falls back to mock)
- **ipapi.co**: Currency detection by IP geolocation (no API key needed)
- **SEMrush, Google Custom Search, Trustpilot, Instagram, LinkedIn**: Configurable via Admin Settings

### Dev-Mode Architecture
- Frontend (Vite) runs on the port from `PORT` env var (25344 in `Start application` workflow)
- API server runs on port 8080 (via `API Server` workflow, `PORT=8080`)
- **Vite proxy**: `artifacts/brand-ready/vite.config.ts` has `server.proxy: { "/api": "http://localhost:8080" }` — all `/api/*` requests from the browser are forwarded to the API server in development
- In production: API server serves both the API at `/api/*` and the built frontend static files from `artifacts/brand-ready/dist/public`
- `useApi.ts` hook sends `x-session-id` header for authentication; the generated API client (`@workspace/api-client-react`) does not

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
