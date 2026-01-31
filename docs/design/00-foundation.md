# Foundation — Background + Buttons (Cannondale Factory Racing)

## Visual tone
- "Carbon + anodized metal" (premium, calm, tool-first)
- Flat color-first surfaces; metallic feel only on *primary actions*
- Avoid glossy gradients on backgrounds; avoid glow

---

## Color tokens (dark mode foundation)

### Brand
- Brand Orange (primary): `#D24A1F`
- Orange Highlight (sheen): `#E56A3A`
- Orange Shadow: `#A63A17`

- Brand Green (primary): `#1F3D36`
- Green Highlight: `#2E5A50`
- Green Shadow: `#132823`

### Backgrounds / surfaces
- `bg.primary` (app background): `#132823`
- `bg.surface` (raised): `#1F3D36`
- `bg.elevated` (cards/modals): `#2A4B43`

### Text
- `text.primary`: `#F4F6F5`
- `text.secondary`: `#B8C2BE`
- `text.muted`: `#8A9A94`

### Borders
- `border.subtle`: `rgba(255,255,255,0.08)`
- `border.strong`: `rgba(255,255,255,0.14)`

### Overlays
- `overlay.hover`: `rgba(255,255,255,0.04)`
- `overlay.pressed`: `rgba(0,0,0,0.18)`
- `overlay.scrim`: `rgba(0,0,0,0.55)`

---

## Background spec

### App background (default)
- Flat fill: `#132823`
- Optional: very subtle noise/grain (1–2% opacity) for "material" feel

### Elevation rules
- Instead of big shadows, use:
  - slightly lighter surface color
  - 1px border with `border.subtle`
  - very soft shadow only if needed (low contrast)

---

## Buttons

### Common
- Height: 44–48px
- Radius: 12px
- Horizontal padding: 16–18px
- Label: 13–14px, weight 600
- No all-caps

### Primary (Factory Orange — metallic)
- Background gradient: `linear-gradient(180deg, #E56A3A 0%, #D24A1F 100%)`
- Text: `#FFFFFF`
- Top highlight: `inset 0 1px 0 rgba(255,255,255,0.16)`
- Border: `1px solid rgba(0,0,0,0.25)`
- Pressed: darken ~6% and reduce highlight

States:
- Hover: add `overlay.hover`
- Pressed: translateY(1px) + `overlay.pressed`
- Disabled: bg `rgba(210,74,31,0.35)` text `rgba(255,255,255,0.55)`

### Secondary (Racing Green)
- Background: `#2E5A50`
- Text: `#F4F6F5`
- Border: `1px solid rgba(255,255,255,0.10)`
- Hover: `overlay.hover`
- Pressed: `overlay.pressed`

### Ghost / Utility
- Background: transparent
- Text/Icon: `#B8C2BE` (or muted for less emphasis)
- Hover: `overlay.hover`
- Pressed: `overlay.pressed`

---

## Don'ts
- No neon glows
- No radial spotlight backgrounds
- No fully flat orange blocks without sheen (it should feel anodized)
