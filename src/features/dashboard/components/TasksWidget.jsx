// src/features/dashboard/components/TasksWidget.jsx
// iOS-style expandable tasks widget (Things app style)

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Pin, ChevronDown } from "lucide-react";
import { useTheme } from "../../../ui/v3Theme.js";
import { widgetCard, widgetLabel, iconBg, pinButton } from "../../../ui/widgetStyles.js";

export function TasksWidget({ tasks = [], onTogglePin, onToggleComplete }) {
  const isDark = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Sort by time, incomplete first
  const sorted = [...tasks]
    .sort((a, b) => {
      // Completed items go to bottom
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // Then sort by time
      const timeA = (a.time || "99:99").replace(":", "");
      const timeB = (b.time || "99:99").replace(":", "");
      return parseInt(timeA) - parseInt(timeB);
    });

  const incompleteCount = tasks.filter((t) => !t.completed).length;
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
            <div className={`${iconBg.tasks} w-7 h-7 rounded-lg flex items-center justify-center`}>
              <Star size={16} className="text-white" />
            </div>
            <span className={`text-sm font-semibold ${titleColor}`}>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${countColor}`}>{incompleteCount}</span>
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
              displayItems.map((task, index) => (
                <TaskItem
                  key={task.id || index}
                  task={task}
                  onTogglePin={onTogglePin}
                  onToggleComplete={onToggleComplete}
                  isDark={isDark}
                />
              ))
            ) : (
              <div className="text-center py-4">
                <p className={`text-sm ${emptyTextColor}`}>No tasks</p>
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
      <p className={widgetLabel(isDark)}>Tasks</p>
    </div>
  );
}

function TaskItem({ task, onTogglePin, onToggleComplete, isDark }) {
  // Theme-aware colors
  const hoverBg = isDark ? "hover:bg-white/5" : "hover:bg-slate-50";
  const textColor = task.completed
    ? (isDark ? "text-white/50 line-through" : "text-slate-400 line-through")
    : (isDark ? "text-white/90" : "text-slate-800");
  const timeColor = isDark ? "text-white/50" : "text-slate-400";
  const checkboxUnchecked = isDark
    ? "border-white/30 hover:border-white/50"
    : "border-slate-300 hover:border-slate-400";

  return (
    <div
      className={`flex items-center gap-3 py-2 px-2 rounded-xl transition-colors ${hoverBg} ${
        task.completed ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete?.(task.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          task.completed
            ? "border-green-500 bg-green-500"
            : checkboxUnchecked
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${textColor}`}>
          {task.text}
        </p>
      </div>

      {/* Time */}
      {task.time && (
        <span className={`text-xs tabular-nums ${timeColor}`}>{task.time}</span>
      )}

      {/* Pin button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin?.(task.id, "task");
        }}
        className={pinButton(isDark, task.pinned)}
      >
        <Pin size={14} className={task.pinned ? "fill-current" : ""} />
      </button>
    </div>
  );
}
