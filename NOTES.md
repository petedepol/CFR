# Bike App V2 — Notes

## Snapshot
- Goal: stable mobile workflow (switch apps / tab out) without hangs.
- Current mechanic display: `displayName` (default: **Pete**).

## What’s working
- Riders load reliably (no more infinite loading after tab/app switch).
- Jig Update / Bike Spec saves are guarded by hard timeouts (no endless spinners).
- Auth recovers on resume (focus / visibility change) and refreshes session.
- History view loads and shares latest jig update (copy/share).

## Cleanup done
- Removed `mech=` from navigation/URLs (mechanic is internal).
- Removed most manual Reload/Retry buttons (self-healing + status text).
- Added a tiny global status pill (online/offline + last OK time) in AppShell.
- Added hard-reload cooldown to avoid reload loops when Supabase/network is down.

## Pending (if anything comes up)
- If you ever want multi-mechanic support later: replace `displayName` with a mapping from login email → mechanic name.
- Bike Settings module: plan schema/UX and reuse the same save/timeout patterns.

## Repo hygiene
- Keep **only this** NOTES.md at repo root.
