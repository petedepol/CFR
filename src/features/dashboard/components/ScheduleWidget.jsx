// src/features/dashboard/components/ScheduleWidget.jsx
// iOS-style expandable schedule widget

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flag, Pin, ChevronDown } from "lucide-react";
import { useTheme } from "../../../ui/v3Theme.js";
import { widgetCard, widgetLabel, iconBg, pinButton } from "../../../ui/widgetStyles.js";

export function ScheduleWidget({ timeBlocks = [], onTogglePin }) {
  const isDark = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Sort by time
  const sorted = [...timeBlocks]
    .filter((tb) => tb.time)
    .sort((a, b) => {
      const timeA = (a.time || "00:00").replace(":", "");
      const timeB = (b.time || "00:00").replace(":", "");
      return parseInt(timeA) - parseInt(timeB);
    });

  const displayItems = expanded ? sorted : sorted.slice(0, 4);
  const hasMore = sorted.length > 4;

  // Theme-aware colors
  const titleColor = isDark ? "text-white/90" : "text-slate-800";
  const countColor = isDark ? "text-white/50" : "text-slate-400";
  const chevronColor = isDark ? "text-white/40" : "text-slate-400";
  const emptyTextColor = isDark ? "text-white/40" : "text-slate-400";
  const moreButtonColor = isDark ? "text-white/30 hover:text-white/50" : "text-slate-400 hover:text-slate-600";

  return (
    <div>
      <div className={widgetCard(isDark)}>
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <div className={`${iconBg.schedule} w-7 h-7 rounded-lg flex items-center justify-center`}>
              <Flag size={16} className="text-white" />
            </div>
            <span className={`text-sm font-semibold ${titleColor}`}>Schedule</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${countColor}`}>{sorted.length}</span>
            {hasMore && (
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={18} className={chevronColor} />
              </motion.div>
            )}
          </div>
        </button>

        {/* Items */}
        <AnimatePresence mode="sync">
          <motion.div
            initial={false}
            animate={{ height: "auto" }}
            className="space-y-1 overflow-hidden"
          >
            {displayItems.length > 0 ? (
              displayItems.map((item, index) => (
                <ScheduleItem
                  key={item.id || index}
                  item={item}
                  onTogglePin={onTogglePin}
                  isDark={isDark}
                />
              ))
            ) : (
              <div className="text-center py-4">
                <p className={`text-sm ${emptyTextColor}`}>No schedule items</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Show more indicator */}
        {!expanded && hasMore && (
          <button
            onClick={() => setExpanded(true)}
            className={`w-full mt-2 py-1 text-xs ${moreButtonColor} transition-colors`}
          >
            +{sorted.length - 4} more
          </button>
        )}
      </div>

      {/* Label */}
      <p className={widgetLabel(isDark)}>Schedule</p>
    </div>
  );
}

function ScheduleItem({ item, onTogglePin, isDark }) {
  const isPast = isTimePast(item.time);
  const isRace = item.category === "race";

  // Theme-aware colors
  const hoverBg = isDark ? "hover:bg-white/5" : "hover:bg-slate-50";
  const titleColor = isPast
    ? (isDark ? "text-white/50 line-through" : "text-slate-400 line-through")
    : (isDark ? "text-white/90" : "text-slate-800");
  const ridersColor = isDark ? "text-white/40" : "text-slate-400";
  const timeColor = isDark ? "text-white/50" : "text-slate-400";
  const checkboxBorder = isPast
    ? "border-green-500 bg-green-500"
    : isRace
    ? "border-red-400"
    : (isDark ? "border-white/30" : "border-slate-300");

  return (
    <div
      className={`flex items-center gap-3 py-2 px-2 rounded-xl transition-colors ${hoverBg} ${
        isPast ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox circle */}
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checkboxBorder}`}
      >
        {isPast && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${titleColor}`}>
          {item.title}
        </p>
        {item.riders?.length > 0 && (
          <p className={`text-xs ${ridersColor}`}>{item.riders.join(" \u2022 ")}</p>
        )}
      </div>

      {/* Time */}
      <span className={`text-xs tabular-nums ${timeColor}`}>{item.time}</span>

      {/* Pin button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin?.(item.id, "timeBlock");
        }}
        className={pinButton(isDark, item.pinned)}
      >
        <Pin size={14} className={item.pinned ? "fill-current" : ""} />
      </button>
    </div>
  );
}

// Helper to check if time has passed today
function isTimePast(timeStr) {
  if (!timeStr) return false;
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  const itemTime = new Date();
  itemTime.setHours(hours, minutes, 0, 0);
  return now > itemTime;
}
