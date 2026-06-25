# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**گلدون (Goldan)** is a Persian-language plant care mobile app (Android via Capacitor) with a React/TypeScript frontend and Node.js/Express backend. The entire UI is RTL (right-to-left) with all user-facing text in Persian (Farsi).

## Commands

### Backend (`backend/`)

```bash
# Install dependencies
yarn install

# Development (auto-restart with nodemon)
yarn dev

# Build TypeScript
yarn build

# Start production build
yarn start

# Test Gemini AI integration
yarn test-gemini

# Check API key validity
yarn check-api
```

### Frontend (`frontend/`)

```bash
# Install dependencies
npm install

# Development server (localhost:3000)
npm start

# Production build (outputs to build/)
npm run build

# Run tests
npm test
```

### Android APK

APK builds run automatically via GitHub Actions on every push to `main`. Download the artifact from the Actions tab. To build locally, run `./build_apk_fresh.sh` from the repo root (requires Android SDK + Java 17).

## Architecture

### Backend (`backend/src/`)

Express app on port **4380** (production server: `130.185.76.46`).

**Startup sequence** (`index.ts`): connects to PostgreSQL → `initializeDatabase()` auto-creates all tables via `CREATE TABLE IF NOT EXISTS` → starts HTTP server.

**Route layout:**
- `/api/auth` — OTP-based phone authentication (SMS via SMS.ir)
- `/api/plants` — user's plant instances (CRUD + watering/fertilizing)
- `/api/gardens` — garden management
- `/api/diagnosis` — plant identification and disease scanning (PlantNet + Gemini AI)
- `/api/plant-bank` — shared plant catalog
- `/api/chat` — AI plant assistant (Gemini)
- `/api/subscription` — subscription plans and scan packages
- `/api/payment` — Zarinpal payment gateway
- `/api/notifications` — watering/fertilizing reminders

**Auth pattern:** Token-based (not JWT). Tokens stored in `auth_tokens` table. `authMiddleware` in `routes/auth.ts` validates `Authorization: Bearer <token>` and attaches `req.user`. All protected routes import and apply this middleware.

**Database** (`config/database.ts`): PostgreSQL pool with auto-retry on connection errors. Use the exported `query()` helper (not direct pool calls) for automatic retry logic. Use `withTransaction()` for multi-statement operations.

**AI services** (`routes/diagnosis.ts`):
- Plant identification supports **Normal mode** (PlantNet only, fast) and **Pro mode** (PlantNet → Gemini fallback for confidence < 60%)
- Multiple Gemini API keys can be rotated via `GEMINI_API_KEYS` (comma-separated)
- `TYPE_AI` env var selects the vision model; `TYPE_IDENTIFY` can be set to `openrouter` to use OpenRouter models instead of Gemini for text enrichment
- PlantNet has a backoff mechanism (`plantNetBackoffUntil`) that temporarily disables it after repeated failures

**Usage limits** (`routes/subscription.ts`): `PLAN_LIMITS` defines free vs. subscriber quotas. `checkUsageLimit()` and `trackUsage()` are called in diagnosis/chat routes to enforce limits.

### Frontend (`frontend/src/`)

React 19 + TypeScript SPA wrapped with Capacitor for Android. Uses `react-router-dom` v7.

**Core providers** (wired in `App.tsx`):
- `AuthProvider` — phone+OTP auth, token in `localStorage`, offline-tolerant (trusts local token when `navigator.onLine === false`)
- `NotificationProvider` — in-app notification state

**Route access**: `App.tsx` conditionally renders either authenticated routes (with `BottomNavigation`) or auth routes (login/OTP), based on `isAuthenticated` from `AuthContext`.

**Screens** (`screens/`): Full-page components. `GardenScreen` is the default home (`/`).

**API layer** (`services/plantApiService.ts`): All backend calls. The base URL defaults to `http://130.185.76.46:4380` but can be overridden via `REACT_APP_API_URL`.

**Offline support** (`services/offlineGardenService.ts`): Singleton `OfflineGardenService` uses IndexedDB (`goldan_offline`) to cache plant data, images (as Blobs), and queue pending actions (water/reminder/delete) for sync when back online.

**Styling**: `styled-components` v6. All layouts use `direction: rtl; text-align: right`. Persian font stack: `'Vazirmatn', 'Estedad'`.

**Persian date formatting**: Use `moment-jalaali` for any date display (not standard `moment` or `date-fns`).

## Environment Variables

Create `backend/.env` based on `backend/.env.example`. Key variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gooldoon
DB_USER=postgres
DB_PASSWORD=12345678

# AI
GEMINI_API_KEY=...
GEMINI_API_KEYS=key1,key2,key3  # for key rotation
TYPE_AI=gemini-2.5-flash         # vision model
TYPE_IDENTIFY=gemini              # or "openrouter"
OPENROUTER_MODELS=stepfun/step-3.5-flash:free

# PlantNet
PLANTNET_API_KEY=...

# SMS (OTP)
SMSIR_API_KEY=...
SMSIR_TEMPLATE_ID=...

# Payment
ZARINPAL_MERCHANT_ID=...
```

Frontend: set `REACT_APP_API_URL` in `frontend/.env` to point to the backend.

## Database Schema

All tables are auto-created on backend startup. Key tables:
- `users` / `otp_codes` / `auth_tokens` / `rate_limits` — authentication
- `gardens` / `plants` / `user_plants` — plant catalog and user-specific instances
- `care_activities` / `notifications` / `notification_settings` — care tracking
- `user_subscriptions` / `user_scan_purchases` / `pending_payments` / `usage_tracking` — billing
- `plant_health_records` / `plant_chat_history` — AI features

To reset the database in development, run `ts-node backend/reset-db.ts`. The `dropAllTables()` function in `config/schema.ts` only works when `NODE_ENV=development`.

## Key Conventions

- **API responses** always follow `{ success: boolean, data?: any, message: string }`.
- **Auth in backend routes**: protected routes receive `req.user` (injected by `authMiddleware`) and `req.token`. Cast as `(req as any).user`.
- **New routes** must be registered in `backend/src/index.ts`.
- **Plant identification confidence thresholds**: results are only saved to the plant bank if confidence ≥ 60%. Results with confidence < 30% trigger a `suggestPro: true` flag.
- **Subscription enforcement**: always call `checkUsageLimit()` before AI operations and `trackUsage()` after successful ones.
- **Plant images** are served from `/storage/plant/` (static files from `gol_gadering/`) and `/uploads/` (user uploads via multer).
