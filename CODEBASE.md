# AIESEC Dashboard - Codebase Documentation

## Project Overview

This is a custom-built AIESEC dashboard application built on Next.js 16, React 19, TypeScript, and Tailwind CSS. It provides two distinct dashboards:

1. **Admin Dashboard** (`/dashboard`) - For AIESEC administrators to manage leads, opportunities, attractions, and analytics
2. **Member Dashboard** (`/member-dashboard`) - For AIESEC members to access resources, sales information, rankings, and real-time attraction progress

### Key Features

- **Real-time Lead Tracking**: Google Sheets integration for live physical attraction leads
- **University-Specific Rankings**: Per-university lead counting with support for multiple simultaneous attractions
- **Attraction Management**: Schedule and manage physical attractions with automatic cleanup after one week
- **Member Performance**: Real-time leaderboards with 30-second polling
- **Cross-Device Sync**: Data persisted in Google Sheets with cache invalidation
- **Source Label Filtering**: Ranking excludes non-person entries (e.g., "Facebook", "Instagram")

## Technology Stack

- **Framework:** Next.js 16.1.6 (App Router)
- **UI Library:** React 19.2.0
- **Language:** TypeScript 5.9.3
- **Styling:** Tailwind CSS 4.1.17
- **Charts:** ApexCharts 4.7.0
- **Calendar:** FullCalendar 6.1.19
- **Maps:** @react-jvectormap
- **Icons:** Custom SVG icons + Lucide React
- **Build:** Turbopack (production), Webpack (dev)
- **Google Sheets API:** googleapis for real-time data synchronization

## Architecture Pattern

The application follows Next.js App Router architecture with:
- **Server Components** for data fetching and SEO
- **Client Components** for interactivity and state management
- **Dynamic imports** for heavy chart libraries
- **Context API** for global state (Auth, Sidebar, Theme)

## Directory Structure

```
aiesec-dashboard/
├── public/                    # Static assets (images, logos)
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── dashboard/         # Admin dashboard routes
│   │   ├── member-dashboard/ # Member dashboard routes
│   │   ├── layout.tsx         # Root layout with global providers
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable UI components
│   │   ├── auth/             # Authentication components
│   │   ├── common/           # Shared components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   ├── ecommerce/        # E-commerce/chart components
│   │   ├── header/           # Header components
│   │   ├── tables/           # Table components
│   │   └── ui/               # Base UI components (buttons, badges, etc.)
│   ├── context/              # React contexts for global state
│   ├── data/                 # Static JSON data files
│   ├── hooks/                # Custom React hooks
│   ├── icons/                # SVG icon files
│   ├── layout/               # Layout components (Header, Sidebar)
│   └── lib/                  # Utility functions
├── next.config.ts            # Next.js configuration
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

## File Responsibilities

### Root Configuration Files

- **`next.config.ts`** - Next.js configuration
  - SVG to React component transformation (webpack + turbopack)
  - Production source maps enabled
  - Turbopack configuration

- **`package.json`** - Project dependencies and scripts
  - `npm run dev` - Development server with Webpack
  - `npm run dev:turbo` - Development server with Turbopack
  - `npm run build` - Production build
  - `npm run start` - Production server

- **`tsconfig.json`** - TypeScript configuration

### `src/app/` - App Router Pages

#### Root Layout & Pages

- **`layout.tsx`** - Root layout component
  - Wraps entire application with AuthContext, SidebarContext, ThemeContext
  - Includes AppHeader and AppSidebar
  - Global CSS imports
  - **Note:** Uses "use client" directive for global state management

- **`page.tsx`** - Landing page
  - Thin server component that renders LandingPageClient
  - Exports `dynamic = 'force-dynamic'` to prevent static optimization

- **`LandingPageClient.tsx`** - Landing page client component
  - Hero video with click-to-enter functionality
  - Navigation to `/member-dashboard`

- **`globals.css`** - Global Tailwind CSS styles
  - Custom CSS variables
  - Dark mode styles
  - Utility class extensions

#### `src/app/api/` - API Routes

- **`attraction-leads/route.ts`** - Attraction leads API
  - Fetches physical leads from Google Sheets
  - Computes statistics: total, today, this week, this month
  - Groups by university and month
  - Returns recent leads (last 20)
  - Cached for 2 minutes with `unstable_cache`
  - Supports `?nocache=1` to bypass cache

- **`ranking/route.ts`** - Member ranking API
  - Fetches physical leads from Google Sheets
  - Filters by university with `?university=` parameter (fuzzy match)
  - Excludes source labels (Facebook, Instagram, etc.)
  - Counts leads per member with date cutoff
  - Optional EXPA status lookup with `?expa=0` to skip
  - Caches EXPA lookups for 15 minutes
  - Returns: total leads, today's leads, applied, realized counts

- **`scheduled-attractions/route.ts`** - Attraction management API
  - GET: Loads all scheduled attractions from Google Sheets
  - POST: Saves new attraction to Google Sheets
  - DELETE: Removes attraction by ID from Google Sheets
  - Revalidates cache tags on mutations

- **`leads/physical/route.ts`** - Physical leads API
  - Fetches raw physical leads from Google Sheets
  - Error handling for permission issues

- **`expa/leads/route.ts`** - EXPA leads API (legacy)
  - Previously used for EXPA lead statistics
  - Now superseded by attraction-leads API

- **`expa/applications/route.ts`** - EXPA applications API
  - Fetches application statuses for leads
  - Used by ranking API for applied/realized counts

- **`opportunities/route.ts`** - Opportunities API
  - GET: Loads opportunities from Google Sheets
  - POST: Saves opportunity to Google Sheets

- **`submissions/route.ts`** - Form submissions API
  - Handles form submissions for opportunities

#### `src/app/dashboard/` - Admin Dashboard

- **`layout.tsx`** - Admin dashboard layout
  - Sidebar navigation for admin pages
  - Breadcrumb navigation
  - Page-specific content rendering

- **`page.tsx`** - Admin dashboard home
  - Thin server component rendering DashboardClient
  - Exports `dynamic = 'force-dynamic'`

- **`DashboardClient.tsx`** - Admin dashboard client component
  - Fetches attraction leads from `/api/attraction-leads`
  - KPI cards (total leads, universities, top university, weekly leads)
  - Recent leads table from Google Sheets
  - Lead statistics charts (monthly, by university, time periods)
  - Auto-refreshes every 2 minutes

- **`attraction-management/page.tsx`** - Attraction management page
  - Thin server component rendering AttractionPageClient
  - Exports `dynamic = 'force-dynamic'`

- **`attraction-management/AttractionPageClient.tsx`** - Attraction management client component
  - Create/delete attractions with university, date, goal, and notes
  - Calendar view with FullCalendar
  - University logo display
  - Toast notifications for actions
  - Cross-device sync via custom events

- **`leads/page.tsx`** - Leads management page
  - Thin server component rendering LeadsClient
  - Exports `dynamic = 'force-dynamic'`

- **`LeadsClient.tsx`** - Leads management client component
  - Lead filtering and search
  - Lead table with status indicators

- **Subdirectories** (each follows pattern: `page.tsx` + `*Client.tsx`):
  - `digital-attraction/` - Digital attraction analytics
  - `calendar/` - Calendar view with FullCalendar
  - `conversion-rate/` - Conversion rate tracking
  - `opportunities/` - Opportunity management
  - `physical-attraction/` - Physical attraction analytics
  - `ranking/` - University rankings
  - `universities/` - University management

#### `src/app/member-dashboard/` - Member Dashboard

- **`layout.tsx`** - Member dashboard layout
  - Sidebar navigation for member pages
  - Different from admin layout (member-specific navigation)
  - Backdrop component for mobile sidebar

- **`page.tsx`** - Member dashboard home
  - Thin server component rendering MemberDashboardClient
  - Exports `dynamic = 'force-dynamic'`

- **`MemberDashboardClient.tsx`** - Member dashboard client component
  - Displays today's attractions with tab switcher for multiple attractions
  - Per-university lead counting (each attraction shows only its university's leads)
  - Real-time leaderboard with 30-second polling from `/api/ranking?university=`
  - Goal progress tracking with percentage
  - Fallback to static data when live API unavailable
  - Animal avatar assignment for members

- **`sales/page.tsx`** - Sales page
  - Thin server component rendering SalesClient
  - Exports `dynamic = 'force-dynamic'`

- **`SalesClient.tsx`** - Sales page client component
  - University cards grouped by product (GTa, GTe, GV)
  - Click-through to university details

- **`sales/[id]/page.tsx`** - University details page (dynamic route)
  - Thin server component rendering UniversityDetailsClient
  - Exports `dynamic = 'force-dynamic'`

- **`UniversityDetailsClient.tsx`** - University details client component
  - University information and sales speech
  - Opportunity cards with expand/collapse
  - "Fill Form" modal for EP name and note
  - Text size animation on expand

- **`resources/page.tsx`** - Resources page
  - Thin server component rendering ResourcesClient
  - Exports `dynamic = 'force-dynamic'`

- **`ResourcesClient.tsx`** - Resources page client component
  - GTa and GV program information images
  - Lightbox for full-screen image viewing
  - University document link

- **`ranking/page.tsx`** - Ranking page
  - Thin server component rendering MemberRankingClient
  - Exports `dynamic = 'force-dynamic'`

- **`MemberRankingClient.tsx`** - Ranking page client component
  - Member rankings display
  - Performance metrics

- **`timeline/page.tsx`** - Timeline page
  - Thin server component rendering TimelineClient
  - Exports `dynamic = 'force-dynamic'`

- **`TimelineClient.tsx`** - Timeline page client component
  - Timeline view of activities
  - Event cards with dates

### `src/components/` - Reusable Components

#### `src/components/auth/`
- **`LoginModal.tsx`** - Login modal component
  - Email/password form
  - Integration with AuthContext

#### `src/components/common/`
- Shared components used across the application

#### `src/components/dashboard/`
- **`DashboardConversionOverview.tsx`** - Conversion overview chart
- **`DashboardStatsCards.tsx`** - KPI cards component
- Other dashboard-specific components

#### `src/components/ecommerce/`
- Chart and data visualization components
- **`CountryMap.tsx`** - World map with @react-jvectormap
- **`DemographicCard.tsx`** - Demographic data display
- **`MonthlySalesChart.tsx`** - Monthly sales chart
- **`MonthlyTarget.tsx`** - Monthly target display
- **`StatisticsChart.tsx`** - Statistics chart with date picker
- All use `next/dynamic` for ApexCharts imports with `ssr: false`

#### `src/components/header/`
- Header-related components

#### `src/components/tables/`
- Table components with sorting, filtering

#### `src/components/ui/` - Base UI Components
- **`Badge.tsx`** - Badge component for status indicators
- **`Button.tsx`** - Button component with variants
- **`Dropdown.tsx`** - Dropdown menu component
- **`DropdownItem.tsx`** - Dropdown item component
- **`Modal.tsx`** - Modal/dialog component
- Other base UI components

### `src/context/` - Global State Management

- **`AuthContext.tsx`** - Authentication state
  - User login/logout
  - Session storage for auth state
  - "use client" directive

- **`SidebarContext.tsx`** - Sidebar state
  - Open/close sidebar
  - Mobile sidebar handling
  - "use client" directive

- **`ThemeContext.tsx`** - Theme state
  - Dark/light mode toggle
  - Theme persistence
  - "use client" directive

### `src/data/` - Static Data Files

- **`universities.json`** - University data
  - University IDs, names, logos, locations
  - General information and sales speeches

- **`opportunities.json`** - Opportunity data
  - Opportunity IDs, titles, durations
  - Benefits and requirements
  - Linked to universities via universityId

- **`digitalLeads.json`** - Digital marketing leads
  - Lead information (name, email, phone, university)
  - Internship type preferences
  - Account status

- **`physicalAttraction.json`** - Physical attraction leads
  - Similar to digital leads but for physical events
  - Additional fields like university level, field of study

- **`digitalConversionSignups.json`** - Digital conversion signups
- **`physicalConversionSignups.json`** - Physical conversion signups
- **`applicationPipeline.json`** - Application pipeline data
- **`stats.ts`** - Statistics data (TypeScript)

### `src/lib/` - Utility Functions

- **`dataUtils.ts`** - **CRITICAL FILE** - Single data access layer for static JSON data
  - **Purpose:** Centralized data access for all JSON files
  - **Exports:**
    - `getDigitalLeads()` - Returns digital leads array
    - `getPhysicalAttractionLeads()` - Returns physical leads array
    - `getUniversities()` - Returns universities array
    - `getOpportunities()` - Returns opportunities array
    - `getUniversityById(id)` - Get single university
    - `getOpportunitiesByUniversityId(id)` - Get opportunities for university
    - `getOpportunityById(id)` - Get single opportunity
    - `getDashboardStats()` - Dashboard KPI calculations
    - `getTopUniversities(n)` - Top N universities by leads
    - `getUniversityStats()` - University statistics
    - `getLeadSeriesMonthly()` - Monthly lead series for charts
    - `getLeadSeriesWeekly()` - Weekly lead series for charts
    - `getLeadSeriesDaily()` - Daily lead series for charts
  - **Note:** All static data access should go through this file, not direct JSON imports

- **`googleSheetsServer.ts`** - **CRITICAL FILE** - Google Sheets integration (server-side only)
  - **Purpose:** Server-side Google Sheets API integration for real-time data
  - **Key Functions:**
    - `fetchPhysicalLeadsRaw()` - Fetches physical leads from Google Sheets
    - `loadScheduledAttractionsFromSheet()` - Loads attractions with automatic cleanup of old entries (>1 week)
    - `saveScheduledAttractionToSheet()` - Saves new attraction to Google Sheets
    - `deleteScheduledAttractionFromSheet()` - Deletes attraction from Google Sheets
    - `loadOpportunitiesFromSheet()` - Loads opportunities from Google Sheets
    - `saveOpportunityToSheet()` - Saves opportunity to Google Sheets
  - **Features:**
    - Lazy imports googleapis to avoid OOM crashes
    - Fallback to static JSON if env vars not set
    - Automatic tab creation if missing
    - Sheet title normalization
    - Header mapping for column variations
  - **Environment Variables:**
    - `GOOGLE_SHEETS_SPREADSHEET_ID` - Main spreadsheet ID
    - `GOOGLE_SHEETS_CREDENTIALS` - Service account credentials JSON

- **`dataUtilsServer.ts`** - Server-side data utilities
  - **Purpose:** Server-side data access and processing
  - **Exports:**
    - `getPhysicalAttractionLeads()` - Fetches physical leads (with Google Sheets fallback)
    - Type definitions for PhysicalAttractionLead
  - **Note:** Used by server components and API routes

### `src/layout/` - Layout Components

- **`AppHeader.tsx`** - Application header
  - Logo, navigation, user menu
  - Theme toggle
  - Login modal trigger

- **`AppSidebar.tsx`** - Application sidebar
  - Navigation menu items
  - Different menus for admin vs member dashboard
  - Mobile responsive

- **`Backdrop.tsx`** - Backdrop overlay
  - Used for modal backdrops
  - Used for mobile sidebar backdrop

- **`SidebarWidget.tsx`** - Sidebar widget component

### `src/icons/` - SVG Icons

- Custom SVG icon files (58 files)
- Imported as React components via @svgr/webpack
- Used throughout the application for UI elements

### `src/hooks/` - Custom Hooks

- Custom React hooks for reusable logic

## Key Architecture Patterns

### Server/Client Component Split

The application follows Next.js App Router best practices:

**Server Components** (`page.tsx` files):
- Thin wrapper components
- Export `dynamic = 'force-dynamic'` to prevent static optimization
- Render corresponding `*Client.tsx` component
- No "use client" directive

**Client Components** (`*Client.tsx` files):
- Contain all interactive logic
- Use "use client" directive
- Handle state, events, and browser APIs
- Import and render UI components

### Data Access Pattern

**Always use `src/lib/dataUtils.ts` for data access:**

```typescript
// ❌ WRONG - Direct import
import universities from "@/data/universities.json";

// ✅ CORRECT - Use dataUtils
import { getUniversities } from "@/lib/dataUtils";
const universities = getUniversities();
```

### Dynamic Route Pattern

For dynamic routes like `/member-dashboard/sales/[id]`:

```typescript
// page.tsx (server component)
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <UniversityDetailsClient params={params} />;
}

// UniversityDetailsClient.tsx (client component)
export default function UniversityDetailsClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // ... client-side logic
}
```

### Context Pattern

Global state is managed via React Context:

```typescript
// Wrap app with providers in layout.tsx
<AuthContext.Provider>
  <SidebarContext.Provider>
    <ThemeContext.Provider>
      {/* app content */}
    </ThemeContext.Provider>
  </SidebarContext.Provider>
</AuthContext.Provider>

// Use in components
const { user, login } = useAuth();
```

## Data Flow Architecture

### Google Sheets Integration

The application uses Google Sheets as a real-time database for:

1. **Physical Leads** - Live attraction leads from physical events
   - Sheet: Main spreadsheet, tab with physical leads data
   - Columns: Member Name, University, Submitted at, EXPA ID, Email, etc.
   - Accessed via: `fetchPhysicalLeadsRaw()` in `googleSheetsServer.ts`

2. **Scheduled Attractions** - Attraction events with dates, universities, goals
   - Sheet: Main spreadsheet, "Scheduled Attractions" tab
   - Columns: ID (A), JSON blob (B) with attraction data
   - Auto-cleanup: Entries older than 1 week are deleted on load
   - Accessed via: `loadScheduledAttractionsFromSheet()` in `googleSheetsServer.ts`

3. **Opportunities** - University-specific opportunity cards
   - Sheet: Separate spreadsheet, "Opportunities" tab
   - Columns: universityId (A), JSON blob (B) with opportunity data
   - Accessed via: `loadOpportunitiesFromSheet()` in `googleSheetsServer.ts`

### Real-Time Data Flow

```
Google Sheets
    ↓
API Routes (src/app/api/)
    ↓
Client Components (src/app/dashboard/, src/app/member-dashboard/)
    ↓
UI Updates (with polling/cache invalidation)
```

**Polling Intervals:**
- Member dashboard ranking: 30 seconds
- Member dashboard attractions: 15 seconds
- Admin dashboard leads: 2 minutes (cache)

**Cache Invalidation:**
- Uses `revalidateTag()` for Next.js cache
- Custom events (`attractionUpdated`) for cross-device sync
- `unstable_cache` for expensive operations (EXPA lookups)

### University-Specific Attraction Handling

When multiple attractions are scheduled on the same day:

1. **Attraction Creation**: Admin creates attraction with university, date, goal
2. **Member Dashboard**: Shows tab for each attraction
3. **Lead Counting**: Each tab only counts leads from its university
   - Uses fuzzy matching for university names
   - Filters via `?university=` parameter in ranking API
4. **Ranking**: Per-university leaderboards
   - Members ranked by leads at that specific university
   - Live data from `/api/ranking?university=ESPRIT&expa=0`

### Source Label Filtering

The ranking API automatically excludes non-person entries:

**Excluded Labels:**
- Social media: Facebook, Instagram, LinkedIn, Twitter, TikTok, WhatsApp
- Referral methods: "Heard by friend", Referral, Walk-in
- Online sources: Google, YouTube, Website, Social media
- Marketing: Event, Poster, Flyer, Banner, Brochure

**Implementation:**
- `SOURCE_LABELS` Set in `ranking/route.ts`
- `isSourceLabel()` function checks member name
- Skips counting if name matches a source label

## Important Notes for AI Agents

### SVG Handling

- SVG files in `src/icons/` are transformed to React components
- Configuration in `next.config.ts` handles both Webpack and Turbopack
- **Critical:** The `turbopack.rules` configuration is required for production builds

### Build Configuration

- **Development:** Uses Webpack (`npm run dev`)
- **Production:** Uses Turbopack (`npm run build`)
- This difference can cause issues if configuration isn't set for both bundlers

### Client Component Pattern

Most pages follow this pattern:
1. `page.tsx` - Server component (thin wrapper)
2. `*Client.tsx` - Client component (actual logic)
3. Both files in the same directory

### Data Updates

- Static data is in `src/data/*.json` files
- Opportunities can be updated via localStorage (see `getOpportunitiesByUniversityId`)
- Always use `dataUtils.ts` functions for data access

### Styling

- Uses Tailwind CSS v4
- Dark mode supported via ThemeContext
- Custom styles in `src/app/globals.css`

## Common Tasks

### Adding a New Page

1. Create directory in `src/app/dashboard/` or `src/app/member-dashboard/`
2. Create `page.tsx` (server component) with `dynamic = 'force-dynamic'`
3. Create `*Client.tsx` (client component) with "use client"
4. Add navigation link in appropriate sidebar

### Adding New Data

1. Add JSON file to `src/data/`
2. Add TypeScript interface to `src/lib/dataUtils.ts`
3. Add import and accessor function to `src/lib/dataUtils.ts`
4. Use the accessor function throughout the app

### Modifying Charts

- Chart components are in `src/components/ecommerce/`
- They use `next/dynamic` for ApexCharts with `ssr: false`
- Data comes from `dataUtils.ts` aggregators

## File Naming Conventions

- Server components: `page.tsx`
- Client components: `*Client.tsx` (e.g., `DashboardClient.tsx`)
- Layout components: `layout.tsx`
- Utility files: `*.ts` (e.g., `dataUtils.ts`)
- Data files: `*.json`
- Component files: PascalCase (e.g., `Badge.tsx`)

## Dependencies

### Key Dependencies

- **next:** ^16.1.6 - Framework
- **react:** ^19.2.0 - UI library
- **typescript:** ^5.9.3 - Type system
- **tailwindcss:** ^4.1.17 - Styling
- **apexcharts:** ^4.7.0 - Charts
- **@fullcalendar/*:** ^6.1.19 - Calendar
- **@react-jvectormap/*:** ^1.0.4 - Maps
- **lucide-react:** ^1.31.0 - Icons

### Dev Dependencies

- **@svgr/webpack:** ^8.1.0 - SVG to React component
- **eslint:** ^9.39.1 - Linting
- **postcss:** ^8.5.6 - CSS processing

## Environment Variables

### Google Sheets Integration (Optional)

If Google Sheets integration is enabled, the following environment variables are required:

- **`GOOGLE_SHEETS_SPREADSHEET_ID`** - Main Google Spreadsheet ID for physical leads and attractions
- **`GOOGLE_SHEETS_CREDENTIALS`** - Service account credentials JSON (stringified)
- **`ATTRACTIONS_SPREADSHEET_ID`** - Spreadsheet ID for scheduled attractions (if different from main)
- **`OPPORTUNITIES_SPREADSHEET_ID`** - Spreadsheet ID for opportunities

### Authentication

- **`NEXT_PUBLIC_ADMIN_USER`** - Admin username (default: "crispy")
- **`NEXT_PUBLIC_ADMIN_PASS`** - Admin password (default: "crispy")

If these variables are not set, the application falls back to static JSON data in `src/data/`.

## Deployment

- Built for Vercel deployment
- Production builds use Turbopack
- Source maps enabled for debugging
- Static optimization disabled for dynamic routes

## Troubleshooting

### Build Errors

If you encounter SVG-related build errors:
- Check `next.config.ts` has both webpack and turbopack SVG rules
- Ensure `@svgr/webpack` is installed

### Client Component Errors

If you see "Element type is invalid" errors:
- Check that SVG imports are working (turbopack.rules)
- Verify dynamic imports have `ssr: false` for chart libraries
- Ensure client components have "use client" directive

### Data Access Issues

If data isn't loading:
- Always use `dataUtils.ts` functions
- Check JSON file paths are correct
- Verify TypeScript interfaces match data structure

## Summary

This is a well-structured Next.js application with clear separation of concerns:

- **Data Layer:** `src/lib/dataUtils.ts` + `src/data/*.json`
- **UI Layer:** `src/components/` (reusable) + `src/app/*/` (page-specific)
- **State Layer:** `src/context/` (global state)
- **Layout Layer:** `src/layout/` (header, sidebar)
- **Configuration:** `next.config.ts`, `package.json`, `tsconfig.json`

The key to understanding this codebase is recognizing the server/client component pattern and always using `dataUtils.ts` for data access.
