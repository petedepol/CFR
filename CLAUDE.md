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

## Adding New Users
Two steps required — missing either causes login failure:
1. Add row to `allowed_users` table (email, name, role, active)
2. Pre-create `auth.users` + `auth.identities` records (signups disabled via `shouldCreateUser: false`)

See memory file for SQL templates.

## Last Session: 2026-02-25
- Fixed iOS button freeze: `navigating-back` class now removed on visibility change back to visible
- Added multi-image Neo tune import (multiple file select, thumbnail grid, batch upload)
- Added `image_urls` array to Neo data model (backward compat with `image_url`)
- Fixed multi-upload path collision (added random suffix to storage paths)
- Pre-created auth.users for all 5 rider emails (Cole, Ana, Charlie, Jolanda, Luca)
- Branch: `main`
