// Button.jsx - CFR Foundation Button Component
// Source: docs/design/00-foundation.md
// Variants: primary (metallic orange), secondary (racing green), ghost

import { motion } from "motion/react";

const base =
  "relative inline-flex items-center justify-center gap-2 select-none " +
  "rounded-xl px-4 font-semibold tracking-tight " +
  "h-11 text-[14px] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-0 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary:
    "text-white " +
    "bg-[linear-gradient(180deg,var(--brand-orange-hi)_0%,var(--brand-orange)_100%)] " +
    "border border-black/25 " +
    "shadow-[0_10px_30px_rgba(0,0,0,0.25)] " +
    "before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-px " +
    "before:bg-white/15 before:rounded-t-xl " +
    "hover:brightness-[1.03] active:brightness-[0.97]",
  secondary:
    "text-text-primary bg-brand-green-hi border border-white/10 " +
    "hover:brightness-[1.05] active:brightness-[0.95]",
  ghost:
    "text-text-secondary bg-transparent border border-transparent " +
    "hover:bg-overlay-hover active:bg-overlay-pressed",
};

const sizes = {
  sm: "h-10 px-3 text-[13px]",
  md: "h-11 px-4 text-[14px]",
  lg: "h-12 px-5 text-[15px]",
};

export default function Button({
  variant = "secondary",
  size = "md",
  className = "",
  loading = false,
  leftIcon,
  rightIcon,
  children,
  ...props
}) {
  const v = variants[variant] ?? variants.secondary;
  const s = sizes[size] ?? sizes.md;

  return (
    <motion.button
      whileTap={{ scale: 0.98, y: 1 }}
      className={[base, v, s, className].join(" ")}
      disabled={props.disabled || loading}
      {...props}
    >
      {leftIcon && <span className="opacity-90">{leftIcon}</span>}
      <span>{loading ? "Working…" : children}</span>
      {rightIcon && <span className="opacity-90">{rightIcon}</span>}
    </motion.button>
  );
}
