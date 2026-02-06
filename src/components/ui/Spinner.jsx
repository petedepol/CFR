// Spinner.jsx - Loading spinner component
// Sizes: sm (16px), md (24px), lg (40px)

import { Loader2 } from "lucide-react";

const sizes = {
  sm: 16,
  md: 24,
  lg: 40,
};

export function Spinner({ size = "md", className = "", color = "var(--brand-orange)" }) {
  const pixelSize = sizes[size] || sizes.md;

  return (
    <Loader2
      size={pixelSize}
      className={`animate-spin ${className}`}
      style={{ color }}
    />
  );
}

// Centered full-area spinner
export function SpinnerOverlay({ size = "lg", message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Spinner size={size} />
      {message && (
        <span className="text-sm text-text-muted">{message}</span>
      )}
    </div>
  );
}

export default Spinner;
