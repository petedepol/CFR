// Avatar.jsx - CFR Foundation styled avatar
// Source: docs/design/00-foundation.md

export function Avatar({ name, initial, image, selected = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        group flex flex-col items-center gap-3
        transition-transform active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,74,31,0.55)]
        rounded-2xl
      "
    >
      {/* Outer ring (glass) */}
      <div
        className={[
          "relative p-1 rounded-full transition-all duration-200",
          // glass surface
          "bg-[rgba(18,38,33,0.55)] backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
          // border
          "border border-[rgba(255,255,255,0.10)]",
          "group-hover:border-[rgba(255,255,255,0.16)]",
          selected ? "ring-1 ring-[rgba(210,74,31,0.45)]" : "",
        ].join(" ")}
      >
        {/* Avatar circle */}
        <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden">
          {/* Backing disc - bone glass */}
          <div
            className="
              absolute inset-0 rounded-full
              bg-[rgba(231,225,212,0.16)]
              backdrop-blur-sm
              border border-[rgba(255,255,255,0.18)]
              shadow-[0_6px_20px_rgba(0,0,0,0.25)]
              before:content-[''] before:absolute before:inset-x-1 before:top-1 before:h-px
              before:bg-[rgba(255,255,255,0.35)]
            "
          />

          {image ? (
            <img
              src={image}
              alt={name}
              className="relative w-full h-full object-cover object-[center_30%]"
            />
          ) : (
            <div className="relative w-full h-full bg-[linear-gradient(180deg,#E56A3A_0%,#D24A1F_100%)] flex items-center justify-center">
              <span className="text-lg font-bold text-white">{initial}</span>
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <span
        className={[
          "text-sm font-semibold transition-colors duration-200",
          selected ? "text-[#F4F6F5]" : "text-[#B8C2BE]",
          "group-hover:text-[#F4F6F5]",
        ].join(" ")}
      >
        {name}
      </span>
    </button>
  );
}
