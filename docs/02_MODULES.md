# CFR V3 Module Structure

## Module Boundaries

```
src/features/
├── auth/              # Authentication (existing)
├── measurements/      # Jig + Spec (existing)
├── settings/          # Bike settings (existing)
├── v3/                # V3 landing page (new)
├── race/              # Race dashboard (future)
├── checklists/        # Templates + instances (future)
└── reports/           # Race-week reports (future)
```

---

## Module Details

### auth/ (Existing - Minor Changes)

**Purpose:** Email OTP authentication via Supabase

**Files:**
- `AuthProvider.jsx` - Context provider, role helpers
- `LoginPage.jsx` - OTP login form
- `RequireAuth.jsx` - Route protection

**V3 Changes:**
- Add `canEdit`, `canDelete`, `isCoach` helpers
- Keep existing OTP flow unchanged

**Exports:**
```javascript
export { useAuth } from './AuthProvider';
// useAuth returns: { user, displayName, isAdmin, isMechanic, isCoach, canEdit, canDelete, signOut }
```

---

### measurements/ (Existing - Unchanged)

**Purpose:** Jig measurements and full bike specs

**Files:**
- `pages/MeasurementsHome.jsx` - Entry point
- `pages/QuickEntryPage.jsx` - Jig form
- `pages/FullSpecPage.jsx` - Complete spec form
- `pages/HistoryPage.jsx` - Measurement history

**Data:**
- Uses `bike_measurements` table (polymorphic)

**No V3 changes** - these forms work, just need V3 shell integration later

---

### settings/ (Existing - Unchanged)

**Purpose:** MTB/race bike settings

**Files:**
- `pages/SettingsHome.jsx` - Rider picker
- `pages/MtbSettingsPage.jsx` - Settings form

**No V3 changes** - forms work, V3 will wrap differently

---

### v3/ (New - In Progress)

**Purpose:** V3 design playground and landing page

**Files:**
- `LandingPlayground.jsx` - Main V3 landing page

**Depends on:**
- `src/ui/v3Theme.js` - Theme system

**Status:** Design iteration phase

---

### race/ (Future - V3.1)

**Purpose:** Race dashboard, schedule, weather

**Planned Files:**
```
race/
├── api/
│   ├── raceApi.js         # CRUD for race_events
│   └── weatherApi.js      # Open-Meteo integration
├── pages/
│   ├── RaceDashboard.jsx  # Main dashboard view
│   └── ScheduleView.jsx   # Daily schedule
├── components/
│   ├── WeatherWidget.jsx  # Weather display
│   └── PlanImportModal.jsx # WhatsApp paste parser
└── utils/
    └── scheduleParser.js  # Text → schedule items
```

**New Tables:**
- `race_events`
- `race_schedule_items`
- `weather_cache`

---

### checklists/ (Future - V3.1)

**Purpose:** Reusable checklist templates

**Planned Files:**
```
checklists/
├── api/
│   └── checklistsApi.js
├── pages/
│   ├── ChecklistsHome.jsx
│   └── TemplatesPage.jsx
└── components/
    └── ChecklistCard.jsx
```

**New Tables:**
- `checklist_templates`
- `race_checklists`

---

### reports/ (Future - V3.1)

**Purpose:** Race-week setup reports

**Planned Files:**
```
reports/
├── api/
│   └── reportsApi.js
├── pages/
│   ├── ReportsHome.jsx
│   └── RiderSetupReport.jsx
└── utils/
    └── snapshotDiff.js    # Compare setups
```

**New Tables:**
- `setup_snapshots`

---

## Shared Code

### src/ui/

| File | Purpose |
|------|---------|
| `styles.js` | V2 design tokens (keep) |
| `v3Theme.js` | V3 design tokens (new) |

### src/lib/

| File | Purpose |
|------|---------|
| `supabase.js` | Supabase client |
| `offlineBikeMeasurementsQueue.js` | Offline queue |
| `diagnostics.js` | Local error logging |
| `featureFlags.js` | Feature flag helpers (new) |

### src/components/

| File | Purpose |
|------|---------|
| `AppShell.jsx` | V2 app shell (keep) |
| `OfflineSyncManager.jsx` | Sync indicator |
| `PwaUpdateManager.jsx` | Update prompts |

---

## Module Dependencies

```
auth ──────────────────────────────────────┐
  │                                        │
  ▼                                        │
measurements ◄─── settings                 │
  │                   │                    │
  │                   │                    │
  └───────┬───────────┘                    │
          │                                │
          ▼                                │
        v3 (landing) ◄─────────────────────┘
          │
          ▼
    ┌─────┴─────┐
    │           │
    ▼           ▼
  race     checklists
    │           │
    └─────┬─────┘
          │
          ▼
       reports
```
