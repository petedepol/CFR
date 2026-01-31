# CFR V2 to V3 Migration Plan

## Guiding Principle

**Evolution, not revolution.** V2 works. V3 is incremental.

---

## What Stays

| Component | Status | Notes |
|-----------|--------|-------|
| Email OTP auth | KEEP | Works well |
| `bike_measurements` table | KEEP | No schema changes |
| `riders` table | KEEP | No changes |
| `allowed_users` table | KEEP | Add role column if missing |
| Offline queue | KEEP | May improve reliability |
| Jig form | KEEP | Working |
| MTB settings form | KEEP | Working |
| Full spec form | KEEP | Working |
| History view | KEEP | Working |
| Admin edit/delete | KEEP | Working |

---

## What Changes

| Component | Change | Reason |
|-----------|--------|--------|
| Landing page | NEW `/v3` | Design playground |
| Theme system | NEW `v3Theme.js` | Orange/amber, auto dark/light |
| Role helpers | MODIFY `AuthProvider` | Add `canEdit`, `canDelete`, `isCoach` |
| Feature flags | NEW table + helper | Gate new features |
| App shell | OPTIONAL swap | V3 shell when ready |

---

## Feature Flags Strategy

### Why Flags?

- Deploy new code without activating features
- Test in production with select users
- Rollback without code changes
- Gradual rollout

### Flag Table

```sql
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE
);
```

### Flags Planned

| Flag | Controls | Default |
|------|----------|---------|
| `v3_shell` | Use V3 app shell | OFF |
| `v3_race_dashboard` | Race events + schedule | OFF |
| `v3_plan_import` | WhatsApp paste parser | OFF |
| `v3_checklists` | Templates + instances | OFF |
| `v3_reports` | Race-week reports | OFF |
| `v3_weather` | Weather API widget | OFF |

### Usage in Code

```javascript
import { isEnabled } from '../lib/featureFlags';

function AppShell() {
  const [useV3Shell, setUseV3Shell] = useState(false);

  useEffect(() => {
    isEnabled('v3_shell').then(setUseV3Shell);
  }, []);

  if (useV3Shell) {
    return <V3Shell />;
  }

  return <V2Shell />;
}
```

---

## Migration Phases

### Phase 0: Design (Current)

**Goal:** Finalize V3 look and feel

- [x] Create `v3Theme.js` with new tokens
- [x] Build `LandingPlayground.jsx`
- [ ] Iterate on design based on feedback
- [ ] No data connections yet

**Risk:** None (isolated playground)

### Phase 1: Foundation

**Goal:** Prove feature flags + roles work

1. Add `feature_flags` table to Supabase
2. Add `featureFlags.js` helper
3. Update `AuthProvider` with role helpers
4. Test coach read-only mode
5. Verify no V2 regression

**Risk:** Low (additive changes only)

### Phase 2: Connect V3 Landing

**Goal:** Wire V3 to real data

1. Fetch riders from database
2. Connect to existing forms
3. Add flag-gated route switch
4. Test full flow

**Risk:** Medium (touches routing)

### Phase 3: New Features

**Goal:** Add race dashboard, checklists, etc.

Each feature behind its own flag:
- Race dashboard
- Schedule import
- Checklists
- Weather
- Reports

**Risk:** Low (isolated by flags)

---

## Files to Modify

### Immediate (Phase 0-1)

| File | Change |
|------|--------|
| `src/ui/v3Theme.js` | Create (done) |
| `src/features/v3/LandingPlayground.jsx` | Create (done) |
| `src/lib/featureFlags.js` | Create |
| `src/features/auth/AuthProvider.jsx` | Add role helpers |

### Later (Phase 2)

| File | Change |
|------|--------|
| `src/app/router.jsx` | Add flag-gated shell swap |
| `src/components/V3Shell.jsx` | Create (new app shell) |

### Much Later (Phase 3)

| File | Change |
|------|--------|
| `src/features/race/*` | New module |
| `src/features/checklists/*` | New module |
| `src/features/reports/*` | New module |

---

## Rollback Plan

### If V3 Shell Breaks

1. Disable `v3_shell` flag in Supabase
2. All users revert to V2 shell immediately
3. No code deploy needed

### If New Feature Breaks

1. Disable that feature's flag
2. Feature disappears for all users
3. Fix and re-enable when ready

### If Database Migration Fails

1. Run rollback SQL (see 05_SUPABASE_PLAN.md)
2. New tables dropped
3. V2 tables untouched

---

## Testing Each Phase

### Phase 0 Checklist

- [ ] `/v3` loads without errors
- [ ] Theme follows system dark/light
- [ ] All mock interactions work
- [ ] V2 routes still work

### Phase 1 Checklist

- [ ] `feature_flags` table created
- [ ] `getFlags()` returns correct values
- [ ] `isEnabled()` works
- [ ] Coach cannot edit (UI disabled)
- [ ] Mechanic can edit
- [ ] Admin can edit and delete
- [ ] V2 flows unchanged

### Phase 2 Checklist

- [ ] V3 shell loads real riders
- [ ] Tap rider → opens real form
- [ ] Forms save to database
- [ ] Offline queue works
- [ ] Flag toggle switches shells
- [ ] V2 fallback works

---

## Timeline

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 | 0 | Design finalized |
| 2 | 1 | Flags + roles working |
| 3 | 2 | V3 connected to data |
| 4+ | 3 | New features (incremental) |

---

## Communication

### Before Migration

- Inform team of upcoming changes
- Explain flag system
- Set expectations (no disruption to V2)

### During Migration

- Monitor for issues
- Check diagnostics panel
- Quick rollback if needed

### After Migration

- Gather feedback
- Enable flags gradually
- Iterate based on usage
