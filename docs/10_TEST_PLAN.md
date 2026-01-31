# CFR V3 Test Plan

## Test Environment

- **Device:** iPhone (Safari PWA)
- **Modes:** Online, Offline, Transitioning
- **Roles:** Admin, Mechanic, Coach
- **Themes:** Dark, Light

---

## Smoke Tests

Run after every deployment.

### Authentication

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | Login works | Enter email → receive code → enter code | Session established |
| 2 | Logout works | Tap logout | Returns to login page |
| 3 | Session persists | Close app → reopen | Still logged in |
| 4 | Invalid email blocked | Enter non-allowed email | Error message shown |

### V2 Core Features

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5 | Settings page loads | Navigate to /settings | Rider picker shown |
| 6 | MTB settings save | Select rider → fill form → save | Success, data persisted |
| 7 | Measurements page loads | Navigate to /measurements | Options shown |
| 8 | Quick entry works | Fill jig form → save | Success, in history |
| 9 | Full spec works | Fill spec form → save | Success, in history |
| 10 | History loads | Navigate to history | Past entries shown |

### V3 Landing

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 11 | V3 page loads | Navigate to /v3 | Landing page shown |
| 12 | Dark mode works | System in dark mode | Dark theme applied |
| 13 | Light mode works | System in light mode | Light theme applied |
| 14 | Theme switches | Toggle system setting | UI updates |
| 15 | Bottom nav works | Tap each tab | Correct content shown |
| 16 | Riders modal opens | Tap Riders tab | Modal appears |

---

## Role-Based Access Tests

### Admin Role

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 17 | Can edit history | View entry → tap edit | Edit form opens |
| 18 | Can delete history | View entry → tap delete | Confirmation shown |
| 19 | Admin panel visible | Check nav | Admin tab present |

### Mechanic Role

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 20 | Can create entries | Fill form → save | Success |
| 21 | Cannot delete | View entry | Delete button hidden/disabled |
| 22 | Cannot edit others | View entry | Edit button hidden/disabled |

### Coach Role

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 23 | Can view all data | Navigate pages | Data visible |
| 24 | Cannot create | Try to save form | Save disabled |
| 25 | Cannot edit | View entry | Edit disabled |
| 26 | Cannot delete | View entry | Delete disabled |
| 27 | Read-only indicator | Check UI | "Read-only" badge shown |

---

## Offline Tests

### Basic Offline

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 28 | Offline indicator | Turn off network | "Offline" shown in header |
| 29 | App still loads | Refresh while offline | Cached app loads |
| 30 | Data still visible | Navigate pages | Previously loaded data shown |

### Offline Queue

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 31 | Form queues offline | Submit form while offline | "Queued" message, count in header |
| 32 | Multiple items queue | Submit 3 forms | Count shows 3 |
| 33 | Queue persists | Close and reopen app | Queue count preserved |

### Coming Back Online

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 34 | Auto sync starts | Turn on network | "Syncing" indicator |
| 35 | Queue clears | Wait for sync | Count goes to 0 |
| 36 | Data appears | Refresh page | Queued items in database |

### Edge Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 37 | Flaky connection | Toggle network rapidly | No data loss |
| 38 | Sync failure | Cause API error | Item stays in queue |
| 39 | Retry works | Fix error → wait | Item eventually syncs |

---

## Feature Flag Tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 40 | Flag disabled | Set flag=false | Feature hidden |
| 41 | Flag enabled | Set flag=true | Feature visible |
| 42 | Flag change live | Toggle flag in Supabase | UI updates (after refresh) |

---

## Performance Tests

| # | Test | Expected |
|---|------|----------|
| 43 | Initial load | < 3 seconds |
| 44 | Page navigation | < 500ms |
| 45 | Form save | < 2 seconds (online) |
| 46 | Form save | < 100ms (offline queue) |
| 47 | Theme switch | < 100ms |

---

## Regression Checklist

Run before each release.

### Critical Path

- [ ] Login flow works
- [ ] Can save MTB settings
- [ ] Can save jig measurement
- [ ] Can view history
- [ ] Offline queue works
- [ ] Admin can edit/delete
- [ ] Coach is read-only

### UI

- [ ] No layout breaks on iPhone SE (small)
- [ ] No layout breaks on iPhone 15 Pro Max (large)
- [ ] Safe areas respected
- [ ] Touch targets >= 44px

### Data

- [ ] No data loss during save
- [ ] Timestamps accurate
- [ ] Created_by field populated
- [ ] History sorted correctly

---

## Test Data

### Test Accounts

| Email | Role | Use For |
|-------|------|---------|
| admin@test.com | admin | Admin tests |
| mechanic@test.com | mechanic | Mechanic tests |
| coach@test.com | coach | Coach tests |

### Test Riders

| Name | Use For |
|------|---------|
| Tom | Primary test rider |
| Sam | Secondary test rider |

### Test Values

```javascript
// Jig measurement
{
  saddle_height: 745,
  saddle_setback: 52,
  handlebar_reach: 480,
  handlebar_drop: 125,
}

// MTB settings
{
  fork_psi: 85,
  shock_psi: 180,
  tire_front_psi: 22,
  tire_rear_psi: 24,
}
```

---

## Bug Report Template

```markdown
## Summary
Brief description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Device: iPhone 15 Pro
- iOS: 17.3
- Role: Mechanic
- Online/Offline: Online
- Theme: Dark

## Screenshots
(if applicable)

## Diagnostics Dump
(paste from diagnostics panel)
```
