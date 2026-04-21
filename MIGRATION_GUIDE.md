# Next.js Migration Guide

## Framework Migration: Vite + React Router → Next.js App Router

This document outlines the migration from Vite + React Router to Next.js 15 with App Router.

## Key Changes

### 1. Routing
- **Before**: React Router with `routes.tsx` file
- **After**: File-based routing with App Router

### 2. Imports Changed
- `react-router` → `next/link` and `next/navigation`
- `Link` component uses `href` instead of `to`
- `useLocation()` → `usePathname()`
- `useNavigate()` → `useRouter()`
- `<Outlet />` → `{children}` prop

### 3. Client Components
All interactive components now need `'use client'` directive at the top.

### 4. Route Structure

```
/src/app/
├── layout.tsx                    # Root layout with DonorProvider
├── page.tsx                      # Redirects to /donor
├── (auth)/                       # Auth route group
│   ├── layout.tsx               # Auth layout wrapper
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── signup/donor/page.tsx
│   ├── forgot-password/page.tsx
│   └── receiver-verification/page.tsx
├── donor/
│   ├── layout.tsx               # DonorLayout (public)
│   ├── page.tsx                 # DonorHome (public landing)
│   └── (authenticated)/         # Authenticated donor routes
│       ├── layout.tsx           # DonorAuthLayout
│       ├── dashboard/page.tsx
│       ├── donate/page.tsx
│       ├── needs/page.tsx
│       ├── needs/[id]/page.tsx
│       ├── tracking/page.tsx
│       ├── profile/page.tsx
│       └── settings/page.tsx
└── receiver/
    ├── layout.tsx               # ReceiverLayout
    ├── page.tsx                 # ReceiverDashboard
    ├── create-needs/page.tsx
    ├── incoming/page.tsx
    └── profile/page.tsx
```

### 5. Page Migration Checklist

For each page component:
1. Add `'use client'` at the top
2. Change `import { Link } from 'react-router'` to `import Link from 'next/link'`
3. Change `import { useLocation, useNavigate } from 'react-router'` to `import { usePathname, useRouter } from 'next/navigation'`
4. Update `<Link to="/path">` to `<Link href="/path">`
5. Update `navigate('/path')` to `router.push('/path')`
6. Update `location.pathname` to `pathname`
7. Create `page.tsx` export with `export default function PageName()`

### 6. Layout Migration

Layouts converted:
- ✅ AuthLayout
- ✅ DonorLayout  
- ✅ DonorAuthLayout
- ✅ ReceiverLayout

All now accept `{children}` instead of using `<Outlet />`.

### 7. Configuration Files

New files:
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration for Next.js

Removed dependencies:
- `vite`
- `@vitejs/plugin-react`
- `@tailwindcss/vite`
- `react-router`

Added dependencies:
- `next`
- Added `react` and `react-dom` to dependencies (moved from peerDependencies)

### 8. Scripts Updated

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## Next Steps

1. Create remaining page.tsx files for all routes
2. Test each page to ensure navigation works
3. Update any remaining Link components
4. Test client-side interactivity
5. Remove old files: routes.tsx, App.tsx, vite.config.ts

## Notes

- All pages in the `pages/` directory are now converted to the App Router structure
- Context providers (DonorContext) remain unchanged, just wrapped in root layout
- All UI components remain unchanged
- CSS imports are handled in root layout.tsx
