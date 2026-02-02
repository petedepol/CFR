# CFR Race App - Claude Context

## Project Overview
Cannondale Factory Racing bike setup management app. React PWA deployed to Vercel.

## Repos & Storage
- **Code:** github.com/petedepol/CFR
- **Shared workspace:** github.com/petedepol/pete-workspace
- **Docs/Assets:** Google Drive → Pete-Projects/CFR-Race-App/

## Google Drive Structure
```
Pete-Projects/
├── Spanner/          — specs, assets, exports, reference
├── CFR-Race-App/     — specs, exports, reference
├── Bike-Scraper/     — prompts, data, scripts
├── OpenClaw/         — config, logs, reference, Loki bridge docs
├── Tire-Research/    — docs
├── GPT-Archive/      — imported GPT conversations
└── _Session-Log/     — session-log (Google Doc)
```

## Tech Stack
- React 19 + Vite
- Tailwind CSS v4
- vaul (bottom sheet modals)
- motion/react (animations)
- Supabase (backend)
- PWA with vite-plugin-pwa

## Known Issues
- **iOS Safari swipe-back gesture:** Shows modals briefly during swipe preview. This is a browser limitation - iOS captures page snapshot before any JS events fire. Back button works fine. No JS-based fix possible. (2026-02-02)

## Session Log Entry Template
```
**YYYY-MM-DD — CFR Race App**

**Done:**
-

**Known Issues:**
-

**Branch:**

**Next:**
-
```

## Last Session: 2026-02-02
- Removed staggered entrance animations from main page
- Added modal cleanup on route changes across all V3 pages
- Attempted iOS swipe-back fix (parked - browser limitation)
- Branch: `claude/fix-ios-swipe-back-modals-DuwGh` (merged)
