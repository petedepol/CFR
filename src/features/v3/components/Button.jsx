// Button.jsx - CFR Foundation Button Component
// Source: docs/design/00-foundation.md
// Variants: primary (metallic orange), secondary (racing green), ghost

import { forwardRef } from 'react';

const variants = {
  // Primary: Factory Orange with metallic sheen (2026 CFR Livery)
  primary: `
    bg-gradient-to-b from-[#f0714a] to-[#e94e1b]
    text-white font-semibold
    border border-black/25
    shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]
    hover:brightness-105
    active:brightness-95 active:translate-y-px active:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
    disabled:bg-[rgba(233,78,27,0.35)] disabled:text-white/55 disabled:cursor-not-allowed disabled:shadow-none
  `,
  // Secondary: Racing Green (2026 CFR Livery)
  secondary: `
    bg-[#2d524b]
    text-[#F4F6F5] font-semibold
    border border-white/10
    hover:bg-[#3a6259]
    active:bg-[#24463f] active:translate-y-px
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  // Ghost: Transparent with subtle hover
  ghost: `
    bg-transparent
    text-[#B8C2BE] font-semibold
    border border-transparent
    hover:bg-white/[0.04]
    active:bg-black/[0.18] active:translate-y-px
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
};

const sizes = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-11 px-4 text-sm rounded-xl',
  lg: 'h-12 px-5 text-base rounded-xl',
};

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        transition-all duration-150
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
