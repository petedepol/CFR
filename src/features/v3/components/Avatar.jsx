// Avatar.jsx - CFR Foundation styled avatar (Dark theme)
// Source: docs/design/00-foundation.md

export function Avatar({ name, initial, image, selected = false, onClick }) {
  // Dark theme colors
  const colors = {
    outerBg: selected ? "bg-[#2a2a2a]" : "bg-[#1e1e1e]",
    outerBorder: "border-transparent border-b-2 border-b-[#ff6b2c]",
    outerRing: selected ? "ring-1 ring-[#ff6b2c]" : "ring-0",
    innerBg: "bg-[#1e1e1e]",
    innerBorder: "border border-[rgba(255,255,255,0.05)]",
    nameColor: selected ? "text-[#ff6b2c]" : "text-white",
    focusRing: "focus-visible:ring-[#ff6b2c]",
  };

  // Shadow style
  const cardShadowStyle = {
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
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
        style={cardShadowStyle}
        className={[
          "relative p-[2px] rounded-2xl",
          "transition-all duration-200 ease-out",
          "group-hover:scale-[1.03] group-active:scale-[0.97]",
          "group-hover:shadow-[0_8px_24px_rgba(255,107,44,0.15)] group-hover:border-b-[#ff8a50]",
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
            <div className="w-full h-full flex items-center justify-center bg-[linear-gradient(180deg,#ff8a50_0%,#ff6b2c_100%)]">
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
          "group-hover:text-[#ff6b2c]",
        ].join(" ")}
      >
        {name}
      </span>
    </button>
  );
}
