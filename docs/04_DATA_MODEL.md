# CFR V3 Data Model

## Existing Tables (V2)

### `riders`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Rider name (e.g., "Tom") |
| created_at | TIMESTAMPTZ | Created timestamp |

### `bike_measurements`

Polymorphic table for all measurement types.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| rider | TEXT | Rider name (denormalized) |
| type | TEXT | "jig" \| "mtb_settings" \| "full_spec" |
| bike_type | TEXT | "race" \| "training" \| "road" \| "ebike" \| "cx" |
| data | JSONB | Type-specific measurement data |
| created_at | TIMESTAMPTZ | Created timestamp |
| updated_at | TIMESTAMPTZ | Last modified |
| created_by | TEXT | User who created |

**Indexes:**
- `idx_measurements_rider` on `rider`
- `idx_measurements_type` on `type`
- `idx_measurements_created` on `created_at DESC`

### `allowed_users`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | User email |
| role | TEXT | "admin" \| "mechanic" \| "coach" |
| display_name | TEXT | Shown in UI |
| created_at | TIMESTAMPTZ | Created timestamp |

---

## New Tables (V3)

### `feature_flags`

Simple key-value for feature toggles.

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT | Primary key (e.g., "v3_race_dashboard") |
| enabled | BOOLEAN | Default FALSE |
| updated_at | TIMESTAMPTZ | Last changed |

### `race_events`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | "Nove Mesto WC1" |
| location | TEXT | "Czech Republic" |
| start_date | DATE | Race start |
| end_date | DATE | Race end (nullable) |
| status | TEXT | "upcoming" \| "active" \| "completed" |
| notes | TEXT | General notes |
| created_at | TIMESTAMPTZ | Created timestamp |

### `race_schedule_items`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| race_event_id | UUID | FK → race_events |
| day_offset | INT | 0=race day, -1=day before, etc. |
| time_slot | TIME | "09:00" |
| title | TEXT | "Track walk" |
| category | TEXT | "logistics" \| "training" \| "race" \| "service" |
| rider | TEXT | Specific rider or NULL (all) |
| notes | TEXT | Additional details |
| source | TEXT | "manual" \| "whatsapp_import" |
| raw_import | TEXT | Original pasted text |
| completed | BOOLEAN | Checked off? |
| sort_order | INT | Display order |
| created_at | TIMESTAMPTZ | Created timestamp |

### `checklist_templates`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | "Pre-race bike check" |
| category | TEXT | "bike" \| "rider" \| "logistics" |
| items | JSONB | `[{text, required}, ...]` |
| active | BOOLEAN | Template enabled? |
| created_at | TIMESTAMPTZ | Created timestamp |

### `race_checklists`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| race_event_id | UUID | FK → race_events |
| template_id | UUID | FK → checklist_templates |
| rider | TEXT | Specific rider or NULL |
| title | TEXT | Checklist name |
| items | JSONB | `[{text, checked, checked_by, checked_at}, ...]` |
| status | TEXT | "pending" \| "in_progress" \| "completed" |
| created_at | TIMESTAMPTZ | Created timestamp |

### `weather_cache`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| race_event_id | UUID | FK → race_events |
| fetched_at | TIMESTAMPTZ | When fetched |
| forecast_json | JSONB | Raw API response |
| expires_at | TIMESTAMPTZ | Cache TTL |

### `setup_snapshots`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| race_event_id | UUID | FK → race_events |
| rider | TEXT | Rider name |
| snapshot_type | TEXT | "pre_race" \| "post_race" |
| snapshot_data | JSONB | Denormalized setup copy |
| created_at | TIMESTAMPTZ | Snapshot time |

---

## Relationships

```
riders (existing)
    │
    └──< bike_measurements (existing)
            │ rider (denormalized)
            │ type, bike_type

allowed_users (existing)
    │
    └── role determines permissions

feature_flags (new)
    │
    └── key/enabled pairs

race_events (new)
    │
    ├──< race_schedule_items
    ├──< race_checklists
    ├──< weather_cache
    └──< setup_snapshots

checklist_templates (new)
    │
    └──< race_checklists (template_id)
```

---

## JSONB Schemas

### bike_measurements.data (type="jig")

```json
{
  "saddle_height": 745,
  "saddle_setback": 52,
  "handlebar_reach": 480,
  "handlebar_drop": 125,
  "notes": "Post-fit adjustment"
}
```

### bike_measurements.data (type="mtb_settings")

```json
{
  "fork_psi": 85,
  "shock_psi": 180,
  "fork_rebound": 8,
  "shock_rebound": 6,
  "tire_front_psi": 22,
  "tire_rear_psi": 24,
  "notes": "Wet conditions setup"
}
```

### checklist_templates.items

```json
[
  { "text": "Check tire pressure", "required": true },
  { "text": "Inspect brake pads", "required": true },
  { "text": "Clean drivetrain", "required": false }
]
```

### race_checklists.items

```json
[
  { "text": "Check tire pressure", "checked": true, "checked_by": "Tom", "checked_at": "2026-01-27T09:15:00Z" },
  { "text": "Inspect brake pads", "checked": false, "checked_by": null, "checked_at": null }
]
```

---

## Migration Notes

1. **No changes to existing tables** in V3.0
2. New tables added incrementally behind feature flags
3. `bike_measurements` continues to be the primary data table
4. Rider names are denormalized (no FK) for simplicity
