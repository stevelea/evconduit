# EVConduit Architecture Overview

This document provides a comprehensive view of the EVConduit system architecture, including components, data flows, integrations, and deployment topology.

## System Overview

EVConduit is a bridge between Home Assistant and Enode for electric vehicle integration. It enables users to monitor and control their EVs through Home Assistant while handling authentication, subscription billing, and real-time updates.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EVConduit System                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│  │   Frontend   │◄────►│   Backend    │◄────►│   Supabase   │             │
│  │  (Next.js)   │      │  (FastAPI)   │      │ (PostgreSQL) │             │
│  └──────────────┘      └──────────────┘      └──────────────┘             │
│         │                     │                                            │
│         │                     ├───────────────┬───────────────┐           │
│         │                     ▼               ▼               ▼           │
│         │              ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│         │              │  Enode   │    │  Stripe  │    │  Brevo   │      │
│         │              │   API    │    │   API    │    │   API    │      │
│         │              └──────────┘    └──────────┘    └──────────┘      │
│         │                     │                                            │
│         ▼                     ▼                                            │
│  ┌──────────────┐      ┌──────────────┐                                   │
│  │    Users     │      │Home Assistant│                                   │
│  │  (Browser)   │      │   Add-on     │                                   │
│  └──────────────┘      └──────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15, React 19, TypeScript | Web UI with App Router |
| Styling | TailwindCSS 4, ShadCN/UI | Component styling |
| Backend | FastAPI (Python 3.12) | REST API with async |
| Database | Supabase (PostgreSQL) | Data storage with RLS |
| Auth | Supabase Auth | Magic links, OAuth |
| Payments | Stripe | Subscriptions, one-time purchases |
| Email | Brevo (Sendinblue) | Transactional & marketing emails |
| SMS | Twilio | Phone verification, alerts |
| EV Data | Enode API | Vehicle data & commands |
| Monitoring | Sentry | Error tracking |
| Analytics | Umami | Privacy-focused analytics |

---

## Backend Architecture

### Entry Point & App Structure

**File:** `backend/app/main.py`

```
FastAPI App
│
├─ Lifespan Manager
│  ├─ Startup: Start webhook health scheduler
│  └─ Shutdown: Stop webhook health scheduler
│
├─ Telemetry Middleware
│  └─ Logs all /api/* and /webhook requests
│     - Request/response bodies
│     - User ID, vehicle ID
│     - Duration, status codes
│     - Token costs per endpoint
│
├─ CORS Configuration
│  └─ Allows: localhost:3000, evconduit.com, backend.evconduit.com
│
└─ Router Registration (prefix: /api)
   ├─ public.router     → Public endpoints
   ├─ private.router    → Authenticated endpoints
   ├─ webhook.router    → Webhook handlers
   ├─ me.router         → User profile
   ├─ ha.router         → Home Assistant integration
   ├─ newsletter.router → Newsletter management
   ├─ payments.router   → Stripe integration (/api/payments)
   ├─ phone_router      → Phone verification
   ├─ admin_routers[]   → Admin endpoints
   └─ internal.router   → Internal endpoints (/api/v1)
```

### API Endpoints Summary

| Route Group | Prefix | Authentication | Purpose |
|-------------|--------|----------------|---------|
| Public | `/api/` | None | Health checks, registration, newsletter |
| Private | `/api/` | JWT/API Key | Vehicle management, user settings |
| Me | `/api/me` | JWT | User profile, API usage |
| Home Assistant | `/api/ha/` | API Key | Vehicle status, charging control |
| Webhooks | `/api/webhook/` | Signature | Enode & Stripe events |
| Payments | `/api/payments/` | JWT | Stripe checkout |
| Admin | `/api/admin/` | Admin role | User/vehicle/settings management |
| Internal | `/api/v1/internal/` | Internal key | System operations |

### Authentication Mechanisms

```
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Request with Authorization: Bearer {token}                 │
│                      │                                      │
│                      ▼                                      │
│              ┌───────────────┐                             │
│              │ Try JWT Auth  │                             │
│              │ (Supabase)    │                             │
│              └───────┬───────┘                             │
│                      │                                      │
│           ┌──────────┴──────────┐                          │
│           │                     │                          │
│       Success               Failure                        │
│           │                     │                          │
│           ▼                     ▼                          │
│    Return User          ┌───────────────┐                  │
│                         │ Try API Key   │                  │
│                         │ (Hash lookup) │                  │
│                         └───────┬───────┘                  │
│                                 │                          │
│                      ┌──────────┴──────────┐               │
│                      │                     │               │
│                  Success               Failure             │
│                      │                     │               │
│                      ▼                     ▼               │
│               Return User            401 Error             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Three Auth Methods:**
1. **Supabase JWT** - Web users (ES256 verification)
2. **API Key** - Home Assistant/external integrations (SHA256 hash comparison)
3. **Internal API Key** - System operations (constant-time comparison)

### Storage Layer

**Location:** `backend/app/storage/`

| Module | Tables | Purpose |
|--------|--------|---------|
| `user.py` | `users` | User profiles, tier, credits, trial |
| `vehicle.py` | `vehicles` | Vehicle cache, online status |
| `api_key.py` | `api_keys` | API key hashes |
| `subscription.py` | `subscriptions` | Stripe subscription records |
| `invoice.py` | `invoices` | Payment invoices |
| `poll_logs.py` | `poll_logs` | API call history (rate limiting) |
| `webhook.py` | `webhook_subscriptions`, `webhook_logs` | Webhook events |
| `settings.py` | `settings` | System configuration |
| `newsletter.py` | `newsletter` | Newsletter subscriptions |
| `telemetry.py` | `api_telemetry` | API usage metrics |

### Rate Limiting System

```
┌─────────────────────────────────────────────────────────────┐
│                   Rate Limiting Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  API Request (e.g., GET /api/ha/status/{vehicle_id})       │
│                      │                                      │
│                      ▼                                      │
│         ┌───────────────────────┐                          │
│         │ Get User Tier & Sub   │                          │
│         └───────────┬───────────┘                          │
│                     │                                       │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Monthly Allowances                       │  │
│  │  ┌──────────┬──────────┬──────────┬──────────────┐  │  │
│  │  │   FREE   │  BASIC   │   PRO    │ Purchased    │  │  │
│  │  │  300/mo  │ 2,500/mo │10,000/mo │ Fallback     │  │  │
│  │  └──────────┴──────────┴──────────┴──────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                     │                                       │
│                     ▼                                       │
│         ┌───────────────────────┐                          │
│         │ Count Calls in Period │                          │
│         │ (poll_logs table)     │                          │
│         └───────────┬───────────┘                          │
│                     │                                       │
│         ┌───────────┴───────────┐                          │
│         │                       │                          │
│    Under Limit              Over Limit                     │
│         │                       │                          │
│         ▼                       ▼                          │
│    ┌─────────┐          ┌─────────────────┐               │
│    │ Allow   │          │ Check Purchased │               │
│    │ + Log   │          │ Tokens          │               │
│    └─────────┘          └────────┬────────┘               │
│                                  │                         │
│                      ┌───────────┴───────────┐            │
│                      │                       │            │
│                Has Tokens              No Tokens          │
│                      │                       │            │
│                      ▼                       ▼            │
│               Allow + Deduct          429 Too Many        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Next.js App Router Structure

```
frontend/src/app/
│
├─ layout.tsx                    # Root layout (Umami, Sentry)
│
├─ (public)/                     # Public route group
│  ├─ layout.tsx                 # I18n → Registration → Supabase providers
│  ├─ page.tsx                   # Landing page
│  ├─ login/page.tsx             # Magic link & OAuth
│  ├─ register/page.tsx          # Registration
│  ├─ register/[code]/page.tsx   # Registration with access code
│  ├─ contact/page.tsx
│  ├─ privacy/page.tsx
│  ├─ terms/page.tsx
│  ├─ status/page.tsx
│  └─ link-callback/page.tsx     # Enode linking callback
│
├─ (app)/                        # Authenticated route group
│  ├─ layout.tsx                 # I18n → Supabase → User → Stripe → AppShell
│  ├─ dashboard/page.tsx         # Vehicle dashboard
│  ├─ profile/page.tsx           # User settings
│  ├─ billing/page.tsx           # Subscription management
│  ├─ insights/page.tsx          # Analytics
│  ├─ onboarding/page.tsx
│  └─ admin/                     # Admin section
│     ├─ layout.tsx
│     ├─ users/page.tsx
│     ├─ vehicles/page.tsx
│     ├─ webhooks/page.tsx
│     ├─ settings/page.tsx
│     └─ ...
│
└─ auth/callback/page.tsx        # OAuth callback handler
```

### Provider Hierarchy

```
RootLayout
│
├─ (public) Layout
│  └─ I18nProvider
│     └─ RegistrationProvider
│        └─ SupabaseProvider
│           └─ Toaster + NavbarPublic + Content + Footer
│
└─ (app) Layout
   └─ I18nProvider
      └─ SupabaseProvider
         └─ UserProvider
            └─ StripeProvider
               └─ AppShell (Navbar + Sidebar + Content)
```

### Key Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAuth()` | `hooks/useAuth.ts` | Session, user data, admin check, token |
| `useUserContext()` | `contexts/UserContext.tsx` | Merged user profile from `/me` |
| `useUserInfo()` | `hooks/useUserInfo.ts` | UI data (avatar, name, isAdmin) |
| `useBillingInfo()` | `hooks/useBillingInfo.ts` | Subscription & invoices |
| `useNotificationSettings()` | `hooks/useNotificationSettings.ts` | Phone & notification prefs |
| `useVehicles()` | `hooks/useVehicles.ts` | Vehicle list |

### API Client Layer

```
Frontend Request
       │
       ▼
┌─────────────────┐
│  authFetch()    │ ← Injects Bearer token, retries on 401
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ apiFetchSafe()  │ ← Handles URL construction, error parsing
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   fetch()       │ → Backend API
└─────────────────┘
```

---

## Data Flows

### 1. User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Authentication Flow                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User                   Frontend                Backend       Supabase  │
│   │                        │                      │              │      │
│   │  1. Click Login        │                      │              │      │
│   │───────────────────────►│                      │              │      │
│   │                        │                      │              │      │
│   │  2. Choose Method      │                      │              │      │
│   │  (Magic Link/OAuth)    │                      │              │      │
│   │                        │                      │              │      │
│   │                        │  3. signInWithOtp()  │              │      │
│   │                        │  or signInWithOAuth()│              │      │
│   │                        │─────────────────────────────────────►│     │
│   │                        │                      │              │      │
│   │  4. Email/OAuth Flow   │                      │              │      │
│   │◄─────────────────────────────────────────────────────────────│      │
│   │                        │                      │              │      │
│   │  5. Click Link/Auth    │                      │              │      │
│   │───────────────────────►│                      │              │      │
│   │                        │                      │              │      │
│   │                        │  6. /auth/callback   │              │      │
│   │                        │  (exchange code)     │              │      │
│   │                        │─────────────────────────────────────►│     │
│   │                        │                      │              │      │
│   │                        │  7. Session + JWT    │              │      │
│   │                        │◄─────────────────────────────────────│     │
│   │                        │                      │              │      │
│   │                        │  8. GET /api/me      │              │      │
│   │                        │─────────────────────►│              │      │
│   │                        │                      │              │      │
│   │                        │  9. User profile     │              │      │
│   │                        │◄─────────────────────│              │      │
│   │                        │                      │              │      │
│   │  10. Dashboard         │                      │              │      │
│   │◄───────────────────────│                      │              │      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Vehicle Linking Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Vehicle Linking Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User        Frontend         Backend           Enode          Vendor   │
│   │             │                │                │               │     │
│   │ 1. Click    │                │                │               │     │
│   │ Link Vehicle│                │                │               │     │
│   │────────────►│                │                │               │     │
│   │             │                │                │               │     │
│   │ 2. Select   │                │                │               │     │
│   │ Vendor      │                │                │               │     │
│   │────────────►│                │                │               │     │
│   │             │                │                │               │     │
│   │             │ 3. POST        │                │               │     │
│   │             │ /user/link-    │                │               │     │
│   │             │ vehicle        │                │               │     │
│   │             │───────────────►│                │               │     │
│   │             │                │                │               │     │
│   │             │                │ 4. Create Link │               │     │
│   │             │                │ Session        │               │     │
│   │             │                │───────────────►│               │     │
│   │             │                │                │               │     │
│   │             │                │ 5. {linkUrl,   │               │     │
│   │             │                │    linkToken}  │               │     │
│   │             │                │◄───────────────│               │     │
│   │             │                │                │               │     │
│   │             │ 6. linkUrl     │                │               │     │
│   │             │◄───────────────│                │               │     │
│   │             │                │                │               │     │
│   │ 7. Redirect │                │                │               │     │
│   │◄────────────│                │                │               │     │
│   │             │                │                │               │     │
│   │ 8. Login to Vendor           │                │               │     │
│   │─────────────────────────────────────────────────────────────►│     │
│   │             │                │                │               │     │
│   │ 9. Authorize Enode           │                │               │     │
│   │─────────────────────────────────────────────►│               │     │
│   │             │                │                │               │     │
│   │ 10. Redirect to callback     │                │               │     │
│   │◄────────────────────────────────────────────│               │     │
│   │             │                │                │               │     │
│   │             │ 11. POST       │                │               │     │
│   │             │ /link-result   │                │               │     │
│   │             │───────────────►│                │               │     │
│   │             │                │                │               │     │
│   │             │                │ 12. Webhook:   │               │     │
│   │             │                │ vehicle:       │               │     │
│   │             │                │ discovered     │               │     │
│   │             │                │◄───────────────│               │     │
│   │             │                │                │               │     │
│   │             │                │ 13. Save to DB │               │     │
│   │             │                │                │               │     │
│   │             │ 14. Success    │                │               │     │
│   │             │◄───────────────│                │               │     │
│   │             │                │                │               │     │
│   │ 15. Show    │                │                │               │     │
│   │ Vehicle     │                │                │               │     │
│   │◄────────────│                │                │               │     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Webhook Data Flow (Enode → Home Assistant)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Enode Webhook Processing                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Enode           Backend              Supabase        Home Assistant    │
│   │                 │                    │                  │           │
│   │ 1. POST         │                    │                  │           │
│   │ /webhook/enode  │                    │                  │           │
│   │ (vehicle:updated)                    │                  │           │
│   │────────────────►│                    │                  │           │
│   │                 │                    │                  │           │
│   │                 │ 2. Verify          │                  │           │
│   │                 │ X-Enode-Signature  │                  │           │
│   │                 │ (HMAC-SHA256)      │                  │           │
│   │                 │                    │                  │           │
│   │                 │ 3. Save to         │                  │           │
│   │                 │ webhook_logs       │                  │           │
│   │                 │───────────────────►│                  │           │
│   │                 │                    │                  │           │
│   │                 │ 4. Process Event   │                  │           │
│   │                 │ - Extract user_id  │                  │           │
│   │                 │ - Extract vehicle  │                  │           │
│   │                 │                    │                  │           │
│   │                 │ 5. Update vehicle  │                  │           │
│   │                 │ cache              │                  │           │
│   │                 │───────────────────►│                  │           │
│   │                 │                    │                  │           │
│   │                 │ 6. Check user tier │                  │           │
│   │                 │◄───────────────────│                  │           │
│   │                 │                    │                  │           │
│   │                 │ 7. If Pro tier &   │                  │           │
│   │                 │ webhook configured │                  │           │
│   │                 │                    │                  │           │
│   │                 │ 8. POST to HA      │                  │           │
│   │                 │ webhook URL        │                  │           │
│   │                 │───────────────────────────────────────►│          │
│   │                 │                    │                  │           │
│   │ 9. 200 OK       │                    │                  │           │
│   │◄────────────────│                    │                  │           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Subscription Payment Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Stripe Subscription Flow                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User       Frontend        Backend         Stripe        Supabase      │
│   │            │               │               │              │         │
│   │ 1. Click   │               │               │              │         │
│   │ Upgrade    │               │               │              │         │
│   │───────────►│               │               │              │         │
│   │            │               │               │              │         │
│   │            │ 2. POST       │               │              │         │
│   │            │ /payments/    │               │              │         │
│   │            │ checkout      │               │              │         │
│   │            │──────────────►│               │              │         │
│   │            │               │               │              │         │
│   │            │               │ 3. Create     │              │         │
│   │            │               │ Checkout      │              │         │
│   │            │               │ Session       │              │         │
│   │            │               │──────────────►│              │         │
│   │            │               │               │              │         │
│   │            │               │ 4. Session ID │              │         │
│   │            │               │◄──────────────│              │         │
│   │            │               │               │              │         │
│   │            │ 5. Redirect   │               │              │         │
│   │            │ to Stripe     │               │              │         │
│   │            │◄──────────────│               │              │         │
│   │            │               │               │              │         │
│   │ 6. Payment │               │               │              │         │
│   │ on Stripe  │               │               │              │         │
│   │───────────────────────────────────────────►│              │         │
│   │            │               │               │              │         │
│   │            │               │ 7. Webhook:   │              │         │
│   │            │               │ checkout.     │              │         │
│   │            │               │ completed     │              │         │
│   │            │               │◄──────────────│              │         │
│   │            │               │               │              │         │
│   │            │               │ 8. Verify sig │              │         │
│   │            │               │               │              │         │
│   │            │               │ 9. Update     │              │         │
│   │            │               │ subscription  │              │         │
│   │            │               │──────────────────────────────►│        │
│   │            │               │               │              │         │
│   │            │               │ 10. Update    │              │         │
│   │            │               │ user.tier     │              │         │
│   │            │               │──────────────────────────────►│        │
│   │            │               │               │              │         │
│   │ 11. Redirect to /success   │               │              │         │
│   │◄───────────────────────────────────────────│              │         │
│   │            │               │               │              │         │
│   │ 12. Load   │               │               │              │         │
│   │ dashboard  │               │               │              │         │
│   │───────────►│               │               │              │         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5. Home Assistant API Call Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Home Assistant API Flow                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Home Assistant         Backend              Enode          Supabase    │
│   │                        │                   │                │       │
│   │ 1. GET /api/ha/        │                   │                │       │
│   │ status/{vehicle_id}    │                   │                │       │
│   │ Authorization: Bearer  │                   │                │       │
│   │ {api_key}              │                   │                │       │
│   │───────────────────────►│                   │                │       │
│   │                        │                   │                │       │
│   │                        │ 2. Validate API   │                │       │
│   │                        │ Key (hash lookup) │                │       │
│   │                        │──────────────────────────────────►│       │
│   │                        │                   │                │       │
│   │                        │ 3. User + tier    │                │       │
│   │                        │◄──────────────────────────────────│       │
│   │                        │                   │                │       │
│   │                        │ 4. Check rate     │                │       │
│   │                        │ limit (poll_logs) │                │       │
│   │                        │──────────────────────────────────►│       │
│   │                        │                   │                │       │
│   │                        │ 5. Count < limit? │                │       │
│   │                        │◄──────────────────────────────────│       │
│   │                        │                   │                │       │
│   │                        │ 6. Get vehicle    │                │       │
│   │                        │ from cache        │                │       │
│   │                        │──────────────────────────────────►│       │
│   │                        │                   │                │       │
│   │                        │ 7. If cache       │                │       │
│   │                        │ expired, fetch    │                │       │
│   │                        │ from Enode        │                │       │
│   │                        │──────────────────►│                │       │
│   │                        │                   │                │       │
│   │                        │ 8. Vehicle data   │                │       │
│   │                        │◄──────────────────│                │       │
│   │                        │                   │                │       │
│   │                        │ 9. Log API call   │                │       │
│   │                        │ (async)           │                │       │
│   │                        │──────────────────────────────────►│       │
│   │                        │                   │                │       │
│   │ 10. Vehicle status     │                   │                │       │
│   │ (chargeState, location,│                   │                │       │
│   │  odometer, etc.)       │                   │                │       │
│   │◄───────────────────────│                   │                │       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Users table
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT,                    -- 'user' | 'admin'
  tier TEXT,                    -- 'free' | 'basic' | 'pro'
  approved BOOLEAN,
  accepted_terms BOOLEAN,
  notify_offline BOOLEAN,
  notification_preferences JSONB,
  phone_number TEXT,
  phone_verified BOOLEAN,
  stripe_customer_id TEXT,
  sms_credits INTEGER,
  purchased_api_tokens INTEGER,
  is_on_trial BOOLEAN,
  trial_ends_at TIMESTAMP,
  ha_webhook_url TEXT,
  created_at TIMESTAMP
)

-- Vehicles table
vehicles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  vehicle_id TEXT,              -- Enode vehicle ID
  vendor TEXT,
  online BOOLEAN,
  vehicle_cache JSONB,          -- Full vehicle data from Enode
  updated_at TIMESTAMP
)

-- API Keys table
api_keys (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  key_hash TEXT,                -- SHA256 hash of API key
  is_active BOOLEAN,
  created_at TIMESTAMP
)

-- Subscriptions table
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT,
  plan_id TEXT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN
)

-- Poll logs (rate limiting)
poll_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  vehicle_id UUID REFERENCES vehicles,
  endpoint TEXT,
  created_at TIMESTAMP
)

-- Webhook subscriptions (Enode)
webhook_subscriptions (
  id UUID PRIMARY KEY,
  enode_webhook_id TEXT UNIQUE,
  url TEXT,
  events TEXT[],
  secret TEXT,
  is_active BOOLEAN,
  last_success TIMESTAMP,
  created_at TIMESTAMP
)

-- Webhook logs
webhook_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  vehicle_id UUID,
  event TEXT,
  event_type TEXT,
  version TEXT,
  payload JSONB,
  created_at TIMESTAMP
)
```

---

## External Integrations

### Enode API

**Purpose:** EV manufacturer data aggregation

**Endpoints Used:**
- `POST /oauth2/token` - Get access token
- `GET /users/{userId}/vehicles` - List user's vehicles
- `POST /users/{userId}/link` - Create linking session
- `GET /link/{linkToken}` - Get link result
- `POST /vehicles/{vehicleId}/charging` - Start/stop charging
- `GET /webhooks` - List webhook subscriptions
- `POST /webhooks` - Subscribe to webhooks
- `DELETE /webhooks/{id}` - Unsubscribe

**Webhook Events:**
- `user:vehicle:discovered` - New vehicle linked
- `user:vehicle:updated` - Vehicle data changed
- `system:heartbeat` - Keep-alive ping

### Stripe API

**Purpose:** Subscription billing and payments

**Products:**
- Subscription plans: `free`, `basic_monthly`, `basic_yearly`, `pro_monthly`, `pro_yearly`
- SMS packages: `sms_50`, `sms_200`, `sms_500`
- API token packages: `token_1000`, `token_5000`, `token_10000`

**Webhook Events:**
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.created`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Brevo (Sendinblue)

**Purpose:** Email marketing and transactional emails

**Features:**
- Contact management
- Newsletter subscriptions
- Transactional email templates
- Onboarding email sequences

### Twilio

**Purpose:** SMS notifications and phone verification

**Features:**
- Phone number verification codes
- SMS alert notifications
- Credit-based SMS system

---

## Deployment

### Docker Services

```yaml
services:
  backend:
    build: ./backend
    ports: ["9100:9100"]
    environment:
      - SUPABASE_URL
      - ENODE_CLIENT_ID
      - STRIPE_SECRET_KEY
      - ...
    depends_on:
      - redis

  frontend:
    build: ./frontend
    ports: ["3010:3000"]
    environment:
      - NEXT_PUBLIC_API_BASE_URL
      - NEXT_PUBLIC_SUPABASE_URL
      - ...

  redis:
    image: redis:alpine
    ports: ["6379:6379"]
```

### Environment Variables

**Backend:**
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
ENODE_CLIENT_ID, ENODE_CLIENT_SECRET, ENODE_BASE_URL, ENODE_AUTH_URL
WEBHOOK_URL, ENODE_WEBHOOK_SECRET
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
BREVO_API_KEY
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
SENTRY_DSN, REDIS_URL
```

**Frontend:**
```
NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

## Security Considerations

1. **Authentication:** JWT tokens with short expiry, API keys hashed with SHA256
2. **Webhook Verification:** HMAC-SHA256 signatures for Enode and Stripe
3. **Rate Limiting:** Tier-based limits with purchased token fallback
4. **RLS Policies:** Row-level security on all Supabase tables
5. **CORS:** Restricted to known domains
6. **Secrets:** All secrets in environment variables, never in code

---

*For API specification details, see `docs/API_SPEC.md`*
*For development setup, see `CLAUDE.md`*
