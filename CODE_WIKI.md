# Code Wiki

## 1. Repository Overview

This repository currently contains two separate Node-based projects:

- `aiesec-dashboard`: the main application, implemented as a Next.js 16 dashboard for AIESEC LC Tunis operations.
- `aiesec-dashboard-backend`: a backend package scaffold with dependencies declared, but no server source files checked into the repository yet.

In practice, the frontend project contains nearly all business logic and user-facing functionality. The dashboard is a client-heavy analytics and operations workspace built on top of a TailAdmin template and adapted for AIESEC use cases such as:

- digital attraction lead tracking
- physical attraction lead tracking
- conversion-rate analytics
- university-based reporting
- attraction calendar and weekly timeline planning
- social media post booking

---

## 2. High-Level Architecture

### 2.1 Architectural Style

The main application uses the Next.js App Router with a nested dashboard layout:

- root application shell in `src/app/layout.tsx`
- dashboard shell in `src/app/dashboard/layout.tsx`
- route pages in `src/app/dashboard/*/page.tsx`
- reusable UI and feature widgets in `src/components/*`
- shared layout state in `src/context/*`
- static business data and analytics helpers in `src/data/*` and `src/lib/*`

The runtime model is mostly:

1. Next.js resolves the route through the App Router.
2. The root layout applies global CSS, fonts, theme state, and sidebar state.
3. Dashboard routes render inside a shared admin shell with a sidebar and header.
4. Pages read static JSON datasets through helper functions instead of calling a remote API.
5. Some user-managed features persist local state in `localStorage`.

### 2.2 Architecture Diagram

```text
Repository Root
|- aiesec-dashboard/
|  |- src/app/                # Next.js routes and layouts
|  |- src/components/         # reusable UI + dashboard widgets
|  |- src/context/            # theme/sidebar global client state
|  |- src/layout/             # AppHeader, AppSidebar, Backdrop
|  |- src/lib/                # lead aggregation and parsing helpers
|  |- src/data/               # JSON datasets + conversion analytics
|  |- scripts/                # CSV -> JSON conversion utilities
|  \- public/                 # logos, icons, images, video
|
\- aiesec-dashboard-backend/
   \- package.json            # dependency scaffold only
```

### 2.3 Frontend Runtime Flow

```text
User Request
  -> src/app/layout.tsx
     -> ThemeProvider
     -> SidebarProvider
  -> src/app/page.tsx or src/app/dashboard/*
     -> src/app/dashboard/layout.tsx
        -> AppSidebar
        -> AppHeader
        -> selected dashboard page
           -> components + data helpers
              -> src/lib/dataUtils.ts
              -> src/data/stats.ts
              -> static JSON files in src/data
```

---

## 3. Repository Responsibilities

## 3.1 `aiesec-dashboard`

Primary responsibilities:

- render the AIESEC operations dashboard
- expose route-based dashboard pages
- compute summary KPIs and conversion metrics
- visualize static imported datasets
- persist lightweight user planning data in `localStorage`

## 3.2 `aiesec-dashboard-backend`

Current responsibilities:

- none implemented in source form yet

Observed state:

- `package.json` declares `express`, `express-session`, `dotenv`, and `googleapis`
- there is no `index.js`, `src/`, route file, or server entry present
- the backend should currently be treated as a planned or incomplete package scaffold

---

## 4. Frontend Application Structure

## 4.1 App Entry Points

### `src/app/layout.tsx`

Root layout responsibilities:

- imports global styles and Flatpickr CSS
- loads the Google Outfit font
- wraps the app in `ThemeProvider`
- wraps the app in `SidebarProvider`

This file is the top-level composition point for all routes.

### `src/app/page.tsx`

Landing page responsibilities:

- displays a fullscreen welcome video
- redirects users to `/dashboard` on click using the Next.js router

This page acts as a branded splash screen rather than a content-heavy homepage.

### `src/app/dashboard/layout.tsx`

Dashboard layout responsibilities:

- consumes sidebar state from `SidebarContext`
- renders the persistent admin shell
- mounts `AppSidebar`, `Backdrop`, and `AppHeader`
- shifts the main content area based on sidebar expanded, hovered, or mobile-open state

This is the shared layout for all `/dashboard/*` routes.

---

## 4.2 Route Map

| Route | File | Responsibility |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Welcome page with video-based entry |
| `/dashboard` | `src/app/dashboard/page.tsx` | Main KPI and analytics overview |
| `/dashboard/universities` | `src/app/dashboard/universities/page.tsx` | University-level lead reporting |
| `/dashboard/digital-attraction` | `src/app/dashboard/digital-attraction/page.tsx` | Digital lead table and university conversion view |
| `/dashboard/physical-attraction` | `src/app/dashboard/physical-attraction/page.tsx` | Physical lead table and university conversion view |
| `/dashboard/timeline` | `src/app/dashboard/timeline/page.tsx` | Weekly Monday-Friday attraction timeline |
| `/dashboard/calendar` | `src/app/dashboard/calendar/page.tsx` | Interactive calendar with saved custom events |
| `/dashboard/ranking` | `src/app/dashboard/ranking/page.tsx` | Ranking page for physical member performance |
| `/dashboard/booking-post` | `src/app/dashboard/booking-post/page.tsx` | Social media post slot booking interface |
| `/dashboard/leads` | `src/app/dashboard/leads/page.tsx` | Redirects to digital attraction |

Notes:

- `src/app/not-found.tsx` provides a custom 404 page.
- No API routes, `middleware.ts`, or server actions are present in the repository.

---

## 5. Major Modules And Responsibilities

## 5.1 `src/layout`

### `AppSidebar.tsx`

Responsibilities:

- defines the dashboard navigation model
- highlights the active route with `usePathname()`
- supports collapsed, expanded, hovered, and mobile states
- renders AIESEC branding and grouped menu sections

Important internal concepts:

- `navItems`: primary dashboard navigation entries
- `othersItems`: placeholder management routes such as `/team`, `/resources`, and `/goals`
- `openSubmenu` and `subMenuHeight`: submenu state and animation data

Observation:

- The `othersItems` routes do not currently exist under `src/app`, so those links are placeholders.

### `AppHeader.tsx`

Responsibilities:

- toggles desktop and mobile sidebar visibility
- renders the top navigation bar
- contains theme controls and user/notification dropdowns

### `Backdrop.tsx`

Responsibilities:

- shows a mobile overlay when the sidebar is open
- closes the sidebar when clicked

---

## 5.2 `src/context`

### `SidebarContext.tsx`

Responsibilities:

- stores sidebar expansion state
- stores mobile open state
- stores hover state used by the collapsed sidebar behavior
- exposes setters and a `useSidebar()` hook

Why it matters:

- the entire dashboard shell depends on this context for layout responsiveness

### `ThemeContext.tsx`

Responsibilities:

- stores current theme state
- persists the theme to `localStorage`
- toggles the `dark` class on `document.documentElement`

Why it matters:

- it centralizes dark/light mode behavior for the entire application

---

## 5.3 `src/components`

### `src/components/ui`

This is the reusable design-system layer.

Examples:

- `button/Button.tsx`
- `badge/Badge.tsx`
- `dropdown/Dropdown.tsx`
- `modal/index.tsx`
- `table/index.tsx`
- `avatar/*`
- `alert/Alert.tsx`

Responsibilities:

- provide reusable styling primitives
- keep feature pages and widgets visually consistent
- reduce duplicated markup patterns

### `src/components/common`

Responsibilities:

- provide generic page-support widgets such as breadcrumbs and theme toggles

Examples:

- `PageBreadCrumb.tsx`
- `ThemeToggleButton.tsx`
- `ComponentCard.tsx`

### `src/components/dashboard`

Responsibilities:

- provide conversion analytics widgets used across dashboard pages

Key files:

- `DashboardConversionOverview.tsx`
- `ConversionStats.tsx`

### `src/components/ecommerce`

Despite the folder name, this is the main dashboard analytics widget layer for the AIESEC app.

Key files:

- `EcommerceMetrics.tsx`
- `StatisticsChart.tsx`
- `MonthlyTarget.tsx`
- `MonthlySalesChart.tsx`
- `RecentOrders.tsx`
- `DemographicCard.tsx`

### `src/components/header`

Responsibilities:

- profile and notification menu UI

Key files:

- `NotificationDropdown.tsx`
- `UserDropdown.tsx`

### `src/components/tables`

Responsibilities:

- reusable table-based views and pagination helpers

Key files:

- `BasicTableOne.tsx`
- `Pagination.tsx`

---

## 5.4 `src/lib`

This folder contains lead parsing and aggregation helpers used by multiple pages and widgets.

Key files:

- `dataUtils.ts`
- `dataParser.ts`
- `data.ts`
- `dataService.ts`

Important note:

- `dataUtils.ts` appears to be the active helper layer used by the current dashboard.
- `data.ts` and `dataService.ts` contain overlapping logic and look like earlier or parallel implementations.

### `dataUtils.ts`

Responsibilities:

- expose raw digital and physical lead datasets
- compute chart series for monthly, weekly, and daily lead activity
- compute dashboard KPI cards
- compute university ranking data
- provide backward-compatible exports for older imports

---

## 5.5 `src/data`

This folder contains static JSON business datasets and conversion analytics helpers.

Key files:

- `digitalLeads.json`
- `physicalAttraction.json`
- `digitalConversionSignups.json`
- `physicalConversionSignups.json`
- `stats.ts`

### `stats.ts`

Responsibilities:

- define conversion-related types
- expose conversion KPI reducers
- build physical member and digital referral rankings
- compute university-level application and approval rates
- format rates for UI display

---

## 5.6 `scripts`

This folder contains one-off ETL and verification scripts.

Key files:

- `parse-csv.mjs`
- `convert-conversion-csv.mjs`
- `verify-stats.mjs`
- `analyze-csv.mjs`

Responsibilities:

- convert CSV exports into JSON files under `src/data`
- verify that conversion totals and rankings match expectations

---

## 6. Key Functions And Components

This repository contains very few classes. Most important units are React function components and TypeScript utility functions.

## 6.1 Core Data Functions

### In `src/lib/dataUtils.ts`

#### `getDigitalLeads()`

- returns the digital lead dataset typed as `Lead[]`
- source: `src/data/digitalLeads.json`

#### `getPhysicalAttractionLeads()`

- returns the physical attraction dataset typed as `PhysicalAttractionLead[]`
- source: `src/data/physicalAttraction.json`

#### `getLeadSeriesMonthly()`

- aggregates digital and physical leads by month
- returns chart-ready categories plus per-channel series

#### `getLeadSeriesWeekly()`

- aggregates by week
- limits output to the most recent 12 weeks with activity

#### `getLeadSeriesDaily()`

- aggregates by day
- limits output to the most recent 30 active days

#### `getDashboardStats()`

- computes the headline dashboard metrics
- returns totals for leads, successful accounts, existing accounts, universities, internship categories, recent leads, and current time-window counts

#### `getUniversityStats()`

- groups digital leads by university
- returns lead and success counts sorted by total volume

#### `getTopUniversities(n = 10)`

- merges digital and physical lead counts
- returns top universities with both full and shortened names

#### `getWeeklyLeadCounts()`

- derives weekly lead totals from digital leads

#### `getCurrentWeekLeads()`

- returns the current week lead count

## 6.2 Conversion Analytics Functions

### In `src/data/stats.ts`

#### `isApproved(approved)`

- normalizes approval status values
- returns `true` when the status is logically `Yes`

#### `isApplied(applied)`

- normalizes application flag values
- returns `true` when the application flag is logically `Yes`

#### `getConversionStats(signups)`

- base reducer for conversion analytics
- calculates `total`, `approved`, `applied`, `rejected`, `noApplication`, `conversionRate`, and `applicationRate`

#### `getGlobalConversionStats()`

- computes conversion KPIs across physical and digital signups combined

#### `getPhysicalConversionStats()`

- computes KPIs for physical signups only

#### `getDigitalConversionStats()`

- computes KPIs for digital signups only

#### `getPhysicalMemberRankings(limit?)`

- groups physical signups by `memberName`
- returns leaderboard-style ranking entries

#### `getDigitalReferralRankings(limit?)`

- groups digital signups by referral source
- returns referral performance rankings

#### `getPhysicalUniversityStats()`

- groups physical signups by university
- returns total leads, applications, approvals, and derived rates

#### `getDigitalUniversityStats()`

- groups digital signups by university
- returns total leads, applications, approvals, and derived rates

#### `getGlobalApprovalRankings(limit = 10)`

- merges physical-member and digital-referral rankings into a unified home dashboard leaderboard

#### `formatRate(rate)` and `formatConversionRate(rate)`

- convert numeric percentages into formatted strings for display

## 6.3 Key Feature Components

### `src/components/dashboard/ConversionStats.tsx`

#### `ConversionRateCard`

Responsibilities:

- display approval/application metrics in a consistent card format
- render stat pills for totals and sub-counts

#### `ApprovalRankingTable`

Responsibilities:

- display rankings for members, referrals, or combined channels
- optionally show a channel badge
- standardize ranking table structure across pages

### `src/components/ecommerce/EcommerceMetrics.tsx`

Responsibilities:

- render top-level KPI cards on the dashboard homepage
- consume `getDashboardStats()` for totals and account health metrics

### `src/app/dashboard/calendar/page.tsx`

Main page responsibilities:

- render a FullCalendar-based scheduling view
- transform physical attraction leads into calendar events
- load and save custom events through `localStorage`
- allow add/edit/delete behavior for custom events through `AttractionModal`

Important internal units:

- `AttractionModal`: local modal for adding or editing custom attraction events
- `handleDateClick()`: opens the modal for new events
- `handleEventClick()`: edits custom events or shows lead details for imported events
- `handleSaveEvent()`: persists custom events in local state

### `src/app/dashboard/timeline/page.tsx`

Responsibilities:

- build a Monday-Friday visual schedule for the current week
- merge physical leads with saved custom calendar events
- render day cards that distinguish current, past, and future items

### `src/app/dashboard/booking-post/page.tsx`

Responsibilities:

- manage simple calendar-based booking of post slots
- persist bookings in `localStorage`
- provide availability and cancellation logic

Important internal functions:

- `isSlotBooked()`
- `handleBook()`
- `handleCancel()`
- `handleDateSelect()`
- `renderCalendar()`

### `src/app/dashboard/digital-attraction/page.tsx`

Responsibilities:

- render digital conversion summary metrics
- switch between lead-table and university-table views
- support searching, filtering, sorting, and pagination

Important implementation details:

- reads `getDigitalConversionStats()` from `src/data/stats.ts`
- reads `getDigitalLeads()` from `src/lib/dataUtils.ts`
- computes internship types dynamically for filter controls

### `src/app/dashboard/physical-attraction/page.tsx`

Responsibilities:

- render physical conversion summary metrics
- switch between lead-table and university-table views
- support searching, filtering, sorting, and pagination

Important implementation details:

- reads `getPhysicalConversionStats()` from `src/data/stats.ts`
- reads `getPhysicalAttractionLeads()` from `src/lib/dataUtils.ts`
- filters by university level in addition to text search and account status

---

## 7. Data Model Summary

## 7.1 Lead Data

### Digital lead shape

Defined in `src/lib/dataUtils.ts` as `Lead`.

Important fields:

- `submittedAt`
- `firstName`
- `lastName`
- `phone`
- `email`
- `university`
- `internshipType`
- `referral`
- `volunteering`
- `professional`
- `teaching`
- `accountStatus`

### Physical attraction lead shape

Defined in `src/lib/dataUtils.ts` as `PhysicalAttractionLead`.

Important fields:

- `submittedAt`
- `firstName`
- `lastName`
- `email`
- `university`
- `universityLevel`
- `fieldOfStudy`
- `internshipType`
- `referral`
- `memberName`
- `hackathonInterest`
- `accountStatus`

## 7.2 Conversion Signup Data

Defined in `src/data/stats.ts`.

Important types:

- `ConversionSignup`
- `PhysicalConversionSignup`
- `RankingEntry`
- `ConversionStats`

---

## 8. Dependency Relationships

## 8.1 External Dependencies

Main frontend dependencies from `aiesec-dashboard/package.json`:

- `next`, `react`, `react-dom`
- `tailwindcss`, `@tailwindcss/postcss`
- `@fullcalendar/*`
- `apexcharts`, `react-apexcharts`
- `flatpickr`
- `papaparse`
- `react-dnd`, `react-dropzone`
- `swiper`

Configuration-level dependency notes:

- `next.config.ts` adds `@svgr/webpack` support for importing SVGs as components
- `tsconfig.json` maps `@/*` to `src/*`

Backend dependency declarations:

- `express`
- `express-session`
- `dotenv`
- `googleapis`

## 8.2 Internal Dependency Flow

### UI flow

```text
Routes in src/app/dashboard/*
  -> shared shell in src/app/dashboard/layout.tsx
  -> layout widgets in src/layout/*
  -> feature widgets in src/components/*
  -> UI primitives in src/components/ui/*
```

### Data flow

```text
CSV exports
  -> scripts/parse-csv.mjs
  -> scripts/convert-conversion-csv.mjs
  -> JSON files in src/data/
  -> src/lib/dataUtils.ts
  -> src/data/stats.ts
  -> dashboard pages and widgets
```

### Local persistence flow

```text
ThemeContext.tsx -> localStorage["theme"]
calendar/page.tsx -> localStorage["customCalendarEvents"]
timeline/page.tsx -> reads localStorage["customCalendarEvents"]
booking-post/page.tsx -> localStorage["postBookings"]
```

## 8.3 Coupling Notes

Important dependencies worth noting:

- `digital-attraction/page.tsx` depends on both raw lead helpers and conversion helpers
- `physical-attraction/page.tsx` mirrors the digital page with a similar UI structure
- `calendar/page.tsx` and `timeline/page.tsx` are coupled through the shared `customCalendarEvents` local storage key
- `EcommerceMetrics.tsx` depends on `getDashboardStats()`
- `DashboardConversionOverview.tsx` depends on `src/data/stats.ts` ranking helpers

---

## 9. Running The Project

## 9.1 Frontend: `aiesec-dashboard`

Prerequisites:

- Node.js 18+ recommended
- npm available

Install:

```bash
cd aiesec-dashboard
npm install
```

Run development server:

```bash
npm run dev
```

Alternative dev server:

```bash
npm run dev:turbo
```

Build production bundle:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

Run lint:

```bash
npm run lint
```

Notes:

- the application uses static imported JSON, so no API server is required for the current checked-in functionality
- SVG imports are handled via SVGR through `next.config.ts`

## 9.2 Backend: `aiesec-dashboard-backend`

Install dependencies:

```bash
cd aiesec-dashboard-backend
npm install
```

Current limitation:

- there is no runnable server entry point checked into the repository
- `npm test` intentionally exits with an error placeholder
- the backend cannot be started meaningfully until server files are added

---

## 10. Notable Gaps, Risks, And Maintenance Notes

## 10.1 Duplicate Data Helper Layers

There is visible overlap between:

- `src/lib/dataUtils.ts`
- `src/lib/data.ts`
- `src/lib/dataService.ts`

Impact:

- increases the chance of inconsistent behavior
- makes it harder to know which helper module is authoritative

Recommendation:

- consolidate active logic into a single supported data-access layer

## 10.2 Script And Dataset Naming Drift

`scripts/parse-csv.mjs` writes `ogxLeads.json`, while the active app imports `digitalLeads.json`.

Impact:

- new contributors may regenerate data into a file the app no longer consumes

Recommendation:

- align script output names with the actual app import names

## 10.3 Attraction Pages Share Similar UI Logic

`digital-attraction/page.tsx` and `physical-attraction/page.tsx` implement very similar:

- summary cards
- lead/university toggle views
- filters
- tables
- pagination patterns

Impact:

- changes must be duplicated
- styling and behavior can drift over time

Recommendation:

- extract shared filter bars, stat cards, and data-table wrappers into reusable components
- this is the cleanest place to make the "Digital Attraction" and "Physical Attractions" sections more organized and consistent

## 10.4 Backend Is Incomplete

The backend package advertises a future integration path through Express and Google APIs, but no implementation exists in the repository.

Impact:

- documentation and onboarding should not imply live backend features yet

---

## 11. Suggested Onboarding Path

For a new developer, the fastest way to understand the project is:

1. Read `aiesec-dashboard/package.json` and `next.config.ts`.
2. Read `src/app/layout.tsx` and `src/app/dashboard/layout.tsx`.
3. Inspect `src/layout/AppSidebar.tsx` to understand available features.
4. Read `src/lib/dataUtils.ts` and `src/data/stats.ts`.
5. Open `src/app/dashboard/page.tsx`, then the digital and physical attraction pages.
6. Review `scripts/` to understand how the static datasets are generated.

---

## 12. Summary

This repository is centered around a Next.js operations dashboard that uses static datasets and client-side analytics helpers to support AIESEC lead management, attraction tracking, conversion analysis, and lightweight planning tools. The frontend is functional and structured around App Router layouts, reusable UI modules, and data helper utilities. The backend exists only as a package scaffold at the moment. The main architectural cleanup opportunity is to consolidate duplicated data helpers and abstract the repeated logic shared by the digital and physical attraction pages.
