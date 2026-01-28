// SpecField.jsx - Input field for bike spec form

export function SpecField({
  label,
  value,
  onChange,
  placeholder = "",
  textarea = false,
  rows = 3,
  inputMode,
  pattern,
  fullWidth = false,
}) {
  const safeValue =
    value === null || value === undefined
      ? ""
      : typeof value === "string" || typeof value === "number"
      ? value
      : "";

  const wrapperClass = fullWidth ? "block md:col-span-2" : "block";

  const inputClasses =
    "w-full rounded-2xl bg-white/55 dark:bg-white/[0.08] border border-black/[0.14] dark:border-white/[0.12] px-4 py-3.5 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-none focus:outline-none focus:border-orange-500/55 focus:ring-4 focus:ring-orange-500/[0.18] transition-all duration-200";

  const inputStyle = { color: "#18181b" };

  return (
    <label className={wrapperClass}>
      <div className="text-xs font-medium mb-2 tracking-wide dark:text-white/40" style={{ color: "#71717a" }}>{label}</div>

      {textarea ? (
        <textarea
          value={safeValue}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
          style={inputStyle}
        />
      ) : (
        <input
          value={safeValue}
          placeholder={placeholder}
          inputMode={inputMode}
          pattern={pattern}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
          style={inputStyle}
        />
      )}
    </label>
  );
}
