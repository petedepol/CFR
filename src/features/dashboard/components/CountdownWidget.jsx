// src/features/dashboard/components/CountdownWidget.jsx
// Countdown timer to next pinned item

import { useState, useEffect, useMemo } from "react";
import { Pin } from "lucide-react";
import { useTheme } from "../../../ui/v3Theme.js";
import { widgetCard, widgetLabel, iconBg, widgetSubtitle } from "../../../ui/widgetStyles.js";

export function CountdownWidget({ timeBlocks = [], tasks = [] }) {
  const isDark = useTheme();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Find next pinned item
  const nextPinned = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Collect all pinned items with their times
    const pinnedItems = [];

    // Add pinned timeBlocks
    timeBlocks
      .filter((tb) => tb.pinned && tb.time)
      .forEach((tb) => {
        const [hours, minutes] = tb.time.split(":").map(Number);
        const itemDate = new Date(todayStr);
        itemDate.setHours(hours, minutes, 0, 0);
        pinnedItems.push({
          title: tb.title,
          time: tb.time,
          date: itemDate,
          type: "schedule",
        });
      });

    // Add pinned tasks
    tasks
      .filter((t) => t.pinned && t.time)
      .forEach((t) => {
        const [hours, minutes] = t.time.split(":").map(Number);
        const itemDate = new Date(todayStr);
        itemDate.setHours(hours, minutes, 0, 0);
        pinnedItems.push({
          title: t.text,
          time: t.time,
          date: itemDate,
          type: "task",
        });
      });

    // Sort by time and find next upcoming
    pinnedItems.sort((a, b) => a.date - b.date);
    return pinnedItems.find((item) => item.date > now) || null;
  }, [timeBlocks, tasks, now]);

  // Calculate countdown
  const countdown = useMemo(() => {
    if (!nextPinned) return null;

    const diff = nextPinned.date - now;
    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      seconds: seconds.toString().padStart(2, "0"),
    };
  }, [nextPinned, now]);

  // Theme-aware colors for countdown
  const digitBg = isDark ? "bg-purple-500/20" : "bg-purple-100";
  const digitText = "text-purple-500";
  const colonColor = isDark ? "text-purple-400/50" : "text-purple-300";
  const titleColor = isDark ? "text-white/70" : "text-slate-600";
  const timeColor = isDark ? "text-white/40" : "text-slate-400";
  const mutedText = isDark ? "text-white/50" : "text-slate-500";
  const mutedTextLight = isDark ? "text-white/30" : "text-slate-400";

  return (
    <div>
      <div className={`${widgetCard(isDark)} py-5`}>
        {countdown && nextPinned ? (
          <>
            {/* Countdown display */}
            <div className="flex items-center justify-center gap-1">
              {/* Hours */}
              <div className={`${digitBg} rounded-xl px-3 py-2`}>
                <span className={`text-4xl font-bold ${digitText} tabular-nums tracking-tight`}>
                  {countdown.hours}
                </span>
              </div>

              <span className={`text-3xl font-bold ${colonColor}`}>:</span>

              {/* Minutes */}
              <div className={`${digitBg} rounded-xl px-3 py-2`}>
                <span className={`text-4xl font-bold ${digitText} tabular-nums tracking-tight`}>
                  {countdown.minutes}
                </span>
              </div>

              <span className={`text-3xl font-bold ${colonColor}`}>:</span>

              {/* Seconds */}
              <div className={`${digitBg} rounded-xl px-3 py-2`}>
                <span className={`text-4xl font-bold ${digitText} tabular-nums tracking-tight`}>
                  {countdown.seconds}
                </span>
              </div>
            </div>

            {/* Item name */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <Pin size={14} className="text-purple-500" />
              <p className={`text-sm ${titleColor}`}>{nextPinned.title}</p>
              <span className={`text-xs ${timeColor}`}>@ {nextPinned.time}</span>
            </div>
          </>
        ) : (
          /* No pinned items */
          <div className="text-center py-4">
            <div className={`${iconBg.countdown} w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center`}>
              <Pin size={24} className="text-white" />
            </div>
            <p className={`text-sm ${mutedText}`}>No pinned items</p>
            <p className={`text-xs mt-1 ${mutedTextLight}`}>Pin an item to see countdown</p>
          </div>
        )}
      </div>

      {/* Label */}
      <p className={widgetLabel(isDark)}>Countdown</p>
    </div>
  );
}
