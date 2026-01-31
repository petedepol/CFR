# CFR V3 iOS PWA Architecture

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 19.x |
| Build | Vite | 7.x |
| Styling | Tailwind CSS | 4.x |
| Backend | Supabase | 2.90.x |
| Router | React Router | 6.x |
| Icons | Lucide React | Latest |

**No TypeScript** - Plain JavaScript with JSDoc where helpful.

---

## Project Structure

```
src/
├── app/
│   ├── main.jsx          # Entry point
│   └── router.jsx        # Route definitions
│
├── components/           # Shared components
│   ├── AppShell.jsx      # V2 app shell
│   ├── OfflineSyncManager.jsx
│   └── PwaUpdateManager.jsx
│
├── features/             # Feature modules
│   ├── auth/
│   │   ├── AuthProvider.jsx
│   │   ├── LoginPage.jsx
│   │   └── RequireAuth.jsx
│   │
│   ├── measurements/
│   │   └── pages/...
│   │
│   ├── settings/
│   │   └── pages/...
│   │
│   ├── v3/               # V3 landing page
│   │   └── LandingPlayground.jsx
│   │
│   ├── race/             # Future
│   ├── checklists/       # Future
│   └── reports/          # Future
│
├── lib/                  # Utilities
│   ├── supabase.js
│   ├── offlineBikeMeasurementsQueue.js
│   ├── diagnostics.js
│   └── featureFlags.js   # New
│
├── ui/                   # Design tokens
│   ├── styles.js         # V2 tokens
│   └── v3Theme.js        # V3 tokens
│
└── index.css             # Tailwind imports
```

---

## State Management

### Auth State

Managed by `AuthProvider` context:

```javascript
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  // ... role lookup, context value
}
```

### Form State

Local `useState` per form. No global state library needed.

```javascript
function SettingsForm() {
  const [formData, setFormData] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await saveToSupabase(formData);
    } finally {
      setSaving(false);
    }
  };
}
```

### Offline Queue

Stored in `localStorage`:

```javascript
const QUEUE_KEY = 'cfr_offline_queue';

function getQueue() {
  const raw = localStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}
```

---

## PWA Configuration

### vite.config.js

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'CFR Bike Settings',
        short_name: 'CFR',
        description: 'Cycling team bike setup tracker',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
});
```

### Service Worker

Workbox handles:
- Precaching static assets
- Runtime caching for Supabase API
- Offline fallback

---

## iOS Safari Specifics

### Safe Area Insets

```jsx
<div style={{
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
}}>
  {children}
</div>
```

### Viewport Meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### Touch Targets

Minimum 44px for all interactive elements:

```javascript
// In v3Theme.js
btnPrimary: "... min-h-[44px] ..."
```

### No Hover States

All interactions must work on tap. Hover is enhancement only:

```javascript
// Good: works on tap
onClick={() => handleAction()}

// Enhancement only
className="... hover:bg-white/10 ..."
```

---

## Theme System (V3)

### Auto Detection

```javascript
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDark;
}
```

### Style Tokens

```javascript
export const V3 = {
  page: (isDark) => isDark
    ? 'min-h-[100dvh] bg-black text-white'
    : 'min-h-[100dvh] bg-slate-50 text-slate-900',

  // ... more tokens
};
```

### Usage

```jsx
function MyComponent() {
  const isDark = useTheme();
  return <div className={V3.page(isDark)}>...</div>;
}
```

---

## Route Structure

```javascript
// router.jsx
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

  // V3 standalone (no auth for testing)
  { path: '/v3', element: <LandingPlayground /> },

  // Protected routes
  {
    path: '/',
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/settings" /> },
      { path: 'settings', element: <SettingsHome /> },
      { path: 'settings/mtb', element: <MtbSettingsPage /> },
      { path: 'measurements', element: <MeasurementsHome /> },
      { path: 'measurements/quick', element: <QuickEntryPage /> },
      { path: 'measurements/full', element: <FullSpecPage /> },
      { path: 'measurements/history', element: <HistoryPage /> },
      // Future: /race, /checklists, /reports
    ],
  },
]);
```

---

## Performance

### Code Splitting

Heavy pages are lazy-loaded:

```javascript
const QuickEntryPage = lazy(() => import('../features/measurements/pages/QuickEntryPage'));
const FullSpecPage = lazy(() => import('../features/measurements/pages/FullSpecPage'));
```

### Suspense Boundaries

```jsx
<Suspense fallback={<PageFallback />}>
  <Outlet />
</Suspense>
```

### Image Optimization

- Use WebP format
- Lazy load off-screen images
- Provide width/height to prevent layout shift

---

## Error Boundaries

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    addDiag('error', 'react.boundary', {
      message: error.message,
      stack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```
