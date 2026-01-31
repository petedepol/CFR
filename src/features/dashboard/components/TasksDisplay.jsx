// src/features/dashboard/components/TasksDisplay.jsx
// Simple task display list (no checkboxes - display only)

import { motion } from "motion/react";

// Source type colors (left border indicator)
const SOURCE_COLORS = {
  main: "", // No indicator for main plan
  race: "border-l-2 border-l-red-400",
  mechanics: "border-l-2 border-l-blue-400",
  todo: "border-l-2 border-l-green-400",
};

function TaskItem({ task, index }) {
  // Source indicator for different plan types
  const sourceIndicator = task.source ? (SOURCE_COLORS[task.source] || "") : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-start gap-3 px-3 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5 ${sourceIndicator}`}
    >
      {/* Time dot */}
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-mono text-foreground/40 mr-2">
          {task.time}
        </span>
        <span className="text-sm text-foreground/70">{task.text}</span>
        {task.assignee && (
          <span className="text-xs text-foreground/40 ml-2">
            ({task.assignee})
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function TasksDisplay({ tasks }) {
  // Sort by time
  const sorted = [...tasks].sort((a, b) => {
    const timeA = a.time.replace(":", "");
    const timeB = b.time.replace(":", "");
    return parseInt(timeA) - parseInt(timeB);
  });

  return (
    <div className="space-y-2">
      {sorted.map((task, index) => (
        <TaskItem key={task.id} task={task} index={index} />
      ))}
    </div>
  );
}
