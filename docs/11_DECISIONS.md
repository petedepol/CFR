# CFR V3 Decision Log

Running log of architectural and design decisions.

---

## 2026-01-27

### D001: Keep Email OTP Authentication

**Context:** Evaluating whether to change auth method for V3.

**Decision:** Keep existing Email OTP via Supabase.

**Rationale:**
- Already works and is tested
- Simple for 5 users
- No password management headaches
- Supabase handles delivery

**Alternatives Considered:**
- Password auth: More friction, forgotten passwords
- Social login: Overkill for 5 known users
- Passkeys: Promising but adds complexity

---

### D002: Simple RLS (Everyone Sees All)

**Context:** How to handle row-level security with 3 roles.

**Decision:** All authenticated users can read all data. Write/delete restricted by role.

**Rationale:**
- Only 5 users, all on same team
- No data needs hiding between users
- Simpler policies, easier debugging

**Alternatives Considered:**
- Per-user data isolation: Unnecessary complexity
- Team-based RLS: Overkill for single team

---

### D003: Feature Flags in Database

**Context:** How to control feature rollout.

**Decision:** Store flags in `feature_flags` table, read via helper.

**Rationale:**
- Can toggle remotely without deploy
- Simple key/value structure
- Cached for performance

**Alternatives Considered:**
- Environment variables: Requires redeploy
- Code-based flags: Same issue
- LaunchDarkly/similar: Overkill for 5 users

---

### D004: No Bike Registry

**Context:** Whether to create a `bikes` table with bike IDs.

**Decision:** Keep current approach (bike_type field on measurements).

**Rationale:**
- Current system works
- No need to "manage" bikes separately
- Adds unnecessary CRUD
- Bike types are simple enum

**Alternatives Considered:**
- Full bike registry: More code, more UI, same functionality

---

### D005: Defer Service Log

**Context:** User mentioned service log as potential feature.

**Decision:** Defer to future phase, not in V3.0 scope.

**Rationale:**
- Not mentioned as priority
- Core features more important
- Can add later without migration

---

### D006: Open-Meteo for Weather

**Context:** Which weather API to use.

**Decision:** Open-Meteo (free, no API key required).

**Rationale:**
- Free tier sufficient
- No signup/key management
- Good forecast accuracy
- Simple REST API

**Alternatives Considered:**
- OpenWeather: Requires API key
- Weather.gov: US only
- Apple Weather: Requires Apple developer account

---

### D007: WhatsApp Auto-Parse

**Context:** How to import race schedules.

**Decision:** Build a parser that extracts schedule items from pasted WhatsApp text.

**Rationale:**
- User explicitly requested this
- Team shares plans via WhatsApp
- Saves manual entry time

**Implementation:**
- Regex-based parsing
- Time/date extraction
- Manual review before import

---

### D008: Reusable Checklist Templates

**Context:** How to handle race checklists.

**Decision:** Admin creates templates, instantiate per race.

**Rationale:**
- Same checks needed every race
- Templates save time
- Can customize per-race instance
- Clear ownership (admin manages templates)

---

### D009: Orange/Amber Accent Colors

**Context:** V3 color scheme.

**Decision:** Switch from lime-300 to orange-500/amber-400.

**Rationale:**
- User preference based on design inspiration
- Warmer, more energetic feel
- Works well in both dark and light modes
- Aligns with cycling/racing aesthetic

---

### D010: Manual Theme Toggle

**Context:** How to handle theme switching.

**Decision:** Manual toggle button (sun/moon icon) with localStorage persistence.

**Rationale:**
- User wanted to test both light and dark modes
- Manual control gives user choice
- Persists preference across sessions
- Simple implementation with `.dark` CSS class

**Alternatives Considered:**
- Auto via prefers-color-scheme: Less control for testing
- Dark only: User wanted light-first design
- No toggle: Can't preview both themes

---

### D011: Circular Rider Avatars

**Context:** How to display riders in picker.

**Decision:** Circular avatars with initial letter, inspired by food delivery apps.

**Rationale:**
- User liked this in design inspiration
- Compact, recognizable
- Works well at small sizes
- Quick visual identification

---

### D012: Minimal Clock + Avatars Layout

**Context:** Home page layout.

**Decision:** Large clock (84px) + rider avatar grid (3+2 layout) + floating bottom nav. No bento grid.

**Rationale:**
- User's Figma design was minimal, not complex bento
- Clock is the hero element, sets race-day tone
- Avatars are primary interaction (1-tap to settings)
- Clean, uncluttered feel
- Warm gradient background adds luxury without complexity

---

### D013: Light-First Theme

**Context:** Original plan was dark-first, but user created Figma design.

**Decision:** Light mode is primary, dark mode derived. CSS variables in `:root` for light, `.dark` class for dark.

**Rationale:**
- User's Figma export was light-first
- Warm cream-to-white gradient looks better as primary
- Dark mode still fully supported via toggle
- oklch colors for consistent appearance

---

### D014: Warm Gradient Background

**Context:** User wanted "luxury touch" for background.

**Decision:** Subtle gradient backgrounds instead of flat colors.

**Implementation:**
- Light: `linear-gradient(180deg, #fffbf5 0%, #ffffff 100%)` (cream to white)
- Dark: `linear-gradient(180deg, #1a1815 0%, #0a0a0a 100%)` (warm dark)
- Orange blur accents in corners for depth

**Rationale:**
- Adds premium feel without complexity
- Warm tones match orange accent
- Subtle enough to not distract from content

---

## Template for New Decisions

```markdown
### DXXX: [Title]

**Context:** [Why this decision was needed]

**Decision:** [What was decided]

**Rationale:**
- [Reason 1]
- [Reason 2]
- [Reason 3]

**Alternatives Considered:**
- [Alternative 1]: [Why not chosen]
- [Alternative 2]: [Why not chosen]
```
