# LastMile Delivery Tracker

> A production-grade, full-stack **Last-Mile Delivery Management Platform** with dynamic rate cards, zone-based agent assignment, real-time order tracking, and role-based access control.

**🔴 Live Demo:** [https://last-mile-delivery-mu.vercel.app](https://last-mile-delivery-mu.vercel.app)
**⚙️ Live API:** [https://lastmile-backend-mu30.onrender.com/health](https://lastmile-backend-mu30.onrender.com/health)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js · Express · TypeScript |
| **ORM** | Prisma v5 |
| **Database** | PostgreSQL 15 |
| **Frontend** | Next.js 14 (App Router) · Tailwind CSS |
| **Auth** | JSON Web Tokens (JWT) · RBAC |
| **Notifications** | Nodemailer (SMTP/SendGrid) · Twilio REST API |
| **Dev Tools** | ESLint · ts-node · dotenv |

---

## Project Structure

```
Last_Mile_Delivery/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # Full DB schema (7 models)
│   └── src/
│       ├── config/
│       │   └── state-machine.ts  # Order status transition table
│       ├── controllers/
│       │   └── order.controller.ts
│       ├── middleware/
│       │   └── auth.middleware.ts # JWT + RBAC guards
│       ├── routes/
│       │   └── index.ts           # 22 REST endpoints
│       ├── services/
│       │   ├── rate-calculation.service.ts
│       │   ├── agent-assignment.service.ts
│       │   └── notification.service.ts
│       ├── types/
│       │   └── order.types.ts
│       └── utils/
│           └── geo.utils.ts       # Haversine distance
└── frontend/
    └── src/
        ├── app/                   # Next.js App Router pages
        ├── components/
        │   ├── orders/CreateOrderForm.tsx
        │   └── tracking/TrackingTimeline.tsx
        ├── lib/api.ts             # Axios client
        └── types/index.ts
```

---

## Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 15 (local or hosted, e.g. [Neon](https://neon.tech) free tier)
- **npm** >= 9.x
- (Optional) **Twilio** account for SMS
- (Optional) **SendGrid** / any SMTP provider for email

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd Last_Mile_Delivery

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

Edit both `.env` files with your values (see `.env.example` sections below).

### 3. Set Up the Database

```bash
cd backend

# Push schema to your PostgreSQL database
npx prisma db push

# (Optional) Open Prisma Studio to inspect data
npx prisma studio

# Seed essential data (zones, areas, admin user, rate cards)
npx ts-node src/scripts/seed.ts
```

### 4. Run the Application

```bash
# Terminal 1 — Backend API (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to the login page.

### Default Seed Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@lastmile.dev` | `Admin@123` |
| Customer | `customer@lastmile.dev` | `Customer@123` |
| Agent | `agent@lastmile.dev` | `Agent@123` |

---

## Environment Variables

### `backend/.env.example`

```env
# ── Database ──────────────────────────────────────────────────────────
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/lastmile_db"

# ── JWT ───────────────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="replace_with_a_64_character_random_hex_string"
JWT_EXPIRES_IN="24h"

# ── Server ────────────────────────────────────────────────────────────
PORT=4000
NODE_ENV=development

# ── Email Notifications (Nodemailer / SendGrid SMTP) ─────────────────
NOTIFY_EMAIL_ENABLED=false
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key_here
SMTP_FROM=noreply@yourdomain.com

# ── SMS Notifications (Twilio) ────────────────────────────────────────
NOTIFY_SMS_ENABLED=false
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1415XXXXXXX
```

### `frontend/.env.example`

```env
# ── Backend API URL ───────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## API Overview

Base URL: `http://localhost:4000/api`

All protected routes require the header:
```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | ❌ | Register new customer account |
| `POST` | `/auth/login` | ❌ | Login → returns `{ token, user }` |
| `GET` | `/auth/me` | ✅ | Get current authenticated user |

### Orders

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `POST` | `/orders` | CUSTOMER, ADMIN | Place new order with live rate calc |
| `GET` | `/orders` | Any | List orders (auto-filtered by role) |
| `GET` | `/orders/:id` | Any | Order detail + full tracking history |
| `PATCH` | `/orders/:id/status` | AGENT, ADMIN | **Update status** (state machine enforced) |
| `GET` | `/orders/:id/tracking` | Any | Immutable tracking events only |
| `GET` | `/orders/track/:orderNumber` | ❌ Public | Unauthenticated shipment tracking |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/dashboard` | System-wide stats (orders, revenue, agents) |
| `GET/POST` | `/admin/rate-cards` | List / create versioned rate cards |
| `GET/POST` | `/admin/zones` | List / create delivery zones |
| `POST` | `/admin/zones/:id/areas` | Add pincode area to zone |
| `GET/POST` | `/admin/users` | Manage all user accounts |
| `PATCH` | `/admin/users/:id/status` | Activate / deactivate account |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/agents` | All agents with live workload (admin) |
| `GET` | `/agents/me/orders` | My active deliveries |
| `PATCH` | `/agents/me/location` | Push GPS coordinates |
| `PATCH` | `/agents/me/status` | Toggle AVAILABLE / OFFLINE |

---

## Rate Calculation Logic

All pricing is **fully dynamic** — no hardcoded rates anywhere.

```
1. Resolve pickup/drop pincodes → Area → Zone
2. routeType = pickupZone === dropZone ? INTRA_ZONE : INTER_ZONE
3. volumetricWeight = (L × B × H) / 5000
4. billableWeight   = MAX(actualWeight, volumetricWeight)
5. Fetch active RateCard for businessType (B2B/B2C)
6. baseCharge   = baseRate[routeType]
   weightCharge = perKgRate[routeType] × billableWeight
   codSurcharge = codFlat + (codPercent/100 × codCollectAmount)
7. totalCharge  = baseCharge + weightCharge + codSurcharge
```

The `rateCardId` is **snapshot-stored** on the Order. Future rate changes never affect historical orders.

---

## Order Status State Machine

```
CREATED → PICKUP_SCHEDULED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY
                                                          ↙         ↘
                                                    DELIVERED      FAILED → RESCHEDULED
```

Every transition is validated against a role-permission table. Invalid transitions return `422`. Unauthorized role transitions return `403`.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Rate Card Versioning** | Orders snapshot `rateCardId` at creation; future admin rate changes never reprice past orders |
| **Immutable Tracking Log** | `TrackingEvent` is append-only. No UPDATE paths exist in any service |
| **Atomic Agent Assignment** | Prisma `$transaction` re-verifies agent availability before committing to prevent race conditions |
| **Workload Metric** | Agents with ≥8 active orders are hard-excluded from assignment regardless of proximity |
| **Non-blocking Notifications** | Email/SMS fires outside the DB transaction — a Twilio timeout never rolls back a DELIVERED status |
| **Self-referential Order** | Failed orders spawn a child Order with `parentOrderId` — full rescheduling chain is queryable |

---

## Running with Docker (Optional)

```bash
# Start PostgreSQL only
docker run --name lastmile-pg \
  -e POSTGRES_DB=lastmile_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15-alpine
```

Then set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lastmile_db` in your `.env`.

---

## License

MIT — built as a technical assessment project.
