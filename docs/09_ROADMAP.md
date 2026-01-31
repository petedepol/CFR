# CFR V3 Roadmap

## Overview

| Phase | Focus | Duration |
|-------|-------|----------|
| 0 | Design Refresh | 1 week |
| 1 | Foundation | 1 week |
| 2 | Connect V3 | 1 week |
| 3 | Race Dashboard | 2 weeks |
| 4 | Checklists | 2 weeks |
| 5 | Weather + Reports | 2 weeks |
| 6 | Polish | 1 week |

---

## Phase 0: Design Refresh

**Status:** COMPLETE

### Milestones

- [x] M0.1: Create V3 theme system (`v3Theme.css`)
- [x] M0.2: Build landing page playground
- [x] M0.3: User feedback and iteration (Figma design, light-first, warm gradient)
- [x] M0.4: Finalize design direction (minimal layout, manual theme toggle)

### Deliverables

- `src/ui/v3Theme.css` - CSS variables for light/dark themes
- `src/features/v3/LandingPlayground.jsx` - V3 landing page
- `src/features/v3/components/Avatar.jsx` - Orange gradient ring avatar
- `src/features/v3/components/BottomNav.jsx` - Floating pill navigation
- `src/features/v3/components/BikeSettingsModal.jsx` - Bottom sheet form (vaul)
- `src/features/v3/components/RidersModal.jsx` - Rider list drawer
- Approved visual design (light-first, orange accent, warm gradient background)

---

## Phase 1: Foundation

**Status:** PLANNED

### Milestones

- [ ] M1.1: Create `feature_flags` table
- [ ] M1.2: Create `featureFlags.js` helper
- [ ] M1.3: Add role helpers to AuthProvider
- [ ] M1.4: Implement coach read-only mode
- [ ] M1.5: Verify no V2 regression

### Deliverables

- Feature flag infrastructure
- Role-based UI restrictions
- All existing features still work

---

## Phase 2: Connect V3

**Status:** PLANNED

### Milestones

- [ ] M2.1: Fetch real riders in V3 landing
- [ ] M2.2: Connect to existing measurement forms
- [ ] M2.3: Add `v3_shell` feature flag
- [ ] M2.4: Create V3 app shell component
- [ ] M2.5: Test offline queue with V3 shell

### Deliverables

- V3 landing shows real data
- Can complete full user flows
- Flag-controlled shell swap

---

## Phase 3: Race Dashboard

**Status:** PLANNED

### Milestones

- [ ] M3.1: Create `race_events` table
- [ ] M3.2: Create `race_schedule_items` table
- [ ] M3.3: Build race dashboard page
- [ ] M3.4: Build schedule view
- [ ] M3.5: Implement WhatsApp plan import
- [ ] M3.6: Add `v3_race_dashboard` flag

### Deliverables

- Race event CRUD
- Daily schedule view
- WhatsApp text → schedule parser
- Flag-gated dashboard tab

---

## Phase 4: Checklists

**Status:** PLANNED

### Milestones

- [ ] M4.1: Create `checklist_templates` table
- [ ] M4.2: Create `race_checklists` table
- [ ] M4.3: Build template management (admin)
- [ ] M4.4: Build checklist instantiation
- [ ] M4.5: Build check/uncheck UI
- [ ] M4.6: Add `v3_checklists` flag

### Deliverables

- Admin can create templates
- Checklists can be created per race
- Items can be checked off
- Flag-gated feature

---

## Phase 5: Weather + Reports

**Status:** PLANNED

### Milestones

- [ ] M5.1: Integrate Open-Meteo API
- [ ] M5.2: Build weather widget
- [ ] M5.3: Create `setup_snapshots` table
- [ ] M5.4: Build snapshot capture
- [ ] M5.5: Build race-week diff report
- [ ] M5.6: Add `v3_weather` and `v3_reports` flags

### Deliverables

- Weather forecast per race location
- Pre-race setup snapshots
- Report showing changes since last race

---

## Phase 6: Polish

**Status:** PLANNED

### Milestones

- [ ] M6.1: Improve offline sync reliability
- [ ] M6.2: Add manual "Force Sync" button
- [ ] M6.3: Performance optimization
- [ ] M6.4: Bug fixes from user feedback
- [ ] M6.5: Final design tweaks

### Deliverables

- Robust offline experience
- Smooth, fast UI
- Production-ready V3

---

## Success Criteria

### Phase 0

- [ ] V3 design approved by user
- [ ] Theme works in dark and light mode

### Phase 1

- [ ] Feature flags work correctly
- [ ] Roles restrict UI appropriately
- [ ] No regressions in V2

### Phase 2

- [ ] Full flow works in V3 shell
- [ ] Can switch between V2/V3 via flag
- [ ] Offline queue functional

### Phase 3

- [ ] Can create race events
- [ ] Can import schedule from WhatsApp
- [ ] Dashboard shows upcoming races

### Phase 4

- [ ] Can create checklist templates
- [ ] Can instantiate checklists per race
- [ ] Can check items with attribution

### Phase 5

- [ ] Weather shows for race location
- [ ] Setup snapshots captured
- [ ] Diff report viewable

### Phase 6

- [ ] No known bugs
- [ ] Fast load times
- [ ] Reliable offline sync

---

## Dependencies

```
Phase 0 ──► Phase 1 ──► Phase 2 ──┬──► Phase 3
                                  │
                                  ├──► Phase 4
                                  │
                                  └──► Phase 5
                                           │
                                           ▼
                                      Phase 6
```

Phases 3, 4, 5 can run in parallel after Phase 2.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| V3 shell breaks | Disable flag, revert to V2 |
| Database migration fails | Rollback SQL ready |
| Feature not ready | Keep flag disabled |
| Performance issues | Lazy loading, caching |
| Offline sync fails | Manual sync button |

---

## Next Steps

1. Complete Phase 0 (get design approval)
2. Run Supabase migration SQL
3. Implement feature flag helper
4. Update AuthProvider with roles
5. Begin Phase 2 data connection
