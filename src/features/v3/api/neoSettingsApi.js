// src/features/v3/api/neoSettingsApi.js
// API for Neo (Fox Live Valve) shock tune image storage

import { supabase } from "../../../lib/supabaseClient.js";

// Reuse the "settings_mtb" base type so we stay within the DB CHECK constraint.
// Neo records are distinguished by bike_type = "neo".
const TYPE = "settings_mtb";
const BIKE_TYPE_NEO = "neo";

// Simple retry wrapper
async function withRetry(fn, { tries = 2 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw lastErr;
}
const STORAGE_BUCKET = "neo-settings";

// ============================================================================
// FETCH
// ============================================================================

/**
 * Fetch all Neo tunes for a rider
 */
export async function fetchNeoSettingsByRider(rider) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .eq("type", TYPE)
      .eq("bike_type", BIKE_TYPE_NEO)
      .order("timestamp", { ascending: false });

    if (error) throw error;
    return data ?? [];
  });
}

/**
 * Fetch Neo tunes for a specific rider and bike type
 */
export async function fetchNeoSettingsByRiderAndBike(rider, bikeType) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .eq("type", TYPE)
      .eq("bike_type", BIKE_TYPE_NEO)
      .order("timestamp", { ascending: false });

    if (error) throw error;

    // Filter by bike_type in full_spec (JSONB)
    const filtered = (data ?? []).filter(
      (row) => row.full_spec?.bike_type === bikeType
    );
    return filtered;
  });
}

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

/**
 * Upload image to Supabase Storage
 * Returns the public URL
 */
export async function uploadNeoImage(file, rider, mechanic) {
  // Format: rider/mechanic/YYYY-MM-DD_HH-MM-SS.ext
  const now = new Date();
  const dateTime = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const ext = file.name.split(".").pop() || "jpg";
  const safeMechanic = (mechanic || "unknown").replace(/[^a-zA-Z0-9]/g, "_");
  const path = `${rider}/${safeMechanic}/${dateTime}.${ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Image upload error:", error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

// ============================================================================
// INSERT
// ============================================================================

/**
 * Insert a new Neo tune with image
 */
export async function insertNeoSettings({
  rider,
  mechanic,
  bikeType,
  tuneName,
  imageUrl,
  notes = "",
}) {
  const payload = {
    rider,
    mechanic,
    type: TYPE,
    bike_type: BIKE_TYPE_NEO,
    timestamp: new Date().toISOString(),
    full_spec: {
      kind: "neo_settings",
      bike_type: bikeType,
      tune_name: tuneName,
      image_url: imageUrl,
      notes,
    },
    notes, // Denormalized for search
  };

  return withRetry(async () => {
    const { error } = await supabase
      .from("bike_measurements")
      .insert([payload]);

    if (error) throw error;
    return { ok: true };
  });
}

// ============================================================================
// UPDATE
// ============================================================================

/**
 * Update tune name and/or notes
 */
export async function updateNeoSettings(id, { tuneName, notes }) {
  return withRetry(async () => {
    // First fetch existing record
    const { data: existing, error: fetchErr } = await supabase
      .from("bike_measurements")
      .select("id, full_spec")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    // Build updated full_spec
    const updatedFullSpec = {
      ...existing.full_spec,
      tune_name: tuneName ?? existing.full_spec.tune_name,
      notes: notes ?? existing.full_spec.notes,
      edited_at: new Date().toISOString(),
    };

    // Update record
    const { data, error } = await supabase
      .from("bike_measurements")
      .update({
        full_spec: updatedFullSpec,
        notes: notes ?? existing.full_spec.notes,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

// ============================================================================
// DELETE
// ============================================================================

/**
 * Delete a Neo tune (also deletes image from storage)
 */
export async function deleteNeoSettings(id) {
  return withRetry(async () => {
    // First fetch to get image URL for cleanup
    const { data: existing, error: fetchErr } = await supabase
      .from("bike_measurements")
      .select("id, full_spec")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    // Delete from database
    const { error: deleteErr } = await supabase
      .from("bike_measurements")
      .delete()
      .eq("id", id);

    if (deleteErr) throw deleteErr;

    // Try to delete image from storage (best effort)
    const imageUrl = existing?.full_spec?.image_url;
    if (imageUrl) {
      try {
        // Extract path from URL
        const url = new URL(imageUrl);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
        if (pathMatch?.[1]) {
          await supabase.storage.from(STORAGE_BUCKET).remove([pathMatch[1]]);
        }
      } catch (e) {
        console.warn("Could not delete image from storage:", e);
      }
    }

    return { ok: true };
  });
}

// ============================================================================
// CLEANUP - Keep only last 20 per rider
// ============================================================================

/**
 * Clean up old Neo tunes, keeping only the last 20 per rider
 * Deletes oldest entries and their images from storage
 */
export async function cleanupOldNeoSettings(rider, keepCount = 20) {
  try {
    // Fetch all tunes for rider, sorted newest first
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("id, full_spec, timestamp")
      .eq("rider", rider)
      .eq("type", TYPE)
      .eq("bike_type", BIKE_TYPE_NEO)
      .order("timestamp", { ascending: false });

    if (error) throw error;
    if (!data || data.length <= keepCount) return { deleted: 0 };

    // Get entries to delete (everything after the first keepCount)
    const toDelete = data.slice(keepCount);

    // Delete each old entry
    for (const entry of toDelete) {
      try {
        await deleteNeoSettings(entry.id);
      } catch (e) {
        console.warn(`Failed to delete old neo tune ${entry.id}:`, e);
      }
    }

    return { deleted: toDelete.length };
  } catch (e) {
    console.warn("Cleanup failed:", e);
    return { deleted: 0, error: e };
  }
}
