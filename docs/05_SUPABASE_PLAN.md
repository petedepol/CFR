# CFR V3 Supabase Plan

## Current Setup (V2)

- **Project**: Existing Supabase project
- **Auth**: Email OTP (magic link)
- **Tables**: `riders`, `bike_measurements`, `allowed_users`
- **RLS**: Basic authenticated access

---

## Auth Strategy

### Keep Email OTP

No changes to auth flow:

1. User enters email
2. Supabase sends OTP code
3. User enters code
4. Session established

**Why keep it:**
- Already works
- Simple for 5 users
- No password management

### Role Lookup

```javascript
// In AuthProvider.jsx
const { data: userData } = await supabase
  .from('allowed_users')
  .select('role, display_name')
  .eq('email', user.email)
  .single();

// Context exposes:
{
  user,
  displayName: userData.display_name,
  role: userData.role,  // 'admin' | 'mechanic' | 'coach'
  isAdmin: userData.role === 'admin',
  isMechanic: userData.role === 'mechanic' || userData.role === 'admin',
  isCoach: userData.role === 'coach',
  canEdit: userData.role !== 'coach',
  canDelete: userData.role === 'admin',
}
```

---

## RLS Strategy

### Simple Approach (Recommended)

With only 5 users, complex RLS is unnecessary.

```sql
-- Everyone authenticated can read everything
CREATE POLICY "authenticated_read" ON bike_measurements
  FOR SELECT TO authenticated USING (true);

-- Everyone except coach can insert
CREATE POLICY "authenticated_insert" ON bike_measurements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.email()
      AND role IN ('admin', 'mechanic')
    )
  );

-- Only admin can update
CREATE POLICY "admin_update" ON bike_measurements
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.email()
      AND role = 'admin'
    )
  );

-- Only admin can delete
CREATE POLICY "admin_delete" ON bike_measurements
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.email()
      AND role = 'admin'
    )
  );
```

### RLS for New Tables

Same pattern for all new tables:

```sql
-- race_events
CREATE POLICY "authenticated_read" ON race_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mechanic_write" ON race_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.email()
      AND role IN ('admin', 'mechanic')
    )
  );

-- (repeat for UPDATE/DELETE with admin check)
```

---

## Vertical Slice Checklist

**Goal**: Prove auth + new table + feature flag works before building features.

### Step 1: Create feature_flags table

```sql
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read flags
CREATE POLICY "read_flags" ON feature_flags
  FOR SELECT TO authenticated USING (true);

-- Only admin can modify
CREATE POLICY "admin_write_flags" ON feature_flags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = auth.email()
      AND role = 'admin'
    )
  );

-- Insert initial flags
INSERT INTO feature_flags (key, enabled) VALUES
  ('v3_race_dashboard', false),
  ('v3_plan_import', false),
  ('v3_checklists', false),
  ('v3_reports', false),
  ('v3_weather', false);
```

### Step 2: Create race_events table

```sql
CREATE TABLE race_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'upcoming',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE race_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON race_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Step 3: Add featureFlags.js

```javascript
// src/lib/featureFlags.js
import { supabase } from './supabase';

let flagsCache = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getFlags() {
  const now = Date.now();
  if (flagsCache && (now - cacheTime) < CACHE_TTL) {
    return flagsCache;
  }

  const { data, error } = await supabase
    .from('feature_flags')
    .select('key, enabled');

  if (error) {
    console.error('Failed to fetch flags:', error);
    return flagsCache || {};
  }

  flagsCache = Object.fromEntries(
    data.map(f => [f.key, f.enabled])
  );
  cacheTime = now;
  return flagsCache;
}

export async function isEnabled(key) {
  const flags = await getFlags();
  return flags[key] === true;
}
```

### Step 4: Verify

- [ ] `feature_flags` table created
- [ ] `race_events` table created
- [ ] RLS policies applied
- [ ] `featureFlags.js` works
- [ ] No regression to V2 features

---

## Migration SQL (Full)

Run in Supabase SQL Editor:

```sql
-- =============================================
-- V3 MIGRATION SCRIPT
-- =============================================

-- 1. Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_flags" ON feature_flags
  FOR SELECT TO authenticated USING (true);

INSERT INTO feature_flags (key, enabled) VALUES
  ('v3_race_dashboard', false),
  ('v3_plan_import', false),
  ('v3_checklists', false),
  ('v3_reports', false),
  ('v3_weather', false)
ON CONFLICT (key) DO NOTHING;

-- 2. Race Events
CREATE TABLE IF NOT EXISTS race_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'upcoming',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE race_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "race_events_all" ON race_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Schedule Items
CREATE TABLE IF NOT EXISTS race_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_event_id UUID REFERENCES race_events(id) ON DELETE CASCADE,
  day_offset INT DEFAULT 0,
  time_slot TIME,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'logistics',
  rider TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  raw_import TEXT,
  completed BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE race_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_items_all" ON race_schedule_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Checklist Templates
CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'bike',
  items JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_all" ON checklist_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Race Checklists
CREATE TABLE IF NOT EXISTS race_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_event_id UUID REFERENCES race_events(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checklist_templates(id),
  rider TEXT,
  title TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE race_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklists_all" ON race_checklists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Weather Cache
CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_event_id UUID REFERENCES race_events(id) ON DELETE CASCADE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  forecast_json JSONB,
  expires_at TIMESTAMPTZ
);

ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weather_all" ON weather_cache
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Setup Snapshots
CREATE TABLE IF NOT EXISTS setup_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_event_id UUID REFERENCES race_events(id) ON DELETE CASCADE,
  rider TEXT NOT NULL,
  snapshot_type TEXT DEFAULT 'pre_race',
  snapshot_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE setup_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_all" ON setup_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- END V3 MIGRATION
-- =============================================
```

---

## Rollback Plan

If issues arise:

```sql
-- Drop new tables (order matters due to FKs)
DROP TABLE IF EXISTS setup_snapshots;
DROP TABLE IF EXISTS weather_cache;
DROP TABLE IF EXISTS race_checklists;
DROP TABLE IF EXISTS checklist_templates;
DROP TABLE IF EXISTS race_schedule_items;
DROP TABLE IF EXISTS race_events;
DROP TABLE IF EXISTS feature_flags;
```

This does NOT affect existing V2 tables.
