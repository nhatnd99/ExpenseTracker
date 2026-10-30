# Personal Expense Tracker

A lightweight, privacy-first personal expense tracking Progressive Web App (PWA) designed for mobile-first usage and installation on iOS Safari without App Store distribution.

## 1. Project Overview

Personal Expense Tracker allows users to:
- Enter their monthly income.
- Configure custom budget allocation percentages (e.g. 70% Expenses / 30% Savings, or 97% / 1% / 1% / 1%).
- Calculate daily spending budget based on exact days in each month.
- Record, edit, and delete daily expenses.
- Monitor spending progress via the dashboard.
- Store all data locally in the browser via IndexedDB (zero remote server tracking).
- Install directly to iPhone Home Screen via Safari PWA.

---

## 2. Architecture Overview

The project is structured with a feature-based architecture separating domain calculations, data access, services, and UI components.

```
personal-expense-tracker/
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── favicon.svg
├── src/
│   ├── app/                    # Application shell, router, providers
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/             # Shared UI & layout components
│   │   ├── ui/                 # Loading spinner, error page, 404, notifications
│   │   ├── layout/             # Header, Bottom navigation, Page container
│   │   └── charts/             # Future Recharts visualizations
│   ├── features/               # Feature-sliced modules
│   │   ├── dashboard/          # Dashboard page & dashboard aggregation service
│   │   ├── monthly-plans/      # Budget plan creation & allocation configuration
│   │   ├── transactions/       # Daily expense recording & management
│   │   ├── categories/         # Category management
│   │   └── reports/            # Reporting & analytics
│   ├── db/                     # IndexedDB configuration (Dexie.js)
│   │   ├── database.ts         # Centralized schema & versioning
│   │   ├── migrations.ts       # Migration documentation & history
│   │   └── seed.ts             # Default categories seeder
│   ├── domain/                 # Pure domain business logic & calculators
│   │   ├── entities/           # Domain entity type re-exports
│   │   ├── budgetCalculator.ts # Daily budget & allocation mathematics
│   │   ├── dashboardCalculator.ts # Transaction aggregation & daily statuses
│   │   └── validation.ts       # Zod schemas & allocation sum checks
│   ├── repositories/           # Data access layer (IndexedDB via Dexie)
│   │   ├── monthlyPlanRepository.ts
│   │   ├── allocationRepository.ts
│   │   ├── categoryRepository.ts
│   │   └── transactionRepository.ts
│   ├── services/               # Application-level services
│   │   ├── backupService.ts    # JSON data backup & restore
│   │   └── dateService.ts      # ISO date/month formatting & VND display
│   ├── hooks/                  # Custom React hooks (e.g. useCurrentMonth)
│   ├── types/                  # TypeScriVpt domain models
│   ├── utils/                  # Cryptography & shared helpers
│   ├── styles/                 # Global styles & Tailwind configuration
│   ├── main.tsx                # React entrypoint & PWA SW registration
│   ├── index.css               # Tailwind CSS & iOS safe-area utilities
│   └── vite-env.d.ts           # Vite & PWA type declarations
├── index.html                  # HTML entrypoint with iOS PWA meta tags
├── vite.config.ts              # Vite configuration with Tailwind & VitePWA
├── tsconfig.json               # TypeScript configuration (strict mode)
├── .env.example                # Example environment variables
└── README.md
```

### Architectural Principles

1. **Domain Isolation**:
   - `src/domain/` contains pure functions with zero dependencies on React, IndexedDB, or browser storage.
   - All financial amounts are integer VND (avoiding floating-point inaccuracies).
2. **Repository Pattern**:
   - React components never query IndexedDB directly.
   - All data access is encapsulated in `src/repositories/`.
   - Business orchestration happens in feature service files (`*Service.ts`).
3. **PWA & Mobile-First**:
   - Responsive layouts optimized for mobile viewports.
   - Support for iOS safe-area insets (`safe-area-inset-top`, `safe-area-inset-bottom`).
   - Workbox service worker caching for application shell offline availability.

---

## 3. Technology Stack

- **Framework**: React 19 + TypeScript (Strict Mode)
- **Bundler & Dev Server**: Vite 8
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Local Database**: Dexie.js (IndexedDB)
- **Form & Validation**: React Hook Form + Zod
- **Data Visualization**: Recharts (prepared for future reports)
- **PWA & Offline**: `vite-plugin-pwa` + Workbox
- **Testing**: Vitest + Testing Library

---

## 4. Local Development

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### Installation
```bash
npm install
```

### Run the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Generate PWA Placeholder Icons
```bash
node scripts/generate-icons.mjs
```

### Type Checking
```bash
npm run type-check
```

### Run Unit Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

### Production Build
```bash
npm run build
```

### Preview Production Build Locally
```bash
npm run preview
```

---

## 5. PWA Installation on iPhone (iOS Safari)

PWAs on iOS cannot be distributed through the App Store and require Safari for installation:

### Deployment Requirements
1. The production build must be served over **HTTPS** (or localhost for development testing).
2. Deploy the `dist/` directory to any static HTTPS host (e.g., Cloudflare Pages, Vercel, Netlify, or GitHub Pages).

### Installation Steps on iPhone
1. Open **Safari** on your iPhone.
2. Navigate to your deployed HTTPS URL (e.g. `https://your-expense-tracker.app`).
3. Tap the **Share** button (the square with an arrow pointing upward at the bottom of the screen).
4. Scroll down in the share sheet and tap **"Add to Home Screen"**.
5. Confirm the app title and tap **"Add"** in the top right corner.
6. The Personal Expense Tracker icon will now appear on your iPhone Home Screen.
7. Launching from the Home Screen opens the app in standalone mode (no Safari address bar, adhering to safe-area insets).

---

## 6. Offline Behavior & Known Limitations

### Offline Capabilities
- **Application Shell**: Caches HTML, JS, CSS, fonts, and icons for offline loading.
- **Local Data Storage**: IndexedDB is local to the device and accessible offline.

### Known Limitations
1. **Device-Bound Data**: Data is stored solely in IndexedDB on the device. Clearing Safari website data or resetting the iPhone will delete the local database.
2. **No Cloud Synchronization**: Full offline synchronization and cloud sync are intentionally out of scope for this release.
3. **Backup Export**: A manual JSON backup/restore service (`backupService.ts`) is designed but pending UI implementation.
4. **Placeholder Feature Pages**: Feature forms (monthly plan setup, transaction adding modal) have starter layouts and services wired, with full CRUD UI scheduled for subsequent releases.
