// src/features/dashboard/components/WeatherWidgetV2.jsx
// iOS-style weather widget (AccuWeather style)

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { useTheme } from "../../../ui/v3Theme.js";
import { widgetCard, widgetLabel, widgetSubtitle } from "../../../ui/widgetStyles.js";

// Weather code to emoji mapping
const WEATHER_ICONS = {
  0: "\u2600\uFE0F", 1: "\uD83C\uDF24\uFE0F", 2: "\u26C5", 3: "\u2601\uFE0F",
  45: "\uD83C\uDF2B\uFE0F", 48: "\uD83C\uDF2B\uFE0F",
  51: "\uD83C\uDF27\uFE0F", 53: "\uD83C\uDF27\uFE0F", 55: "\uD83C\uDF27\uFE0F",
  61: "\uD83C\uDF27\uFE0F", 63: "\uD83C\uDF27\uFE0F", 65: "\uD83C\uDF27\uFE0F",
  66: "\uD83C\uDF28\uFE0F", 67: "\uD83C\uDF28\uFE0F",
  71: "\u2744\uFE0F", 73: "\u2744\uFE0F", 75: "\u2744\uFE0F", 77: "\uD83C\uDF28\uFE0F",
  80: "\uD83C\uDF26\uFE0F", 81: "\uD83C\uDF26\uFE0F", 82: "\uD83C\uDF27\uFE0F",
  85: "\uD83C\uDF28\uFE0F", 86: "\uD83C\uDF28\uFE0F",
  95: "\u26C8\uFE0F", 96: "\u26C8\uFE0F", 99: "\u26C8\uFE0F",
};

const WEATHER_CONDITIONS = {
  0: "Clear", 1: "Clear", 2: "Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy",
  51: "Drizzle", 53: "Drizzle", 55: "Drizzle",
  61: "Rain", 63: "Rain", 65: "Heavy Rain",
  66: "Freezing", 67: "Freezing",
  71: "Snow", 73: "Snow", 75: "Snow", 77: "Snow",
  80: "Showers", 81: "Showers", 82: "Showers",
  85: "Snow", 86: "Snow",
  95: "Storm", 96: "Storm", 99: "Storm",
};

export function WeatherWidgetV2({ location, lat, lon }) {
  const isDark = useTheme();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lat || !lon) {
      setLoading(false);
      return;
    }
    fetchWeather(lat, lon);
  }, [lat, lon]);

  async function fetchWeather(latitude, longitude) {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=1`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather fetch failed");
      const data = await response.json();

      // Get next 5 hours starting from current hour
      const currentHour = new Date().getHours();
      const hourlyData = [];
      for (let i = 0; i < 5; i++) {
        const hourIndex = currentHour + i;
        if (hourIndex < 24 && data.hourly?.time?.[hourIndex]) {
          hourlyData.push({
            hour: data.hourly.time[hourIndex].split("T")[1].slice(0, 5),
            temp: Math.round(data.hourly.temperature_2m[hourIndex]),
            code: data.hourly.weather_code[hourIndex],
          });
        }
      }

      setWeather({
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weather_code,
        hourly: hourlyData,
      });
    } catch (err) {
      console.error("Weather error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Theme-aware colors
  const locationColor = isDark ? "text-white/70" : "text-slate-600";
  const settingsColor = isDark ? "text-white/40" : "text-slate-400";
  const tempColor = isDark ? "text-white" : "text-slate-900";
  const conditionColor = isDark ? "text-white/90" : "text-slate-700";
  const feelsLikeColor = isDark ? "text-white/50" : "text-slate-500";
  const hourlyTextColor = isDark ? "text-white/50" : "text-slate-500";
  const hourlyTempColor = isDark ? "text-white/80" : "text-slate-700";
  const mutedColor = isDark ? "text-white/40" : "text-slate-400";
  const mutedLightColor = isDark ? "text-white/30" : "text-slate-300";
  const dividerColor = isDark ? "border-white/10" : "border-slate-200";

  if (loading) {
    return (
      <div>
        <div className={`${widgetCard(isDark)} animate-pulse`}>
          <div className={`h-20 ${isDark ? 'bg-white/5' : 'bg-slate-100'} rounded-xl`} />
        </div>
        <p className={widgetLabel(isDark)}>Weather</p>
      </div>
    );
  }

  if (!weather) {
    return (
      <div>
        <div className={widgetCard(isDark)}>
          <div className="text-center py-4">
            <p className={`text-sm ${mutedColor}`}>No weather data</p>
            <p className={`text-xs mt-1 ${mutedLightColor}`}>Set location to see weather</p>
          </div>
        </div>
        <p className={widgetLabel(isDark)}>Weather</p>
      </div>
    );
  }

  const icon = WEATHER_ICONS[weather.code] || "\uD83C\uDF21\uFE0F";
  const condition = WEATHER_CONDITIONS[weather.code] || "Unknown";

  return (
    <div>
      <div className={widgetCard(isDark)}>
        {/* Header with location */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-sm ${locationColor}`}>{location || "Unknown Location"}</span>
          <button className={`p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'} transition-colors`}>
            <Settings size={16} className={settingsColor} />
          </button>
        </div>

        {/* Current weather */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-4xl">{icon}</span>
            <span className={`text-4xl font-bold ${tempColor}`}>{weather.temp}\u00B0</span>
          </div>
          <div className="pt-1">
            <p className={`font-medium ${conditionColor}`}>{condition}</p>
            <p className={`text-xs ${feelsLikeColor}`}>Feels like {weather.temp}\u00B0</p>
          </div>
        </div>

        {/* Hourly forecast */}
        {weather.hourly?.length > 0 && (
          <div className={`flex justify-between border-t ${dividerColor} pt-3`}>
            {weather.hourly.map((hour, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`text-xs ${hourlyTextColor}`}>{hour.hour}</span>
                <span className="text-lg">{WEATHER_ICONS[hour.code] || "\uD83C\uDF21\uFE0F"}</span>
                <span className={`text-sm ${hourlyTempColor}`}>{hour.temp}\u00B0</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Label */}
      <p className={widgetLabel(isDark)}>Weather</p>
    </div>
  );
}
