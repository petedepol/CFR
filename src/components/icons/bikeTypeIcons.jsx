// bikeTypeIcons.jsx - Custom CFR-styled bike type icons
// Stroke-only, 2.25 width, round caps/joins

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconRace(props) {
  return (
    <svg {...base} {...props}>
      {/* number plate */}
      <rect x="4.5" y="7" width="15" height="10" rx="2.5" />
      {/* speed lines */}
      <path d="M3 9h1.2M3 12h1.2M3 15h1.2" />
      {/* subtle "R" mark */}
      <path d="M9 14v-4h2.2a1.8 1.8 0 0 1 0 3.6H9" />
      <path d="M11.2 13.6 12.8 15" />
    </svg>
  );
}

export function IconTraining(props) {
  return (
    <svg {...base} {...props}>
      {/* mountain */}
      <path d="M3.5 18 9.5 8l3.2 5 2.2-3L20.5 18" />
      {/* flag */}
      <path d="M9.5 8v3" />
      {/* upward arrow */}
      <path d="M14 14l2.5-2.5L19 14" />
      <path d="M16.5 11.5V16.5" />
    </svg>
  );
}

export function IconRoad(props) {
  return (
    <svg {...base} {...props}>
      {/* road edges */}
      <path d="M8 3 5.5 21" />
      <path d="M16 3 18.5 21" />
      {/* center dashed line */}
      <path d="M12 5v2" />
      <path d="M12 10v2" />
      <path d="M12 15v2" />
      <path d="M12 20v1" />
    </svg>
  );
}

export function IconEBike(props) {
  return (
    <svg {...base} {...props}>
      {/* wheels */}
      <circle cx="8" cy="16" r="3.2" />
      <circle cx="17" cy="16" r="3.2" />
      {/* simple frame */}
      <path d="M8 16l3-7h3l3 7" />
      <path d="M11 9h-2" />
      {/* bolt */}
      <path d="M13.5 6.5 11 11h2.2l-1 6 3.8-6h-2.2z" />
    </svg>
  );
}

export function IconCX(props) {
  return (
    <svg {...base} {...props}>
      {/* barrier */}
      <path d="M4 14h16" />
      <path d="M6 14v4" />
      <path d="M18 14v4" />
      {/* wheels + hop */}
      <circle cx="8" cy="18" r="2.3" />
      <circle cx="16" cy="18" r="2.3" />
      <path d="M9.5 18l3-7h2l1.5 3" />
      <path d="M12.5 11h-2" />
    </svg>
  );
}
