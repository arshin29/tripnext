# TripNext

> **Every journey, thoughtfully planned.**

TripNext is a full-stack, editorial travel planning and collaborative itinerary platform designed for travelers, couples, and group adventurers who want to curate journeys with clarity, style, and precision. It combines authentic destination inspiration, day-by-day scheduling, interactive OpenStreetMap cartography, shared expense budgeting in Indian Rupees (INR), companion suggestions with voting, and an AI Travel Concierge powered by Google Gemini.

---

## Feature Highlights

- **Authentication & User Profiles:** Secure JWT authentication via HttpOnly cookies, Bcrypt password hashing, route guards for authenticated and guest-only views, and profile management.
- **Destination Discovery & Wishlist:** 24 hand-curated global destinations featuring authentic editorial photography, regional travel facts, interactive maps, category filtering, search, and personal bookmarking (wishlist).
- **Journey Dashboard & Itinerary Planning:** Image-led travel dashboard with a Next Departure split hero, multi-trip management, and detailed day-by-day itinerary canvas with chronological time-period indicators (Morning, Afternoon, Evening, Flexible), stop completion checkboxes, and drag/order controls.
- **Interactive Leaflet / OpenStreetMap Cartography:** Dynamic itinerary map canvas displaying daily numbered pins, route polylines, and bidirectional timeline-to-map synchronization across Split, List, and Full Map viewing modes.
- **Collaborative Planning & Companion Voting:** Role-based trip access (Owner, Editor, Viewer), tokenized invite links, companion activity proposals, and voting system to resolve group choices democratically.
- **Shared Expenses & Budget Tracking:** Interactive expense logging, budget tracking formatted in Indian Rupees (INR / `₹`), category breakdowns, equal splits, and balance settlement calculations.
- **AI Travel Concierge (Google Gemini):** AI-powered itinerary generation tailored by trip theme (Relaxed, Adventure, Cultural, Foodie, Balanced), budget tier, and pacing. Includes a structured **review-before-import workbench** to preview, customize, or reject AI proposals before adding them, backed by an offline curated fallback concierge.
- **Protected Nominatim Geocoding Proxy:** Centralized backend geocoding service via OpenStreetMap Nominatim with an in-memory queue enforcing a minimum 1.1s rate-limit interval, server-side caching, and query sanitization to protect user privacy and respect OSM usage policies.

---

## Architecture Overview

TripNext is built as a high-performance monorepo powered by **Turborepo 2.x** and **npm workspaces**.

```
TripNext/
├── apps/
│   ├── web/                     # Next.js 14 App Router frontend (Port 3001)
│   └── api/                     # NestJS 10 backend API & Prisma ORM (Port 4001)
├── packages/
│   └── shared/                  # Shared TypeScript types, contracts & constants
├── scripts/
│   └── set-gemini-key.ps1       # Masked interactive helper for Gemini API key setup
├── package.json                 # Monorepo workspaces & root scripts
├── turbo.json                   # Turborepo task pipeline configuration
└── README.md                    # Project documentation
```

### Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet, Geist typography |
| **Backend** | NestJS 10, Express, TypeScript, ConfigModule, ValidationPipe, Class Validator / Transformer, cookie-parser, bcryptjs |
| **Database & ORM** | PostgreSQL 16 (Local), Prisma ORM 5.x, automated SQL migrations |
| **AI & External APIs** | Google Gemini API (`@google/genai`), OpenStreetMap / Nominatim geocoding proxy, Unsplash imagery |
| **Monorepo Engine** | Turborepo 2.x, npm workspaces, Prettier, ESLint |
| **Testing** | Jest, ts-jest, Supertest (149 passing unit and E2E tests) |

---

## Design System & Palette

TripNext avoids generic admin dashboard aesthetics, purple gradients, and glassmorphism in favor of a warm, refined editorial travel atelier design.

| Token | Value | Role |
|---|---|---|
| **Background** | `#F7F5F0` | Warm, calming page backdrop |
| **Surface** | `#FFFFFF` | Editorial cards and elevated containers |
| **Primary Text** | `#252A25` | Deep mossy charcoal for crisp legibility |
| **Secondary Text** | `#85877F` | Subtle muted captions and metadata |
| **Accent** | `#66836B` | Refined sage green for key actions |
| **Accent Background** | `#EAF0E9` | Soft sage tint for badges and icons |
| **Border** | `#E9E7E0` | Delicate warm border lines |

---

## Getting Started

### Prerequisites

- **Node.js**: v20+ (tested on v24.11.1)
- **npm**: v10+ (tested on v11.6.2)
- **PostgreSQL 16**: Installed locally and running on `localhost:5432` with a database named `tripnest`

### 1. Installation

Install all monorepo dependencies across all workspaces:

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment files:

```bash
# Root environment
cp .env.example .env

# Web application
cp apps/web/.env.example apps/web/.env.local

# API application
cp apps/api/.env.example apps/api/.env
```

#### Database Configuration
Configure `DATABASE_URL` in `apps/api/.env` with your local PostgreSQL password:

```env
DATABASE_URL="postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/tripnest?schema=public"
```

#### Google Gemini API Key (Optional)
To enable the live AI Travel Concierge, add your Gemini API key to `apps/api/.env`:

```env
GEMINI_API_KEY="your-gemini-api-key"
```

*Tip (Windows PowerShell):* You can also run the masked interactive helper script to set your key without printing it in console history:

```powershell
.\scripts\set-gemini-key.ps1
```

If no Gemini API key is configured, TripNext automatically engages its built-in curated fallback concierge so recommendations continue working seamlessly.

### 3. Database Initialization & Seeding

Generate the Prisma client:

```bash
npm run db:generate
```

Run schema migrations:

```bash
npm run db:migrate
```

Seed the database with 24 curated travel destinations, attractions, and verified coordinates:

```bash
npm run db:seed
```

### 4. Running the Development Environment

Start both the frontend and backend concurrently via Turborepo:

```bash
npm run dev
```

- **Frontend application:** [http://localhost:3001](http://localhost:3001)
- **Backend API:** [http://localhost:4001/api](http://localhost:4001/api)
- **Health check endpoint:** [http://localhost:4001/api/health](http://localhost:4001/api/health)

*(Note: TripNext uses ports 3001 and 4001 to operate cleanly alongside other local services.)*

---

## Monorepo Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts web application (port 3001) and API (port 4001) concurrently |
| `npm run build` | Builds all packages and applications via Turborepo |
| `npm run lint` | Runs ESLint across all workspaces (0 warnings, 0 errors) |
| `npm run test` | Runs all unit and integration test suites |
| `npm run format` | Formats all code with Prettier |
| `npm run format:check` | Verifies code formatting without writing changes |
| `npm run db:generate` | Generates the Prisma client from `schema.prisma` |
| `npm run db:migrate` | Runs Prisma schema migrations |
| `npm run db:seed` | Seeds curated destinations and imagery |
| `npm run db:studio` | Launches Prisma Studio GUI |

---

## Testing & Quality Assurance

TripNext enforces rigorous automated testing and linting across all packages:

```bash
npm run test
```

### Verified Test Results

- **Web Frontend (`@tripnest/web`):** 2 test suites, **24 / 24 tests passed**
  - Geocoding Nominatim proxy client & error fallback tests
  - Concierge proposal review, edit, reject, and import workflow tests
- **API Backend (`@tripnest/api`):** 18 test suites, **125 / 125 tests passed**
  - Authentication, JWT cookies, profile management, and guards
  - Trips CRUD, memberships, invitations, and collaborator permissions
  - Itinerary day management, activity reordering, and completion toggles
  - Companion activity suggestions, voting tally, and status transitions
  - Expense split calculations and settlement balances
  - Protected Nominatim geocoding proxy (rate-limiting queue, cache, upstream timeout handling)
  - Google Gemini AI service and offline curated fallback concierge
- **Total Test Suite:** 20 test suites, **149 / 149 tests passing**
- **Code Quality:** ESLint clean (0 warnings, 0 errors), TypeScript clean (`tsc --noEmit` exits with 0).

---

## Completed Milestones

- [x] **Milestone 1**: Project Foundation & Monorepo Architecture (Turborepo 2.x, Next.js 14, NestJS 10, Prisma, PostgreSQL 16, `@tripnest/shared`)
- [x] **Milestone 2**: Authentication & User Profiles (Argon2/Bcrypt password hashing, HttpOnly JWT cookies, protected route guards, profile updates)
- [x] **Milestone 3**: Dashboard & Navigation (Editorial Travel Atelier layout, Next Departure split hero centerpiece, stats strip, Curated Inspiration lookbook, mobile navigation)
- [x] **Milestone 4**: Destination Discovery & Day-by-Day Itineraries (24 authentic destinations, full-bleed gallery lightbox, interactive Leaflet timeline maps, activity scheduling)
- [x] **Milestone 5**: Collaborative Planning (Role-based access, invitation tokens, companion activity proposals, and voting system)
- [x] **Milestone 6**: Shared Expenses & Settlement (INR budget tracking, equal expense splits, and settlement calculations)
- [x] **Milestone 7**: AI Travel Concierge & Cartography (Google Gemini AI recommendation engine, review-before-import workbench, curated fallback concierge, protected Nominatim geocoding proxy)
- [x] **Milestone 8**: Visual Polish & Editorial Design Refinement (INR currency standardization, Table Mountain imagery audit, Dribbble-inspired editorial layout rhythm across all 5 core routes)
