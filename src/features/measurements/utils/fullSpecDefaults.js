// src/features/measurements/utils/fullSpecDefaults.js

const FULL_SPEC_TEMPLATE = {
  frame: { size: "", notes: "" },
  saddle: { model: "", setback: "", heightAt4cm: "", heightAt15cm: "", angle: "" },
  cockpit: { stemModel: "", spacerUnderStem: "", grips: "", handlebarModel: "" },
  drivetrain: { crankLength: "", pedalsAxle: "" },
  seatpost: { model: "", leverOption: "" },
  brakes: { model: "", leverAngle: "", clampToEndBar: "" },
  suspension: { shockTune: "", forkTune: "" },
  wheels: { tyres: "", pressureFront: "", pressureRear: "" },
  basesettings: { forkPsi: "", shockPsi: "", bottleCage: "" },
};

function makeTemplate() {
  return JSON.parse(JSON.stringify(FULL_SPEC_TEMPLATE));
}

// Now FULL_SPEC_DEFAULTS includes MTB/Road/CX buckets.
// MTB is the normal default; Road/CX are rarely used but available.
export const FULL_SPEC_DEFAULTS = {
  mtb: makeTemplate(),
  road: makeTemplate(),
  cx: makeTemplate(),
};

// Export template too (useful for normalization/merging)
export const FULL_SPEC_TEMPLATE_EXPORT = FULL_SPEC_TEMPLATE;
