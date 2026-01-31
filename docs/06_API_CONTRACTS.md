# CFR V3 API Contracts

## Overview

All data access goes through Supabase JS client. No custom backend.

---

## Existing APIs (V2)

### Measurements API

**Location:** Various pages (inline queries)

```javascript
// Create measurement
const { data, error } = await supabase
  .from('bike_measurements')
  .insert({
    rider: 'Tom',
    type: 'jig',
    bike_type: 'race',
    data: { saddle_height: 745, ... },
    created_by: displayName,
  })
  .select()
  .single();

// Read measurements for rider
const { data, error } = await supabase
  .from('bike_measurements')
  .select('*')
  .eq('rider', 'Tom')
  .order('created_at', { ascending: false });

// Update (admin only)
const { error } = await supabase
  .from('bike_measurements')
  .update({ data: { ... } })
  .eq('id', measurementId);

// Delete (admin only)
const { error } = await supabase
  .from('bike_measurements')
  .delete()
  .eq('id', measurementId);
```

---

## New APIs (V3)

### Feature Flags API

**Location:** `src/lib/featureFlags.js`

```javascript
// Get all flags (cached)
const flags = await getFlags();
// Returns: { v3_race_dashboard: true, v3_checklists: false, ... }

// Check single flag
const enabled = await isEnabled('v3_race_dashboard');
// Returns: boolean
```

### Race Events API

**Location:** `src/features/race/api/raceApi.js`

```javascript
// List all events
export async function listRaceEvents() {
  const { data, error } = await supabase
    .from('race_events')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data;
}

// Get single event with schedule
export async function getRaceEvent(id) {
  const { data, error } = await supabase
    .from('race_events')
    .select(`
      *,
      schedule_items:race_schedule_items(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Create event
export async function createRaceEvent(event) {
  const { data, error } = await supabase
    .from('race_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update event
export async function updateRaceEvent(id, updates) {
  const { data, error } = await supabase
    .from('race_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete event
export async function deleteRaceEvent(id) {
  const { error } = await supabase
    .from('race_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

### Schedule Items API

**Location:** `src/features/race/api/raceApi.js`

```javascript
// Add schedule item
export async function addScheduleItem(item) {
  const { data, error } = await supabase
    .from('race_schedule_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Bulk import (from WhatsApp parse)
export async function importScheduleItems(raceEventId, items) {
  const withEventId = items.map(item => ({
    ...item,
    race_event_id: raceEventId,
    source: 'whatsapp_import',
  }));

  const { data, error } = await supabase
    .from('race_schedule_items')
    .insert(withEventId)
    .select();

  if (error) throw error;
  return data;
}

// Toggle completion
export async function toggleScheduleItem(id, completed) {
  const { error } = await supabase
    .from('race_schedule_items')
    .update({ completed })
    .eq('id', id);

  if (error) throw error;
}
```

### Checklists API

**Location:** `src/features/checklists/api/checklistsApi.js`

```javascript
// List templates
export async function listTemplates() {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data;
}

// Create template (admin)
export async function createTemplate(template) {
  const { data, error } = await supabase
    .from('checklist_templates')
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Instantiate checklist for race
export async function createChecklist(raceEventId, templateId, rider = null) {
  // Fetch template
  const { data: template } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  // Create instance with unchecked items
  const items = template.items.map(item => ({
    text: item.text,
    checked: false,
    checked_by: null,
    checked_at: null,
  }));

  const { data, error } = await supabase
    .from('race_checklists')
    .insert({
      race_event_id: raceEventId,
      template_id: templateId,
      rider,
      title: template.name,
      items,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Check/uncheck item
export async function toggleChecklistItem(checklistId, itemIndex, checked, checkedBy) {
  // Fetch current items
  const { data: checklist } = await supabase
    .from('race_checklists')
    .select('items')
    .eq('id', checklistId)
    .single();

  // Update specific item
  const items = [...checklist.items];
  items[itemIndex] = {
    ...items[itemIndex],
    checked,
    checked_by: checked ? checkedBy : null,
    checked_at: checked ? new Date().toISOString() : null,
  };

  // Determine status
  const allChecked = items.every(i => i.checked);
  const anyChecked = items.some(i => i.checked);
  const status = allChecked ? 'completed' : anyChecked ? 'in_progress' : 'pending';

  const { error } = await supabase
    .from('race_checklists')
    .update({ items, status })
    .eq('id', checklistId);

  if (error) throw error;
}
```

### Weather API

**Location:** `src/features/race/api/weatherApi.js`

```javascript
// Open-Meteo (free, no API key)
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export async function fetchWeather(latitude, longitude, raceEventId) {
  // Check cache first
  const { data: cached } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('race_event_id', raceEventId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached) {
    return cached.forecast_json;
  }

  // Fetch from API
  const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto`;

  const response = await fetch(url);
  const forecast = await response.json();

  // Cache for 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await supabase
    .from('weather_cache')
    .upsert({
      race_event_id: raceEventId,
      fetched_at: new Date().toISOString(),
      forecast_json: forecast,
      expires_at: expiresAt,
    });

  return forecast;
}
```

---

## Error Handling

### Standard Pattern

```javascript
try {
  const data = await someApiCall();
  // Success
} catch (error) {
  // Log for diagnostics
  addDiag('error', 'api.someCall', { message: error.message });

  // Show user-friendly message
  alert('Something went wrong. Please try again.');
}
```

### Offline Handling

```javascript
// Check if offline before API call
if (!navigator.onLine) {
  // Queue for later
  queueForSync({ type: 'create_measurement', data: formData });
  return { queued: true };
}

// Proceed with API call
const result = await createMeasurement(formData);
return { queued: false, data: result };
```

---

## Offline Queue Contract

**Location:** `src/lib/offlineBikeMeasurementsQueue.js`

```javascript
// Add to queue
export function enqueue(item) {
  const queue = getQueue();
  queue.push({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...item,
  });
  saveQueue(queue);
  dispatchQueueEvent();
}

// Process queue
export async function processQueue() {
  const queue = getQueue();
  const failed = [];

  for (const item of queue) {
    try {
      await processItem(item);
    } catch (error) {
      failed.push(item);
    }
  }

  saveQueue(failed);
  dispatchQueueEvent();
}

// Get count
export function getBikeMeasurementsQueueCount() {
  return getQueue().length;
}
```

---

## Response Shapes

### Success

```javascript
{
  data: { ... },
  error: null
}
```

### Error

```javascript
{
  data: null,
  error: {
    message: "Row not found",
    code: "PGRST116",
    details: null
  }
}
```

### Queued (Offline)

```javascript
{
  queued: true,
  queueId: "uuid",
  data: null
}
```
