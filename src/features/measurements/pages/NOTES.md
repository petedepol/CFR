# Bike App V2 — Notes

## Snapshot
- Tag: `v2-stable-2026-01-14`
- Goal: stable mobile workflow (switch apps / tab out) without hangs.

## What’s working
- Riders load reliably (no more “stuck loading” after tab/app switch).
- History loads without hanging.
- Supabase requests have a hard timeout (prevents endless spinners).
- Auth resumes on app/tab focus (refreshes session).

## Pending (next)
1) Mechanic name mapping
- Fill `MECH_BY_EMAIL` so it shows “Pete / Cal / Maksym” consistently.

2) Remove remaining “Reload / Retry / Reconnect” UI
- Keep the app self-healing; only show status text if needed.

3) Login UI polish
- Ensure login matches dark theme (no white background).
- Confirm session persists across reloads on the same domain.

4) Labels consistency
- “Jig Update / Jig History”
- “Bike Spec” everywhere (pages + buttons + history filter labels)

5) Bike Spec field cleanup
- Hide duplicated fields: setback, height @4cm, height @15cm.

## Test checklist (do this on mobile)
- Open Jig Update → type one value → switch apps for 10–30s → return → finish → Save.
- Go to History → Back → confirm riders load immediately.
- Repeat once on weak signal / airplane mode toggle (optional).

## Notes / Bugs seen
- Sometimes login screen shows white background (theme/CSS issue).
- Previously: “No API key found in request” (env/config sanity check if it returns).

## Decisions
- No extra reconnect buttons unless absolutely necessary.
- Prefer auto-recover on resume (visibility/focus) + request timeouts.
