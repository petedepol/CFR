# CFR V3 User Flows

## Flow 1: Race Bike Quick Edit (1 Tap)

**Optimized for 95% use case**

```
Home Screen
    │
    ▼
┌─────────────────────────────────────┐
│  Rider Avatars (circular)           │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │
│  │Tom│ │Sam│ │Ana│ │Max│ │Joe│    │
│  └───┘ └───┘ └───┘ └───┘ └───┘    │
└─────────────────────────────────────┘
    │
    │ TAP rider
    ▼
┌─────────────────────────────────────┐
│  Race Bike Settings Form            │
│  (pre-filled with current values)   │
│                                     │
│  [Save]                             │
└─────────────────────────────────────┘
    │
    │ TAP save
    ▼
✓ Success (queued if offline)
```

**Tap count: 1** (tap rider → form opens)

---

## Flow 2: Jig Measurement (3 Taps)

**For non-race bikes**

```
Bottom Nav: [Riders] tab
    │
    │ TAP
    ▼
┌─────────────────────────────────────┐
│  Select Rider (modal)               │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │
│  │Tom│ │Sam│ │Ana│ │Max│ │Joe│    │
│  └───┘ └───┘ └───┘ └───┘ └───┘    │
└─────────────────────────────────────┘
    │
    │ TAP rider (1)
    ▼
┌─────────────────────────────────────┐
│  Tom's Bikes                        │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │Training│ │  Road  │ │ E-Bike │  │
│  └────────┘ └────────┘ └────────┘  │
└─────────────────────────────────────┘
    │
    │ TAP bike (2)
    ▼
┌─────────────────────────────────────┐
│  Tom · Training Bike                │
│  ┌─────────────┐ ┌─────────────┐   │
│  │     JIG     │ │    SPEC     │   │
│  │ Measurements│ │  Full Spec  │   │
│  └─────────────┘ └─────────────┘   │
└─────────────────────────────────────┘
    │
    │ TAP JIG (3)
    ▼
┌─────────────────────────────────────┐
│  Jig Measurement Form               │
│  (fields for fit measurements)      │
│                                     │
│  [Save]                             │
└─────────────────────────────────────┘
```

**Tap count: 3** (Riders tab → rider → bike → jig)

---

## Flow 3: Full Spec Entry (3 Taps)

Same as Flow 2, but select **SPEC** instead of **JIG** at step 3.

---

## Flow 4: View History

```
Bottom Nav: [Riders] tab
    │
    ▼
Select Rider → Select Bike → Select JIG or SPEC
    │
    ▼
Form opens with [History] button
    │
    │ TAP History
    ▼
┌─────────────────────────────────────┐
│  History for Tom · Training · JIG   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Jan 27, 2026 - 14:32        │   │
│  │ Saddle height: 745mm        │   │
│  │ [View] [Edit*] [Delete*]    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Jan 25, 2026 - 09:15        │   │
│  │ Saddle height: 743mm        │   │
│  │ [View] [Edit*] [Delete*]    │   │
│  └─────────────────────────────┘   │
│                                     │
│  * Admin only                       │
└─────────────────────────────────────┘
```

---

## Flow 5: Coach Read-Only

```
Coach logs in
    │
    ▼
Same UI as mechanic, BUT:
    │
    ├── Edit buttons: DISABLED (grayed)
    ├── Delete buttons: DISABLED (grayed)
    ├── Save buttons: DISABLED (grayed)
    └── Forms: READ-ONLY (no input)

Visual indicator: "Read-only" badge in header
```

---

## Flow 6: Offline Usage

```
User loses connection
    │
    ▼
┌─────────────────────────────────────┐
│  Header shows: [🔴 Offline (2)]     │
│  (2 = items in queue)               │
└─────────────────────────────────────┘
    │
    │ User makes changes
    ▼
Changes queued locally
    │
    │ Connection restored
    ▼
┌─────────────────────────────────────┐
│  Auto-sync starts                   │
│  Header shows: [⟳ Syncing...]       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Header shows: [🟢 Online]          │
│  Queue cleared                      │
└─────────────────────────────────────┘
```

---

## Flow 7: Admin Edit History Entry

```
Admin views history
    │
    │ TAP [Edit] on entry
    ▼
┌─────────────────────────────────────┐
│  Edit Entry                         │
│  (form pre-filled with values)      │
│                                     │
│  [Cancel] [Save Changes]            │
└─────────────────────────────────────┘
    │
    │ TAP Save
    ▼
Entry updated, timestamp preserved
```

---

## Flow 8: Admin Delete History Entry

```
Admin views history
    │
    │ TAP [Delete] on entry
    ▼
┌─────────────────────────────────────┐
│  Confirm Delete?                    │
│                                     │
│  "Delete measurement from           │
│   Jan 27, 2026?"                    │
│                                     │
│  [Cancel] [Delete]                  │
└─────────────────────────────────────┘
    │
    │ TAP Delete
    ▼
Entry removed from database
```

---

## Navigation Structure

```
┌──────────────────────────────────────────────┐
│                 BOTTOM NAV                   │
├──────────┬──────────┬──────────┬────────────┤
│ Dashboard│   Home   │  Riders  │   Admin    │
│ (future) │          │          │            │
├──────────┼──────────┼──────────┼────────────┤
│ Schedule │ Race bike│ All bikes│ History    │
│ Weather  │ settings │ Jig/Spec │ Edit/Delete│
│ Checklist│ (1 tap)  │ (3 taps) │ Users      │
└──────────┴──────────┴──────────┴────────────┘
```
