// src/features/dashboard/api/dailyPlansApi.js
// CRUD operations for daily plans

import { supabase } from "../../../lib/supabaseClient.js";

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

// ============================================================================
// FETCH
// ============================================================================

/**
 * Fetch plan for a specific date
 */
export async function fetchPlanByDate(date) {
  const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0];

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("plan_date", dateStr)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  });
}

/**
 * Fetch plans for a date range
 */
export async function fetchPlansInRange(startDate, endDate) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("daily_plans")
      .select("*")
      .gte("plan_date", startDate)
      .lte("plan_date", endDate)
      .order("plan_date", { ascending: true });

    if (error) throw error;
    return data ?? [];
  });
}

// ============================================================================
// CREATE / UPDATE
// ============================================================================

/**
 * Create or update a plan for a date
 * Uses upsert to handle both cases
 */
export async function savePlan({
  planDate,
  event,
  location,
  locationLat,
  locationLon,
  radioChannel,
  planData,
  createdBy,
}) {
  const dateStr = typeof planDate === "string" ? planDate : planDate.toISOString().split("T")[0];

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("daily_plans")
      .upsert(
        {
          plan_date: dateStr,
          event,
          location,
          location_lat: locationLat,
          location_lon: locationLon,
          radio_channel: radioChannel,
          plan_data: planData,
          updated_by: createdBy,
        },
        {
          onConflict: "plan_date",
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Update just the plan_data (for task toggles, etc.)
 */
export async function updatePlanData(planId, planData, updatedBy) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("daily_plans")
      .update({
        plan_data: planData,
        updated_by: updatedBy,
      })
      .eq("id", planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Toggle a task's completed status
 */
export async function toggleTask(planId, taskId, completedBy) {
  // First fetch the plan
  const { data: plan, error: fetchError } = await supabase
    .from("daily_plans")
    .select("plan_data")
    .eq("id", planId)
    .single();

  if (fetchError) throw fetchError;
  if (!plan) throw new Error("Plan not found");

  // Update the task
  const planData = { ...plan.plan_data };
  const tasks = planData.tasks || [];
  const taskIndex = tasks.findIndex((t) => t.id === taskId);

  if (taskIndex === -1) throw new Error("Task not found");

  const task = tasks[taskIndex];
  tasks[taskIndex] = {
    ...task,
    completed: !task.completed,
    completedBy: !task.completed ? completedBy : null,
    completedAt: !task.completed ? new Date().toISOString() : null,
  };

  planData.tasks = tasks;

  // Save back
  return updatePlanData(planId, planData, completedBy);
}

// ============================================================================
// DELETE
// ============================================================================

/**
 * Delete a plan
 */
export async function deletePlan(planId) {
  return withRetry(async () => {
    const { error } = await supabase
      .from("daily_plans")
      .delete()
      .eq("id", planId);

    if (error) throw error;
    return { ok: true };
  });
}

// ============================================================================
// GEOCODING
// ============================================================================

/**
 * Geocode a location string to lat/lon using Open-Meteo
 */
export async function geocodeLocation(locationString) {
  if (!locationString?.trim()) return null;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      locationString
    )}&count=1`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Geocoding failed");

    const data = await response.json();

    if (!data.results?.length) return null;

    const result = data.results[0];
    return {
      lat: result.latitude,
      lon: result.longitude,
      name: result.name,
      country: result.country,
    };
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}

// ============================================================================
// AI PARSING
// ============================================================================

/**
 * Parse WhatsApp text using Supabase Edge Function + OpenAI
 */
export async function parseWithAI(text) {
  // Get the Supabase URL and anon key from the client
  const supabaseUrl = supabase.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) {
    throw new Error("Not authenticated — please log in and try again.");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/parse-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseAnonKey,
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI parsing failed: ${error}`);
  }

  return response.json();
}
