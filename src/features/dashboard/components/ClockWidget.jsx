// src/features/dashboard/components/ClockWidget.jsx
// iOS-style FlipClock widget showing current time

import { useState, useEffect } from "react";
import { useTheme } from "../../../ui/v3Theme.js";
import { widgetCard, widgetLabel, clockDigit, bigNumber, widgetSubtitle } from "../../../ui/widgetStyles.js";

export function ClockWidget() {
  const isDark = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const colonColor = isDark ? "text-white/50" : "text-slate-400";

  return (
    <div>
      <div className={`${widgetCard(isDark)} py-6`}>
        {/* Time display - FlipClock style */}
        <div className="flex items-center justify-center gap-2">
          {/* Hours */}
          <div className={clockDigit(isDark)}>
            <span className={`text-5xl ${bigNumber(isDark)}`}>
              {hours}
            </span>
          </div>

          <span className={`text-4xl font-bold ${colonColor}`}>:</span>

          {/* Minutes */}
          <div className={clockDigit(isDark)}>
            <span className={`text-5xl ${bigNumber(isDark)}`}>
              {minutes}
            </span>
          </div>

          <span className={`text-4xl font-bold ${colonColor}`}>:</span>

          {/* Seconds */}
          <div className={clockDigit(isDark)}>
            <span className={`text-5xl ${bigNumber(isDark)}`}>
              {seconds}
            </span>
          </div>
        </div>

        {/* Date */}
        <p className={`text-center text-sm mt-3 ${widgetSubtitle(isDark)}`}>{dateStr}</p>
      </div>

      {/* Label */}
      <p className={widgetLabel(isDark)}>Clock</p>
    </div>
  );
}
