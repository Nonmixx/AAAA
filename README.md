# Presentation Video Link
https://drive.google.com/drive/folders/1Vw9zALd_0VnPghlNZ-0Na1AlSAWf87-y?usp=sharing

## AI-Powered Donation Allocation Platform

A Next.js application for connecting donors with organizations in need through AI-powered matching and logistics coordination.

## Framework

**Next.js 15** with App Router

Previously built with Vite + React Router, now migrated to Next.js for improved performance, SEO, and developer experience.

## Tech Stack

- **Framework**: Next.js 15.1.6
- **UI**: React 18.3.1, TypeScript
- **Styling**: Tailwind CSS 4.1.12
- **Components**: Radix UI, Material UI, Lucide Icons
- **State**: React Context API  
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Animation**: Motion (Framer Motion)

## Project Structure

```
/src/app/
├── layout.tsx                    # Root layout with providers
├── page.tsx                      # Home (redirects to /donor)
├── (auth)/                       # Auth pages group
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── signup/donor/page.tsx
│   ├── forgot-password/page.tsx
│   └── receiver-verification/page.tsx
├── donor/
│   ├── page.tsx                 # Public landing page
│   └── (authenticated)/         # Protected donor routes
│       ├── layout.tsx           # DonorAuthLayout
│       ├── dashboard/page.tsx
│       ├── donate/page.tsx
│       ├── needs/page.tsx
│       ├── needs/[id]/page.tsx
│       ├── tracking/page.tsx
│       ├── profile/page.tsx
│       └── settings/page.tsx
├── receiver/
│   ├── layout.tsx               # ReceiverLayout
│   ├── page.tsx                 # Dashboard
│   ├── create-needs/page.tsx
│   ├── incoming/page.tsx
│   └── profile/page.tsx
├── components/
│   ├── layouts/                 # Layout components
│   ├── ui/                      # Reusable UI components
│   └── figma/                   # Figma-specific components
├── context/
│   └── DonorContext.tsx         # Global state management
├── pages/                       # Legacy page components (being phased out)
└── imports/                     # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Features

### Donor Portal

- **AI Donation**: Chatbot interface with image upload and condition analysis
- **Browse Needs**: Search and filter organizations by needs
- **Tracking**: Real-time 6-step donation tracking with proof of delivery
- **Dashboard**: Overview of donations, impact metrics, and quick actions
- **Settings**: Language selection (English/Bahasa Melayu/Chinese) and Emergency Mode toggle

### Receiver Portal

- **Dashboard**: View incoming donations and active needs
- **Create Needs**: Post organizational requirements
- **Incoming Donations**: Review and confirm donation offers
- **Notification System**: Real-time alerts for donations and deliveries

### System Features

- **Emergency Mode**: System-wide banner prioritizing urgent needs
- **Notification Bells**: Unread notification counters for both portals
- **Impact Visualization**: Visual representation of donation impact
- **Responsive Design**: Mobile-friendly interface
- **Dark Theme**: Consistent black (#000000) and red (#da1a32) color scheme

## Color Palette

- **Primary**: Black (#000000) - 60% usage
- **Secondary**: Red (#da1a32)
- **Accent**: Light Gray (#edf2f4)
- **Background**: White with gray accents
- **Text**: Dark for high contrast

## Development

### Key Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Environment

This project uses Next.js App Router with:
- Server Components by default
- Client Components marked with `'use client'`
- File-based routing
- Automatic code splitting

## Migration Status

✅ Migrated from Vite + React Router to Next.js 15

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration details and [NEXT_STEPS.md](./NEXT_STEPS.md) for remaining tasks.

## License

Private - All rights reserved

## Support

For issues or questions about the codebase, refer to the migration documentation or Next.js official docs.

---

**Built with** ❤️ **using Next.js and React**
