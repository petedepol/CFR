# CFR V3 Product Requirements

## Features Overview

### MVP (V3.0)

| Feature | Priority | Status |
|---------|----------|--------|
| V3 Landing Page | P0 | In Progress |
| Role-based access (Admin/Mechanic/Coach) | P0 | Planned |
| Race bike quick-edit (1 tap) | P0 | Planned |
| Feature flags | P0 | Planned |
| Improved offline sync | P1 | Planned |

### Next (V3.1+)

| Feature | Priority | Status |
|---------|----------|--------|
| Race Dashboard | P1 | Planned |
| WhatsApp schedule import | P2 | Planned |
| Checklist templates | P2 | Planned |
| Weather integration | P3 | Planned |
| Race-week reports | P3 | Planned |

### Deferred

- Service log (future phase)
- Multi-team support
- Bike registry/inventory

---

## User Stories

### US-001: Race Bike Quick Edit
**As a** mechanic
**I want to** update a rider's race bike settings in one tap
**So that** I can make fast adjustments during race day

**Acceptance Criteria:**
- [ ] Home screen shows all riders as tappable avatars
- [ ] Tapping rider opens race bike settings form directly
- [ ] Form pre-fills with current values
- [ ] Save works offline (queues for sync)
- [ ] Success feedback within 500ms

### US-002: Coach Read-Only Access
**As a** coach
**I want to** view all rider and bike data
**So that** I can reference setups without risk of accidental changes

**Acceptance Criteria:**
- [ ] Coach sees same UI as mechanics
- [ ] Edit/delete buttons are disabled (grayed out)
- [ ] No forms can be submitted
- [ ] Clear visual indicator of read-only mode

### US-003: Jig Measurements (Multi-Bike)
**As a** mechanic
**I want to** record jig measurements for any rider's bike
**So that** I can track fit across multiple bikes

**Acceptance Criteria:**
- [ ] Select rider → select bike → open jig form
- [ ] Maximum 3 taps to reach form
- [ ] History shows all bikes for selected rider
- [ ] Can compare measurements between bikes

### US-004: Full Bike Spec
**As a** mechanic
**I want to** record complete component specs
**So that** I have reference for builds and service

**Acceptance Criteria:**
- [ ] Full spec form accessible via rider → bike → spec
- [ ] All component fields editable
- [ ] Timestamps on each save
- [ ] History viewable per bike

### US-005: Offline Mode
**As a** mechanic
**I want to** use the app without internet
**So that** I can work in areas with poor connectivity

**Acceptance Criteria:**
- [ ] App loads from cache when offline
- [ ] Can view all previously loaded data
- [ ] Can submit forms (queued locally)
- [ ] Clear indicator of offline status
- [ ] Queue count visible
- [ ] Syncs automatically when online

### US-006: Admin History Management
**As an** admin
**I want to** edit or delete any history entry
**So that** I can correct mistakes

**Acceptance Criteria:**
- [ ] Admin sees edit/delete buttons on all entries
- [ ] Delete requires confirmation
- [ ] Changes sync to all users
- [ ] Audit trail preserved

---

## Scope Cuts

Items explicitly **not** in V3.0:

1. **Dashboard tab** - Placeholder only, no functionality
2. **Schedule import** - Deferred to V3.1
3. **Checklists** - Deferred to V3.1
4. **Weather API** - Deferred to V3.1
5. **Reports** - Deferred to V3.1
6. **Service log** - Deferred indefinitely
7. **Photo attachments** - Not planned
8. **Push notifications** - Not planned

---

## Acceptance Testing

### Smoke Test Checklist

- [ ] Login works (email OTP)
- [ ] Admin can access admin features
- [ ] Mechanic can edit, cannot delete
- [ ] Coach can view, cannot edit
- [ ] Offline: forms queue correctly
- [ ] Online: queue syncs automatically
- [ ] V3 landing page loads at `/v3`
- [ ] Theme follows system dark/light
