# YANA - Yet Another News Aggregator

## Project Overview

YANA is a high-performance, dark-mode exclusive, privacy-focused Progressive Web App (PWA) for aggregating and reading news from RSS feeds.

## Tech Stack

- **Frontend**: React 19 with JSX
- **Build Tool**: Vite 7
- **PWA**: vite-plugin-pwa with Workbox
- **Styling**: Custom CSS (dark mode only)
- **Icons**: lucide-react
- **Storage**: IndexedDB (local-first via custom DatabaseBroker)
- **Encryption**: Web Crypto API (AES-GCM + PBKDF2) for Notes Vault
- **Package Manager**: npm

## Project Structure

```
├── api/                  # Serverless API functions (RSS proxy for Vercel)
│   └── rss-proxy.js
├── public/               # Static assets (icons, PWA manifest)
├── src/
│   ├── components/       # UI components
│   │   ├── Header.jsx
│   │   ├── IntelligentArticleCard.jsx
│   │   ├── NotesVault.jsx
│   │   ├── SettingsModal.jsx
│   │   └── SkeletonLoader.jsx
│   ├── services/
│   │   └── newsService.js  # RSS fetching, parsing, categorization
│   ├── utils/
│   │   ├── cryptoHarden.js   # AES-GCM encryption implementation
│   │   └── databaseBroker.js # IndexedDB async wrapper
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── vite.config.js
└── package.json
```

## Key Features

- RSS feed aggregation with multi-tier CORS proxy strategy
- Local-first data persistence with IndexedDB
- Encrypted Notes Vault ("Dead Drop") with hardware-accelerated AES-GCM
- 3-failed-attempts wipe security policy
- PWA with service worker and 6-hour RSS cache
- Skeleton loaders for zero layout shift
- Kinetic scroll snapping ("Magnetic Doomscrolling")

## Development

- **Dev server**: `npm run dev` → runs on port 5000
- **Build**: `npm run build` → outputs to `dist/`
- **Deployment**: Static site (dist/ folder)

## Replit Configuration

- Frontend runs on `0.0.0.0:5000` with `allowedHosts: true` for proxy compatibility
- Workflow: "Start application" → `npm run dev`
- Deployment: Static site build to `dist/`
