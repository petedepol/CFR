# CFR Race App - Testing Manual for Mechanics

**App URL:** https://cfrtools.vercel.app/v3

**Version:** V3
**Date:** February 2026

---

## Before You Start

### Remove the PWA from iPhone (Important!)

For now, please **delete the app from your iPhone home screen** and use it in Safari instead. This avoids some display issues we're working on.

**To remove:**
1. Find the CFR app icon on your home screen
2. Long press until icons wiggle
3. Tap the "−" or "X" to remove
4. Use Safari and go to: **https://cfrtools.vercel.app/v3**

**Tip:** Bookmark the page for quick access.

---

## App Overview

The CFR Race App helps you manage bike setups, track measurements, log service work, and coordinate on race days. Everything syncs in real-time across all devices.

### Riders in the System
- Ana
- Charlie
- Cole
- Luca
- Jolanda

### Bike Types
- Race (Jekyll)
- Training
- E-Bike
- Road
- CX

---

## Pages & Features

### 1. Home Page (`/v3`)

The main hub with rider avatars in a pyramid layout.

**What to test:**
- Tap any rider avatar → should go to Setup page for that rider
- Bottom navigation icons work:
  - Race icon → Race Dashboard
  - House icon → Home (this page)
  - Users icon → Rider selection
  - Settings icon → Settings page

---

### 2. Setup Page (`/v3/setup`)

**Purpose:** Record tire pressures, suspension settings, and drivetrain config for race/training.

**Features to test:**

| Feature | How to Test |
|---------|-------------|
| Rider/Bike selector | Tap the rider name at top → picker opens |
| Event field | Enter race/location name (e.g., "Nove Mesto WC2 / Wet") |
| Tire pressures | Enter front/rear tire names and pressures (psi) |
| Suspension | Enter fork/shock pressure and rebound clicks |
| Neo Settings button | Tap to jump to shock tune images |
| Advanced section | Expand to see inserts, spacers, chainring, cassette, wheels |
| Notes | Add any relevant notes |
| Race toggle | Mark entry as a Race entry (gets highlighted) |
| Save | Tap save → should show success toast |
| History | Scroll down to see past entries |
| History filters | Try "This week" / "30 days" / "All" and "Race only" toggle |
| Expand history entry | Tap an entry to see full details |

**Look for:**
- Changed fields highlighted compared to previous entry
- Race entries have orange border
- Entry shows your name and timestamp

---

### 3. Bike Spec Page (`/v3/spec`)

**Purpose:** Document full bike specifications for each rider/bike type.

**Sections:**
- Frame (size, link, chain guard)
- Cockpit (saddle, stem, spacers, bars, grips, dropper, levers)
- Drivetrain (crank, pedals, clicks, levers)
- Brakes (calipers, pads)
- Suspension (shock tune, fork tune)
- Other (bottle cage, misc info)

**Features to test:**

| Feature | How to Test |
|---------|-------------|
| Switch rider/bike | Use picker at top |
| Fill in specs | Enter info in any section |
| Save | Tap save → success message |
| History | View past 10 entries below the form |
| Expand history | Tap entry to see what was recorded |
| Draft auto-save | Fill fields, leave page, come back → should restore |

---

### 4. JIG Page (`/v3/jig`)

**Purpose:** Track geometry measurements (saddle setback, heights at 4cm and 15cm).

**Features to test:**

| Feature | How to Test |
|---------|-------------|
| Measurements | Enter Saddle Setback, Height at 4cm, Height at 15cm (mm) |
| Location | Where measurement was taken (e.g., "Team truck") |
| Notes | Any observations |
| Save | Tap save |
| Deviation warning | If measurement changes by 4mm+, you'll see a warning |
| Compare button | Opens modal to compare multiple jigs side-by-side |
| History table | Shows all past measurements with deltas (Δ) |
| Delta colors | Green = increased, Red = decreased |

---

### 5. Neo Settings Page (`/v3/neo`)

**Purpose:** Store Fox Live Valve shock tune screenshots.

**Features to test:**

| Feature | How to Test |
|---------|-------------|
| Select rider | Use picker (Race bike only) |
| Upload image | Tap import, select screenshot from phone |
| Add tune name | Give it a descriptive name |
| Add notes | Any relevant info |
| View images | Tap image to see full-size |
| Edit tune | Change name or notes |
| Delete tune | Remove old tunes |

**Note:** Images must be under 10MB. App keeps last 20 tunes per rider.

---

### 6. Race Dashboard (`/v3/race`)

**Purpose:** Race day command center with schedule, weather, and tasks.

**Features to test:**

| Feature | How to Test |
|---------|-------------|
| Set location | Enter race location → weather loads automatically |
| Weather display | Check temperature, conditions, wind, humidity |
| Hourly forecast | Scroll to see forecast |
| Add schedule item | Manually add time + event |
| AI Import | Paste schedule text → app parses it automatically |
| Todo list | Add tasks, check them off |
| Countdown clock | Shows time until next event |
| Real-time sync | Changes appear on other devices immediately |

**AI Import tips:**
- Paste text with times like "14:30 Ana practice" or "0930 Tech meeting"
- App auto-detects rider names and times

---

### 7. Service Page (`/v3/service`)

**Purpose:** Log maintenance work and track parts costs.

**Features to test:**

| Feature | How to Test |
|---------|-------------|
| Select rider/bike | Use picker |
| Log action | Tap category → tap specific action → logged instantly |
| Recent history | Shows last 5 actions per section |
| Full history drawer | Open to see all service history grouped by date |
| Filter by category | Filter history by service type |
| Leaderboard | View total costs per rider/bike and by mechanic |

**Note:** No save button needed - actions log immediately when tapped.

---

## Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| iOS Safari swipe-back gesture briefly shows modals | Browser limitation - cannot fix | Use back button instead of swiping from left edge |
| PWA may show stale content | Under investigation | Delete PWA, use Safari directly |

---

## Offline Support

The app works offline with some limitations:

- **Reading data:** Cached data available offline
- **Saving data:** Saves queue locally and sync when back online
- **Offline indicator:** Banner appears when offline
- **Cached data banner:** Shows when displaying older cached data

---

## Tips for Testing

1. **Test on your actual phone** - the app is optimized for mobile
2. **Try different riders and bike types** - make sure data stays separate
3. **Check history** - verify your entries appear correctly
4. **Test offline** - turn off WiFi, make changes, reconnect
5. **Report anything weird** - if something doesn't work, note what happened

---

## Reporting Issues

When you find a bug, please note:
- What page you were on
- What you were trying to do
- What happened instead
- Your device (iPhone model, iOS version)
- Screenshot if possible

Send to Pete or log in the team chat.

---

## Quick Reference

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/v3` | Main hub, rider selection |
| Setup | `/v3/setup` | Tire & suspension settings |
| Spec | `/v3/spec` | Full bike specifications |
| JIG | `/v3/jig` | Geometry measurements |
| Neo | `/v3/neo` | Shock tune images |
| Race | `/v3/race` | Race day dashboard |
| Service | `/v3/service` | Maintenance logging |

**Full URL:** https://cfrtools.vercel.app/v3

---

Thanks for testing! Your feedback helps make the app better.
