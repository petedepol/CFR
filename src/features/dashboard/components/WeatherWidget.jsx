// src/features/dashboard/components/WeatherWidget.jsx
// Weather display with Open-Meteo API - supports compact vertical mode

import { useState, useEffect } from "react";
import { Radio } from "lucide-react";

// Weather code to emoji mapping
const WEATHER_ICONS = {
  0: "☀️", // Clear
  1: "🌤️", // Mainly clear
  2: "⛅", // Partly cloudy
  3: "☁️", // Overcast
  45: "🌫️", // Fog
  48: "🌫️", // Depositing rime fog
  51: "🌧️", // Light drizzle
  53: "🌧️", // Moderate drizzle
  55: "🌧️", // Dense drizzle
  61: "🌧️", // Slight rain
  63: "🌧️", // Moderate rain
  65: "🌧️", // Heavy rain
  66: "🌨️", // Freezing rain
  67: "🌨️", // Heavy freezing rain
  71: "❄️", // Slight snow
  73: "❄️", // Moderate snow
  75: "❄️", // Heavy snow
  77: "🌨️", // Snow grains
  80: "🌦️", // Slight showers
  81: "🌦️", // Moderate showers
  82: "🌧️", // Violent showers
  85: "🌨️", // Slight snow showers
  86: "🌨️", // Heavy snow showers
  95: "⛈️", // Thunderstorm
  96: "⛈️", // Thunderstorm with hail
  99: "⛈️", // Thunderstorm with heavy hail
};

const WEATHER_DESCRIPTIONS = {
  0: "Clear",
  1: "Clear",
  2: "Cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing",
  67: "Freezing",
  71: "Snow",
  73: "Snow",
  75: "Snow",
  77: "Snow",
  80: "Showers",
  81: "Showers",
  82: "Showers",
  85: "Snow",
  86: "Snow",
  95: "Storm",
  96: "Storm",
  99: "Storm",
};

export function WeatherWidget({ compact = false, location, lat, lon, radioChannel }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lat || !lon) {
      setLoading(false);
      return;
    }

    fetchWeather(lat, lon);
  }, [lat, lon]);

  async function fetchWeather(latitude, longitude) {
    setLoading(true);
    setError(null);

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code,precipitation_probability&timezone=auto&forecast_days=1`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather fetch failed");

      const data = await response.json();

      setWeather({
        temp: Math.round(data.current.temperature_2m),
        code: data.current.weather_code,
        hourly: data.hourly,
      });
    } catch (err) {
      console.error("Weather error:", err);
      setError("Could not load weather");
    } finally {
      setLoading(false);
    }
  }

  // Check for rain in the forecast
  const hasRainAlert = weather?.hourly?.weather_code?.some((code) => {
    return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
  });

  // Compact vertical layout for sidebar
  if (compact) {
    return (
      <div className="rounded-2xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/5 backdrop-blur-sm p-3 text-center">
        {loading ? (
          <div className="animate-pulse">
            <div className="text-3xl mb-2">🌡️</div>
            <div className="h-6 w-12 mx-auto bg-foreground/10 rounded" />
          </div>
        ) : error || !weather ? (
          <div className="text-foreground/30">
            <div className="text-2xl mb-1">🌡️</div>
            <p className="text-[10px]">No data</p>
          </div>
        ) : (
          <>
            {/* Weather icon */}
            <div className="text-3xl mb-1">
              {WEATHER_ICONS[weather.code] || "🌡️"}
            </div>

            {/* Temperature */}
            <div className="text-xl font-bold text-foreground/80">
              {weather.temp}°
            </div>

            {/* Condition */}
            <p className="text-[10px] text-foreground/50 mb-3">
              {WEATHER_DESCRIPTIONS[weather.code] || "Unknown"}
            </p>

            {/* Radio Channel */}
            {radioChannel && (
              <div className="flex items-center justify-center gap-1 text-foreground/40 mb-2">
                <Radio size={12} />
                <span className="text-[10px] font-medium">Ch{radioChannel}</span>
              </div>
            )}

            {/* Rain Alert */}
            {hasRainAlert && (
              <div className="mt-2 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  🌧️ Rain
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Original horizontal layout
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse text-2xl">🌡️</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="text-center py-4 text-foreground/40">
        <p className="text-sm">{error || "No weather data"}</p>
      </div>
    );
  }

  const icon = WEATHER_ICONS[weather.code] || "🌡️";
  const description = WEATHER_DESCRIPTIONS[weather.code] || "Unknown";

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-2xl font-bold">{weather.temp}°C</span>
      </div>
      <p className="text-sm text-foreground/50 mt-1">{description}</p>
      {radioChannel && (
        <div className="flex items-center justify-center gap-1 mt-2 text-foreground/40">
          <Radio size={14} />
          <span className="text-xs font-medium">Ch{radioChannel}</span>
        </div>
      )}
    </div>
  );
}

// Helper to check rain at specific hour
export function checkRainAtHour(hourlyData, hour) {
  if (!hourlyData?.time || !hourlyData?.weather_code) return null;

  const hourIndex = hourlyData.time.findIndex((t) => {
    const h = new Date(t).getHours();
    return h === hour;
  });

  if (hourIndex === -1) return null;

  const code = hourlyData.weather_code[hourIndex];
  const precipProb = hourlyData.precipitation_probability?.[hourIndex] || 0;

  // Rain codes: 51-67, 80-82, 95-99
  const isRainy =
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99);

  return {
    isRainy,
    precipProb,
    code,
    icon: WEATHER_ICONS[code],
  };
}
