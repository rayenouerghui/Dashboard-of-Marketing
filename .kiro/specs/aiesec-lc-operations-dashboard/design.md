# Design Document

## Overview

The AIESEC LC Operations Dashboard is a comprehensive web-based platform built with Next.js 16, React 19, TypeScript, and Tailwind CSS. The system serves as a centralized operating system for AIESEC Local Committees, replacing fragmented tools with a unified workspace. The architecture follows a modular design pattern where each functional area (University Relations, Attraction, OGX, ICX, Marketing, Performance Tracking) operates as a semi-independent module with shared core services.

The platform leverages the existing Next.js admin dashboard template and extends it with AIESEC-specific functionality. The system is designed to handle multiple concurrent users, real-time data updates, third-party integrations (Google Sheets, Google Drive, EXPA), and provide role-based access control.

## Architecture

### High-Level Architecture

The system follows a client-side rendered (CSR) architecture with Next.js App Router, leveraging React Server Components where beneficial for performance. The architecture is organized into layers:

1. **Presentation Layer**: React components organized by feature modules
2. **State Management Layer**: React Context API with custom hooks for global state
3. **Service Layer**: API clients and business logic services
4. **Data Access Layer**: Integration adapters for external systems (Google APIs, EXPA)
5. **Storage Layer**: Browser-based storage (localStorage, IndexedDB) with optional backend API

### Module Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (admin)/                  # Protected admin routes
│   │   ├── universities/         # University management pages
│   │   ├── leads/                # Lead tracking pages
│   │   ├── goals/                # Goal tracking pages
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── resources/            # Knowledge management
│   │   ├── social-media/         # Social media scheduling
│   │   └── settings/             # System settings
│   └── (auth)/                   # Authentication pages
├── components/                   # Reusable UI components
│   ├── universities/             # University-specific components
│   ├── leads/                    # Lead management components
│   ├── goals/                    # Goal tracking components
│   ├── analytics/                # Analytics visualizations
│   ├── resources/                # Resource management components
│   └── common/                   # Shared components
├── services/                     # Business logic and API clients
│   ├── university.service.ts
│   ├── lead.service.ts
│   ├── goal.service.ts
│   ├── analytics.service.ts
│   ├── google.service.ts
│   └── expa.service.ts
├── context/                      # Global state management
│   ├── AuthContext.tsx
│   ├── NotificationContext.tsx
│   └── DashboardContext.tsx
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript type definitions
├── utils/                        # Utility functions
└── lib/                          # Third-party integrations
```

### Technology Stack

- **Frontend Framework**: Next.js 16.1.6 with App Router
- **UI Library**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 4.1.17
- **Charts**: ApexCharts 4.7.0 with react-apexcharts
- **Calendar**: FullCalendar 6.1.19
- **Storage**: Browser localStorage and IndexedDB
- **Authentication**: JWT-based session management
- **API Integration**: Fetch API with custom service wrappers

## Components and Interfaces

### Core Interfaces

#### Authentication & User Management
