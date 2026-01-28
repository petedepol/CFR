// Avatar.jsx - Circular avatar with gradient halo

export function Avatar({ name, initial, image, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 transition-transform active:scale-95"
    >
      {/* Halo + Avatar container */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Gradient halo - soft blur behind */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400/40 via-amber-300/30 to-orange-500/40 blur-xl" />

        {/* Avatar circle */}
        <div className="relative w-[77px] h-[77px] rounded-full overflow-hidden ring-2 ring-white/20">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{initial}</span>
            </div>
          )}
        </div>
      </div>

      {/* Name - ALL CAPS */}
      <span className="text-sm font-semibold tracking-wide text-foreground uppercase">
        {name}
      </span>
    </button>
  );
}
