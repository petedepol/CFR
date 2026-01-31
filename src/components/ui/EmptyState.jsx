// EmptyState.jsx - Empty state display component
// Shows icon, title, subtitle, and optional action

import {
  Ruler,
  Wrench,
  Settings2,
  Hammer,
  Calendar,
  CheckCircle,
  FileText,
  Zap,
  Trophy,
  Package,
} from "lucide-react";

// Icon mapping for convenience
const iconMap = {
  ruler: Ruler,
  wrench: Wrench,
  settings: Settings2,
  hammer: Hammer,
  calendar: Calendar,
  check: CheckCircle,
  file: FileText,
  zap: Zap,
  trophy: Trophy,
  package: Package,
};

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  compact = false,
  className = "",
}) {
  // Resolve icon - can be string key or component
  const IconComponent = typeof icon === "string" ? iconMap[icon] : icon;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-6" : "py-12"
      } px-4 ${className}`}
    >
      {IconComponent && (
        <div
          className={`${compact ? "mb-2" : "mb-4"} rounded-full p-3`}
          style={{ backgroundColor: "rgba(255, 107, 44, 0.1)" }}
        >
          <IconComponent
            size={compact ? 24 : 32}
            className="text-[#888]"
            strokeWidth={1.5}
          />
        </div>
      )}

      {title && (
        <h3
          className={`font-semibold text-white ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {title}
        </h3>
      )}

      {subtitle && (
        <p
          className={`text-[#888] mt-1 max-w-[240px] ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {subtitle}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Pre-configured empty states for common sections
export const emptyStates = {
  jig: {
    icon: "ruler",
    title: "No measurements yet",
    subtitle: "Record your first jig measurement",
  },
  spec: {
    icon: "wrench",
    title: "No specs recorded",
    subtitle: "Add your first bike spec",
  },
  setup: {
    icon: "settings",
    title: "No setups saved",
    subtitle: "Save your first race setup",
  },
  service: {
    icon: "hammer",
    title: "No service logged",
    subtitle: "Tap a category above to log service",
  },
  schedule: {
    icon: "calendar",
    title: "No events today",
    subtitle: "Tap + Import to add schedule",
  },
  todos: {
    icon: "check",
    title: "All done!",
    subtitle: null,
  },
  notes: {
    icon: "file",
    title: "No notes",
    subtitle: "Tap + to add a note",
  },
  tunes: {
    icon: "zap",
    title: "No tunes yet",
    subtitle: "Add your first tune image",
  },
  leaderboard: {
    icon: "trophy",
    title: "No service logged yet",
    subtitle: "Start logging to see the leaderboard",
  },
  generic: {
    icon: "package",
    title: "Nothing here yet",
    subtitle: null,
  },
};

// Convenience component using preset
export function EmptyStatePreset({ preset, action, compact }) {
  const config = emptyStates[preset] || emptyStates.generic;
  return <EmptyState {...config} action={action} compact={compact} />;
}

export default EmptyState;
