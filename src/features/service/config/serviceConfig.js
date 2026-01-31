// Service Module Configuration
// Actions (for UI) + Prices (hidden UI; used for leaderboard)

export const ACTIONS = {
  Brakes: [
    { base: "Bleed", split: ["F", "R"] },
    { base: "Lever", split: ["L", "R"] },
    { base: "Caliper", split: ["F", "R"] },
    { base: "Pads", split: ["F", "R"] },
    { base: "Disc", split: ["F", "R"] },
    { base: "Hydraulic Hose" },
  ],

  Drivetrain: [
    { base: "Bottom Bracket" },
    { base: "Crank" },
    { base: "Chain" },
    { base: "Cassette" },
    { base: "Chainring" },
    { base: "Rear Mech" },
    { base: "Battery" },
    { base: "Pedals" },
    { base: "Chainring Bolts" },
    { base: "Chain-guard" },
    { base: "SRM" },
  ],

  Suspension: [
    { base: "Fork" },
    { base: "Shock" },
    { base: "DU Bushes" },
    { base: "Air Sleeve" },
    { base: "Suspension Battery" },
  ],

  Frame: [
    { base: "Rear Triangle" },
    { base: "Front Triangle" },
    { base: "Headset Bearings" },
    { base: "Linkage Bearings" },
    { base: "Rebuild" },
    { base: "Link" },
  ],

  Cockpit: [
    { base: "Bars" },
    { base: "Stem" },
    { base: "Grips" },
    { base: "Lockout Lever" },
    { base: "Dropper Lever" },
    { base: "Saddle" },
    { base: "Dropper" },
    { base: "Cable Inner" },
    { base: "Cable Outer" },
    { base: "Garmin Mount" },
  ],

  Wheels: [
    { base: "Tyre", split: ["F", "R"] },
    { base: "Wheel", split: ["F", "R"] },
    { base: "Bearings", split: ["F", "R"] },
    { base: "Rim Tape", split: ["F", "R"] },
    { base: "Valves", split: ["F", "R"] },
  ],
};

export const ACTION_PRICE_EUR = {
  // Brakes
  "Bleed F": 20,
  "Bleed R": 20,
  "Lever L": 80,
  "Lever R": 80,
  "Caliper F": 100,
  "Caliper R": 100,
  "Pads F": 20,
  "Pads R": 20,
  "Disc F": 50,
  "Disc R": 50,
  "Hydraulic Hose": 20,

  // Drivetrain
  "Bottom Bracket": 25,
  "Crank": 230,
  "Chain": 40,
  "Cassette": 400,
  "Chainring": 50,
  "Rear Mech": 550,
  "Battery": 40,
  "Pedals": 130,
  "Chainring Bolts": 20,
  "Chain-guard": 0,
  "SRM": 1500,

  // Suspension
  "Fork": 1300,
  "Shock": 1000,
  "DU Bushes": 10,
  "Air Sleeve": 40,
  "Suspension Battery": 100,

  // Frame
  "Rear Triangle": 1500,
  "Front Triangle": 2500,
  "Headset Bearings": 40,
  "Linkage Bearings": 60,
  "Rebuild": 50,
  "Link": 100,

  // Cockpit
  "Bars": 200,
  "Stem": 120,
  "Grips": 20,
  "Lockout Lever": 100,
  "Dropper Lever": 80,
  "Saddle": 120,
  "Dropper": 400,
  "Cable Inner": 10,
  "Cable Outer": 10,
  "Garmin Mount": 20,

  // Wheels
  "Tyre F": 60,
  "Tyre R": 60,
  "Wheel F": 1000,
  "Wheel R": 1000,
  "Bearings F": 50,
  "Bearings R": 50,
  "Rim Tape F": 10,
  "Rim Tape R": 10,
  "Valves F": 10,
  "Valves R": 10,
};

// Category order for UI
export const CATEGORY_ORDER = [
  "Brakes",
  "Drivetrain",
  "Suspension",
  "Frame",
  "Cockpit",
  "Wheels",
];

// Helper to get price for an action label
export function getPrice(actionLabel) {
  return ACTION_PRICE_EUR[actionLabel] ?? 0;
}

// Helper to build action label from base + variant
export function buildActionLabel(base, variant) {
  return variant ? `${base} ${variant}` : base;
}
