// src/features/measurements/utils/fullSpecDefaults.js

/**
 * Bike Spec (Full Spec) template.
 *
 * Stored as JSON in bike_measurements.full_spec.
 * Safe to evolve: new keys appear blank on older records; removed keys are simply not shown.
 */

// Keep insertion order = section order in UI.
const FULL_SPEC_TEMPLATE = {
  frame: {
    size: "",
    link: "",
    chain_guard: "",
    notes: "",
  },

  cockpit: {
    saddle: "",
    stem: "",
    spacers_under: "", // mm
    bars: "",
    grips: "",
    dropper: "",
    dropper_lever: "",
    lockout_lever: "",
    distance_to_brake_lever: "", // mm
    distance_to_dropper_lever: "", // mm
    i_spec_adapter_hole: "",
    garmin_mount: "",
  },

  drivetrain: {
    crank_set: "",
    pedals: "",
    pedal_clicks: "", // number
  },

  brakes: {
    levers: "",
    calipers: "",
    pads: "",
  },

  suspension: {
    shock_and_tune: "",
    fork_and_tune: "",
  },

  other: {
    bottle_cage: "",
    other_info: "",
  },
};

function makeTemplate() {
  return JSON.parse(JSON.stringify(FULL_SPEC_TEMPLATE));
}

// FULL_SPEC_DEFAULTS includes MTB/Road/CX buckets.
// MTB is the normal default; Road/CX are rarely used but available.
export const FULL_SPEC_DEFAULTS = {
  mtb: makeTemplate(),
  road: makeTemplate(),
  cx: makeTemplate(),
};

// Export template too (useful for normalization/merging)
export const FULL_SPEC_TEMPLATE_EXPORT = FULL_SPEC_TEMPLATE;
