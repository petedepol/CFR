# CFR V3 Vision

## Problem Statement

Professional cycling teams need a fast, reliable way to track and update bike setup data during race weeks. Mechanics must quickly access and modify rider configurations, often in high-pressure environments with poor connectivity.

## Target Users

| Role | Count | Primary Need |
|------|-------|--------------|
| Admin | 1 | Full system access, user management |
| Mechanic | 2-3 | Quick data entry, offline reliability |
| Coach | 1-2 | Read-only view of all rider data |

**Total: ~5 users** (small team, no complex permissions needed)

## Core Use Cases

1. **Race Day Settings** (95% of usage)
   - Mechanic taps rider → edits race bike setup
   - Must work offline
   - Must be fast (under 3 taps)

2. **Jig Measurements**
   - Record rider fit measurements
   - Compare across bikes
   - Track changes over time

3. **Full Bike Spec**
   - Complete component list
   - Service history reference
   - Pre-race verification

## Non-Goals (Out of Scope)

- Multi-team support (single team only)
- Public-facing features
- Complex role hierarchies
- Desktop-optimized UI
- Android support (iOS PWA only)
- Real-time collaboration
- Inventory management
- Financial tracking

## Why iOS PWA Only

1. **Team uses iPhones** - All mechanics have iOS devices
2. **PWA advantages**:
   - No App Store approval process
   - Instant updates
   - Works offline via service worker
   - Home screen installable
3. **Safari-specific optimizations** - Safe area insets, standalone mode

## Success Metrics

- **Speed**: Race bike update < 3 taps, < 10 seconds
- **Reliability**: Works offline, syncs when back online
- **Adoption**: All 5 users actively using within 1 week

## V2 → V3 Evolution

V2 is **working** - this is an evolution, not a rewrite.

| Aspect | V2 (Current) | V3 (Target) |
|--------|--------------|-------------|
| Auth | Email OTP | Same |
| Data | Jig + MTB settings | + Race dashboard |
| Roles | Admin/User | Admin/Mechanic/Coach |
| UI | Functional | Modern, iOS-native feel |
| Offline | Basic queue | Improved reliability |
