# CFR Bike App - Mechanic's Guide

Quick reference for Cannondale Factory Racing mechanics.

---

## Getting Started

### Login
1. Open the app on your phone/tablet
2. Enter your team email and password
3. You'll land on the **Home Screen** showing the rider grid

### Home Screen
- Tap any **rider avatar** to select them
- Choose a **bike type**: Race, Train, E-Bike, Road, CX
- Pick an action: **JIG**, **SPEC**, or **SERVICE**

---

## JIG Measurements

Quick saddle position checks using the team jig.

### How to Use
1. Select **rider** → **bike** → tap **JIG**
2. Enter measurements:
   - **Saddle Setback** (mm) - distance behind BB
   - **Height at 4cm** (mm) - saddle height measured 4cm from center
   - **Height at 15cm** (mm) - saddle height measured 15cm from center
3. Add **Location** (optional) - e.g., "Team truck", "Hotel"
4. Add **Notes** (optional) - any observations
5. Tap the **orange save button**

### History
- Scroll down to see previous measurements
- Each entry shows date, values, and who measured
- **Baseline comparison** shows deviation from rolling average
- Yellow warning appears if measurements differ significantly (>4mm)

### Compare Feature
- Tap the **columns icon** in the header to compare JIG measurements
- Select two rider/bike combinations
- See side-by-side values with delta (difference) column
- Green = Bike 2 higher, Red = Bike 2 lower
- Use the **swap button** to flip the comparison

### Tips
- Measurements auto-save as drafts while you type
- If you go offline, drafts sync when back online
- Admins can edit/delete historical entries

---

## Bike Spec

Full bike build specifications.

### Categories
- **Frame**: Size, link, chain guard, notes
- **Cockpit**: Saddle, stem, spacers, bars, grips, dropper, levers, Garmin mount
- **Drivetrain**: Crankset, pedals, pedal clicks
- **Brakes**: Levers, calipers, pads
- **Suspension**: Shock + tune, Fork + tune
- **Other**: Bottle cage, other info

### How to Use
1. Select **rider** → **bike** → tap **SPEC**
2. Tap a **category section** to expand it
3. Fill in or update fields
4. Tap the **orange save button**

### History
- Previous builds shown below the form
- Tap to expand and see full details
- Admins can restore, edit, or delete entries

---

## Setup (Race Settings)

Race-day tire and suspension settings.

### Sections

**Event / Context**
- Enter race name and conditions
- Example: "Nove Mesto WC2 / Wet"

**Tyres**
- Front/Rear tyre model (e.g., "Maxxis Assegai")
- Front/Rear pressure in PSI (comma auto-converts to decimal point)
- Inserts (in Advanced section)

**Suspension**
- Fork pressure (PSI)
- Shock pressure (PSI)
- Fork rebound (clicks)
- Shock rebound (clicks)
- Compression settings (in Advanced section)

**Neo Settings**
- Tap the orange **Neo Settings** button
- Upload Fox Live Valve tune screenshots
- Add tune name and notes
- Great for comparing settings across races

**Advanced**
- Tire inserts (CushCore, etc.)
- Fork/shock spacers
- Compression (LSC, HSC)
- Chainring, cassette, wheelset

**Notes**
- Any additional observations

### How to Use
1. Select **rider** → tap **SETUP**
2. Fill in the current setup
3. Tap the **orange save button**
4. Settings collapse after saving (clean slate for next entry)

### Race Marking
- In history, tap the **flag icon** to mark a setup as "Race"
- Helps identify actual race configurations vs. practice

---

## Service Logging

Track parts replaced and maintenance actions.

### Categories
| Category | Items |
|----------|-------|
| **Brakes** | Bleed F/R, Lever L/R, Caliper F/R, Pads F/R, Disc F/R, Hydraulic Hose |
| **Drivetrain** | BB, Crank, Chain, Cassette, Chainring, Rear Mech, Battery, Pedals, etc. |
| **Suspension** | Fork, Shock, DU Bushes, Air Sleeve, Suspension Battery |
| **Frame** | Rear Triangle, Front Triangle, Headset Bearings, Linkage Bearings, Rebuild, Link |
| **Cockpit** | Bars, Stem, Grips, Lockout Lever, Dropper Lever, Saddle, Dropper, Cables, Garmin Mount |
| **Wheels** | Tyre F/R, Wheel F/R, Bearings F/R, Rim Tape F/R, Valves F/R |

### How to Use
1. Select **rider** → **bike** → tap **SERVICE**
2. Tap a **category** to expand it
3. Tap the **action button** (e.g., "Pads F")
4. Action is logged instantly with a toast confirmation
5. Category collapses - ready for next action

### Color Coding
- **Cyan tint**: Left (L) or Front (F) items
- **Amber tint**: Right (R) items

### History
- Recent actions shown at bottom of page
- Tap **"View All →"** for full history
- History grouped by day - tap to expand
- Filter by category using pills at top
- Admins see delete button on each entry

### Leaderboard
- Tap the **trophy icon** in header
- See season totals by rider/bike and by mechanic
- Fun way to track team activity

---

## Settings

Access settings via the **gear icon** in the bottom navigation.

### Account
- Shows logged-in user email
- **Sign Out** button with confirmation dialog

### Data Export (Admin Only)
- Export JIG, Spec, Setup, or Service data
- Filter by rider, bike type, and date range
- Export as PDF or JSON

### Digest (Admin Only)
- Configure automated email summaries
- Weekly or monthly frequency
- Set recipients (coach, mechanic, rider emails)

### App Info
- Version number
- Connection status
- **Clear Local Cache** - removes offline data
- **Send Feedback** link

---

## Tips & Troubleshooting

### Offline Mode
- **Wifi icon** in header shows connection status
- Green/orange = online, gray = offline
- When offline:
  - JIG/Spec/Setup: Drafts saved locally, sync when back online
  - Service: Logging disabled (needs connection)
- "Showing cached data" banner appears when viewing offline data

### Auto-Save Drafts
- All forms auto-save as you type
- If you close the app accidentally, your work is preserved
- Drafts are cleared after successful save

### Admin Features
Admins (based on your account) can:
- Edit historical entries (tap pencil icon)
- Delete entries (tap trash icon)
- Access all rider data

### Quick Navigation
- **Back arrow** always returns to previous screen
- **Rider pill** in header - tap to switch riders
- **Bike pill** in header - tap to switch bikes
- Changes are reflected in URL (shareable links)

### Best Practices
1. Always select the correct **rider** and **bike** before entering data
2. Add **context/location** to help identify entries later
3. Use **notes** for anything unusual
4. Check **history** before making changes to see baseline
5. Log service actions **immediately** after completing work

---

---

## Installing as App (iOS)

For the best experience, add CFR Tools to your home screen:

1. Open the app in **Safari** (not Chrome)
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** in the top right
5. The app now works like a native app with full-screen mode

### Benefits
- Full-screen (no browser bar)
- Works offline (cached data)
- Faster loading
- App icon on home screen

---

## Support

Questions or issues? Contact the team lead or check the app repository.

App version: CFR Bike App V3
