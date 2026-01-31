// src/features/dashboard/components/ScheduleTimeline.jsx
// Timeline of schedule blocks with category colors

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";

// Source type colors (left border indicator)
const SOURCE_COLORS = {
  main: "", // No indicator for main plan
  race: "border-l-2 border-l-red-400",
  mechanics: "border-l-2 border-l-blue-400",
  todo: "border-l-2 border-l-green-400",
};

// Category colors
const CATEGORY_STYLES = {
  race: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  warmup: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  meal: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
  logistics: {
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    text: "text-zinc-600 dark:text-zinc-400",
    dot: "bg-zinc-400",
  },
  service: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
};

function ScheduleBlock({ block, index }) {
  const [expanded, setExpanded] = useState(false);
  const style = CATEGORY_STYLES[block.category] || CATEGORY_STYLES.logistics;
  const isRace = block.category === "race";

  // Format time display
  const timeDisplay = block.endTime
    ? `${block.time} - ${block.endTime}`
    : block.time;

  // Source indicator for different plan types
  const sourceIndicator = block.source ? (SOURCE_COLORS[block.source] || "") : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        rounded-2xl border ${style.border} ${style.bg}
        ${isRace ? "p-4" : "px-4 py-3"}
        ${sourceIndicator}
        transition-all
      `}
    >
      <div
        className={`flex items-start gap-3 ${isRace ? "cursor-pointer" : ""}`}
        onClick={() => isRace && setExpanded(!expanded)}
      >
        {/* Time dot */}
        <div className="flex flex-col items-center pt-1">
          <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
          {isRace && (
            <div className={`w-0.5 flex-1 mt-1 ${style.dot} opacity-30`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-foreground/50">
              {timeDisplay}
            </span>
            {block.rainAlert && (
              <span className="text-sm" title="Rain expected">
                🌧️
              </span>
            )}
          </div>

          <p className={`font-semibold ${isRace ? "text-base" : "text-sm"} ${style.text}`}>
            {block.title}
          </p>

          {/* Riders */}
          {block.riders?.length > 0 && (
            <p className="text-xs text-foreground/50 mt-0.5">
              {block.riders.join(" • ")}
            </p>
          )}

          {/* Rain probability */}
          {block.rainProbability > 0 && (
            <p className="text-xs text-blue-500 mt-1">
              Rain ~{block.rainProbability}%
            </p>
          )}
        </div>

        {/* Expand icon for races */}
        {isRace && block.staffPositions && (
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} className="text-foreground/30" />
          </motion.div>
        )}
      </div>

      {/* Staff Positions (expandable for races) */}
      <AnimatePresence>
        {expanded && block.staffPositions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-foreground/10">
              <StaffGrid positions={block.staffPositions} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StaffGrid({ positions }) {
  const positionLabels = {
    startline: "Startline",
    start: "Start",
    course: "Course",
    tech: "Tech",
    tech1: "Tech 1",
    feed: "Feed",
    finish: "Finish",
  };

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {Object.entries(positions).map(([key, staff]) => (
        <div key={key} className="bg-foreground/5 rounded-lg px-3 py-2">
          <p className="text-foreground/40 font-medium uppercase tracking-wide text-[10px]">
            {positionLabels[key] || key}
          </p>
          <p className="text-foreground/70 mt-0.5">{staff.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}

export function ScheduleTimeline({ timeBlocks }) {
  // Filter out blocks without time, then sort
  const sorted = [...timeBlocks]
    .filter((block) => block.time)
    .sort((a, b) => {
      const timeA = (a.time || "00:00").replace(":", "");
      const timeB = (b.time || "00:00").replace(":", "");
      return parseInt(timeA) - parseInt(timeB);
    });

  return (
    <div className="space-y-3">
      {sorted.map((block, index) => (
        <ScheduleBlock key={block.id} block={block} index={index} />
      ))}
    </div>
  );
}
