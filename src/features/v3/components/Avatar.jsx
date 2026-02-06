// Avatar.jsx - CFR Foundation styled avatar (Dark theme)
// Source: docs/design/00-foundation.md

export function Avatar({ name, initial, image, selected = false, onClick }) {
  // Dark theme colors — mapped to tokens.css values
  const colors = {
    outerBg: selected ? "bg-app-elevated" : "bg-app-surface",
    outerBorder: "border-transparent border-b-2 border-b-brand-orange",
    outerRing: selected ? "ring-1 ring-brand-orange" : "ring-0",
    innerBg: "bg-app-surface",
    innerBorder: "border border-chrome-subtle",
    nameColor: selected ? "text-brand-orange" : "text-text-primary",
    focusRing: "focus-visible:ring-brand-orange",
  };

  return (
    <button
      onClick={onClick}
      className={`
        group flex flex-col items-center gap-3 w-[96px] flex-shrink-0
        focus-visible:outline-none focus-visible:ring-2 ${colors.focusRing}
      `}
    >
      {/* Outer container - with hover effects */}
      <div
        style={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)" }}
        className={[
          "relative p-[2px] rounded-2xl",
          "transition-all duration-200 ease-out",
          "group-hover:scale-[1.03] group-active:scale-[0.97]",
          "group-hover:shadow-[0_8px_24px_rgba(233,78,27,0.15)] group-hover:border-b-brand-orange-hi",
          colors.outerBg,
          "backdrop-blur-sm",
          colors.outerBorder,
          colors.outerRing,
        ].join(" ")}
      >
        {/* Inner image well */}
        <div
          className={`
            w-[80px] h-[80px] rounded-xl overflow-hidden
            ${colors.innerBg}
            ${colors.innerBorder}
          `}
        >
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover object-[center_35%] translate-y-1"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[linear-gradient(180deg,var(--brand-orange-hi)_0%,var(--brand-orange)_100%)]">
              <span className="text-lg font-bold text-white">{initial}</span>
            </div>
          )}
        </div>
      </div>

      {/* Name - with text shadow for depth */}
      <span
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
        className={[
          "text-sm font-semibold transition-colors duration-200 truncate max-w-full",
          colors.nameColor,
          "group-hover:text-brand-orange",
        ].join(" ")}
      >
        {name}
      </span>
    </button>
  );
}
