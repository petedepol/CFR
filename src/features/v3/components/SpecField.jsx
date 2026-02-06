// SpecField.jsx - Input field for bike spec form
// Supports theme prop: "light" (2026 Livery) or "dark" (Kit Theme)

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
  theme = "light",
}) {
  const isDark = theme === "dark";

  const safeValue =
    value === null || value === undefined
      ? ""
      : typeof value === "string" || typeof value === "number"
      ? value
      : "";

  const wrapperClass = fullWidth ? "block md:col-span-2" : "block";

  // Check if this is a numeric measurement field
  const isNumeric = inputMode === "decimal" || inputMode === "numeric";

  // Theme-specific colors — mapped to tokens.css values
  const colors = isDark
    ? {
        label: "text-text-muted",
        inputBg: "bg-app-elevated",
        inputBorder: "border-chrome-strong",
        inputText: "text-text-primary",
        placeholder: "placeholder:text-text-placeholder",
        inputShadow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        focusBorder: "focus:border-brand-orange",
        focusRing: "focus:ring-ring-active",
      }
    : {
        label: "text-text-accent-light",
        inputBg: "bg-light-elevated",
        inputBorder: "border-[rgba(0,0,0,0.08)]",
        inputText: "text-brand-green",
        placeholder: "placeholder:text-text-placeholder",
        inputShadow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        focusBorder: "focus:border-[rgba(233,78,27,0.5)]",
        focusRing: "focus:ring-[rgba(233,78,27,0.18)]",
      };

  const inputClasses = `
    w-full rounded-lg
    ${colors.inputBg}
    border ${colors.inputBorder}
    px-3 py-2
    ${colors.inputText}
    ${colors.placeholder}
    ${colors.inputShadow}
    focus:outline-none ${colors.focusBorder} focus:ring-2 ${colors.focusRing}
    transition-all duration-200
    text-base ${isNumeric ? "font-mono tabular-nums" : ""}
  `;

  return (
    <label className={wrapperClass}>
      <div className={`text-xs font-medium mb-1 tracking-wide ${colors.label}`}>{label}</div>

      {textarea ? (
        <textarea
          value={safeValue}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClasses} resize-none`}
        />
      ) : (
        <input
          value={safeValue}
          placeholder={placeholder}
          inputMode={inputMode}
          pattern={pattern}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      )}
    </label>
  );
}
