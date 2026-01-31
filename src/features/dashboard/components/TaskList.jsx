// src/features/dashboard/components/TaskList.jsx
// Mechanics task checklist with toggle functionality

import { motion } from "motion/react";
import { Check } from "lucide-react";

function TaskItem({ task, onToggle }) {
  const isCompleted = task.completed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl
        ${isCompleted ? "bg-green-500/5" : "bg-foreground/5"}
        active:scale-[0.98] transition-all cursor-pointer
      `}
      onClick={() => onToggle(task.id)}
    >
      {/* Checkbox */}
      <div
        className={`
          w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5
          border-2 transition-all
          ${
            isCompleted
              ? "bg-green-500 border-green-500"
              : "border-foreground/20 hover:border-foreground/40"
          }
        `}
      >
        {isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500 }}
          >
            <Check size={14} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-foreground/40">{task.time}</span>
        </div>
        <p
          className={`
            text-sm font-medium
            ${isCompleted ? "text-foreground/40 line-through" : "text-foreground/80"}
          `}
        >
          {task.text}
        </p>

        {/* Completed by */}
        {isCompleted && task.completedBy && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
            ✓ {task.completedBy}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function TaskList({ tasks, onToggle }) {
  // Sort by time, then by completed status
  const sorted = [...tasks].sort((a, b) => {
    // Completed items go to bottom
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // Sort by time
    const timeA = a.time.replace(":", "");
    const timeB = b.time.replace(":", "");
    return parseInt(timeA) - parseInt(timeB);
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div>
      {/* Progress */}
      {totalCount > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs text-foreground/40 font-medium">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {sorted.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}
