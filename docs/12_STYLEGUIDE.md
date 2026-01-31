# CFR V3 Style Guide

## Design Philosophy

- **Mobile-first:** Designed for iOS Safari PWA
- **Touch-friendly:** Minimum 44px targets
- **Glanceable:** Important info visible immediately
- **Light-first:** Light mode is primary, dark mode derived

---

## Color Palette (CSS Variables)

### Light Mode (Primary)

| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| Background | `--background` | #ffffff | Page background |
| Background Gradient | `--background-gradient` | linear-gradient(180deg, #fffbf5 0%, #ffffff 100%) | Warm luxury feel |
| Foreground | `--foreground` | oklch(0.145 0 0) | Primary text |
| Primary | `--primary` | #030213 | Buttons, emphasis |
| Muted | `--muted` | #ececf0 | Disabled states |
| Muted Foreground | `--muted-foreground` | #717182 | Secondary text |
| Accent | `--accent` | #e9ebef | Hover states |
| Destructive | `--destructive` | #d4183d | Delete, errors |
| Border | `--border` | rgba(0,0,0,0.1) | Borders |
| Input Background | `--input-background` | #f3f3f5 | Form inputs |

### Dark Mode (Derived)

| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| Background | `--background` | oklch(0.145 0 0) | Page background |
| Background Gradient | `--background-gradient` | linear-gradient(180deg, #1a1815 0%, #0a0a0a 100%) | Warm dark feel |
| Foreground | `--foreground` | oklch(0.985 0 0) | Primary text |
| Primary | `--primary` | oklch(0.985 0 0) | Buttons, emphasis |
| Muted | `--muted` | oklch(0.269 0 0) | Disabled states |
| Border | `--border` | oklch(0.269 0 0) | Borders |
| Input Background | `--input-background` | oklch(0.2 0 0) | Form inputs |

### Accent Colors (Orange)

- Active nav: `text-orange-500` (#f97316)
- Avatar ring: `from-orange-500 to-amber-400` gradient
- Save button: `bg-orange-500` with shadow
- Section headers: `text-orange-500/80`
- Selection: `selection:bg-orange-500/30`

---

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

This gives SF Pro on iOS, matching native apps perfectly.

### Scale (V3 Figma Design)

| Element | Classes | Size |
|---------|---------|------|
| Clock | `text-[84px] font-bold tracking-tighter leading-none` | 84px |
| Tagline | `text-xs font-bold uppercase tracking-[0.2em] text-orange-500` | 12px |
| Section Header | `text-xs font-bold uppercase tracking-widest text-orange-500/80` | 12px |
| Modal Title | `text-xl font-bold` | 20px |
| Body | `text-base font-medium` | 16px |
| Input Label | `text-[13px] font-medium text-foreground/50` | 13px |
| Helper | `text-[10px] uppercase font-bold tracking-[0.3em] text-foreground/40` | 10px |
| Rider Name | `text-sm font-medium text-foreground` | 14px |

---

## Spacing

### Base Unit

4px (Tailwind default)

### Common Values

| Name | Class | Pixels | Usage |
|------|-------|--------|-------|
| xs | `p-1` | 4px | Tight padding |
| sm | `p-2` | 8px | Small gaps |
| md | `p-3` | 12px | Default padding |
| lg | `p-4` | 16px | Card padding |
| xl | `p-5` | 20px | Section spacing |
| 2xl | `p-6` | 24px | Large sections |

### Page Layout

```jsx
<main className="max-w-lg mx-auto px-6 pt-24 pb-32 min-h-screen flex flex-col">
  {/* pt-24 for header space, pb-32 for bottom nav */}
</main>
```

---

## Border Radius

| Size | Class | Pixels | Usage |
|------|-------|--------|-------|
| Small | `rounded-xl` | 12px | Pills, chips |
| Medium | `rounded-2xl` | 16px | Buttons, inputs |
| Large | `rounded-3xl` | 24px | Cards |
| XL | `rounded-[32px]` | 32px | Bottom sheet modals |
| Full | `rounded-full` | 50% | Avatars, nav pill |

---

## Components

### Avatar (Orange Gradient Ring)

```jsx
<button className="flex flex-col items-center gap-2 transition-transform active:scale-95">
  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 p-[2px]">
    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
      <span className="text-lg font-bold text-foreground">{initial}</span>
    </div>
  </div>
  <span className="text-sm font-medium text-foreground">{name}</span>
</button>
```

### Primary Button (Orange)

```jsx
<motion.button
  whileTap={{ scale: 0.96 }}
  className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-[0_8px_30px_rgb(249,115,22,0.3)] active:shadow-none transition-shadow"
>
  <Save size={20} />
  Save Settings
</motion.button>
```

### Secondary Button

```jsx
<button className="p-2 rounded-full bg-foreground/5 text-foreground/50 active:scale-90 transition-transform">
  <X size={20} />
</button>
```

### Bottom Navigation (Floating Pill)

```jsx
<nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
  <div className="mx-auto max-w-lg px-6 py-3">
    <div className="flex items-center justify-around rounded-full bg-background/80 backdrop-blur-xl border border-foreground/10 px-2 py-1 shadow-lg">
      {/* Nav items */}
    </div>
  </div>
</nav>
```

### Nav Item

```jsx
<button className="flex flex-col items-center gap-1 py-2 px-4 transition-all">
  <Icon size={22} className={active ? "text-orange-500" : "text-foreground/40"} />
  <span className={`text-[10px] font-medium ${active ? "text-orange-500" : "text-foreground/40"}`}>
    {label}
  </span>
</button>
```

### Bottom Sheet Modal (vaul)

```jsx
<Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
    <Drawer.Content className="bg-background flex flex-col rounded-t-[32px] h-[92%] mt-24 fixed bottom-0 left-0 right-0 z-50 outline-none">
      {/* Handle */}
      <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-foreground/10 mb-6" />
      {/* Content */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

### Form Input

```jsx
<input
  type="text"
  inputMode="decimal"
  className="w-full px-4 py-3 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-foreground/20 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all"
/>
```

### Form Textarea

```jsx
<textarea
  className="w-full h-32 px-4 py-3 rounded-2xl bg-input-background border border-border text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
/>
```

---

## Background Effects

### Warm Gradient Base

```css
/* Light mode - subtle cream to white */
background: linear-gradient(180deg, #fffbf5 0%, #ffffff 100%);

/* Dark mode - subtle warm dark */
background: linear-gradient(180deg, #1a1815 0%, #0a0a0a 100%);
```

### Corner Blur Accents

```jsx
<div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
  <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
  <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
</div>
```

---

## Animations (motion/react)

### Staggered Entrance

```jsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.1 * index + 0.4 }}
/>
```

### Button Press

```jsx
<motion.button whileTap={{ scale: 0.96 }} />
```

### Active Scale (CSS)

```jsx
className="active:scale-95 transition-transform"
```

### Fade In

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
/>
```

---

## iOS Specifics

### Safe Areas

```css
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}

.pt-safe {
  padding-top: env(safe-area-inset-top);
}
```

### Touch Targets

Minimum 44px height/width for all interactive elements.

### Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### Status Bar

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

---

## Theme Implementation

### CSS Variables (v3Theme.css)

Theme is controlled via CSS variables on `:root` and `.dark` class.

### Toggle Theme (Manual)

```jsx
const [isDark, setIsDark] = useState(false);

useEffect(() => {
  const saved = localStorage.getItem("cfr_theme");
  if (saved === "dark") {
    document.documentElement.classList.add("dark");
    setIsDark(true);
  }
}, []);

const toggleTheme = () => {
  const newIsDark = !isDark;
  setIsDark(newIsDark);
  if (newIsDark) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("cfr_theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("cfr_theme", "light");
  }
};
```

### Toggle Button

```jsx
<button
  onClick={toggleTheme}
  className="fixed top-6 right-6 z-50 p-3 rounded-full bg-foreground/5 border border-foreground/10 text-foreground/60 hover:bg-foreground/10 active:scale-95 transition-all"
  aria-label="Toggle theme"
>
  {isDark ? <Sun size={20} /> : <Moon size={20} />}
</button>
```

---

## Icons (Lucide React)

### Common Icons

| Icon | Component | Usage |
|------|-----------|-------|
| Home | `<Home />` | Navigation |
| Users | `<Users />` | Riders |
| Settings | `<Settings />` | Admin |
| LayoutDashboard | `<LayoutDashboard />` | Dashboard |
| Save | `<Save />` | Save button |
| X | `<X />` | Close |
| ChevronRight | `<ChevronRight />` | List navigation |
| Sun | `<Sun />` | Light mode |
| Moon | `<Moon />` | Dark mode |

### Icon Sizes

| Context | Size | Class |
|---------|------|-------|
| Navigation | 22px | `size={22}` |
| Button icon | 20px | `size={20}` |
| List chevron | 20px | `size={20}` |

---

## Dependencies

```json
{
  "vaul": "^1.0.0",           // Bottom sheet drawer
  "motion": "^11.0.0",         // Animations (framer-motion)
  "sonner": "^1.0.0",          // Toast notifications
  "lucide-react": "^0.300.0"   // Icons
}
```

---

## File Structure

```
src/
  ui/
    v3Theme.css              # CSS variables
  features/v3/
    LandingPlayground.jsx    # Main V3 page
    components/
      Avatar.jsx             # Orange ring avatar
      BottomNav.jsx          # Floating pill nav
      BikeSettingsModal.jsx  # Settings form drawer
      RidersModal.jsx        # Rider list drawer
```
