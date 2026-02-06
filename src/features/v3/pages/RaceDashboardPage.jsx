// RaceDashboardPage.jsx - Race day dashboard with AI Import
// Schedule, todos, countdowns, weather, and smart text parsing
// Data persisted to Supabase with real-time sync across all mechanics

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useOutletContext, useLocation } from "react-router-dom";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Cloud, Sun, CloudRain, Wind, Droplets,
  Plus, Check, Pin, Loader2, X, Trash2, StickyNote, MapPin,
  CloudSun, CloudFog, CloudSnow, CloudLightning, Search, AlertTriangle, Share2, User
} from "lucide-react";
import { Drawer } from "vaul";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../../lib/supabaseClient";

// Rider names for smart parsing
const RIDER_NAMES = ["Ana", "Charlie", "Cole", "Luca", "Jolanda"];

// Weather icons map
const WEATHER_ICONS = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  partlyCloudy: CloudSun,
  fog: CloudFog,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
};

// WMO Weather codes to condition mapping
function getConditionFromCode(code) {
  if (code === 0) return "sunny";
  if (code >= 1 && code <= 3) return "partlyCloudy";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 51 && code <= 55) return "rainy"; // drizzle
  if (code >= 61 && code <= 65) return "rainy";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rainy"; // showers
  if (code >= 95 && code <= 99) return "thunderstorm";
  return "cloudy";
}

// localStorage key (kept for migration, but now using Supabase)
// const LOCATION_STORAGE_KEY = "cfr-race-dashboard-location";

// Format date for Supabase queries (YYYY-MM-DD)
function formatDateForDB(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format time for Supabase (HH:MM:SS)
function formatTimeForDB(date) {
  if (!date) return null;
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}:00`;
}

// Parse time string from DB to Date object
function parseTimeFromDB(timeStr, baseDate) {
  if (!timeStr) return null;
  const [hours, mins] = timeStr.split(":");
  const date = new Date(baseDate);
  date.setHours(parseInt(hours, 10), parseInt(mins, 10), 0, 0);
  return date;
}

// Format time for display
function formatTime(date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Format countdown
function formatCountdown(ms) {
  if (ms <= 0) return "Now";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Parse date string to Date object for selected day
// Handles: "14:30", "14.30", "1430", "0930"
function parseTimeForDay(timeStr, baseDate) {
  // Try HH:MM or HH.MM format first
  let match = timeStr.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) {
    // Try HHMM format (4 digits, no separator)
    match = timeStr.match(/^(\d{2})(\d{2})$/);
  }
  if (!match) return null;
  const [, hours, mins] = match;
  const date = new Date(baseDate);
  date.setHours(parseInt(hours, 10), parseInt(mins, 10), 0, 0);
  return date;
}

// Get weather for a specific hour from hourly forecast
function getWeatherForHour(hourlyData, date) {
  if (!date || !hourlyData?.length) return null;
  const hour = date.getHours();
  // Find exact hour match or closest hour
  const match = hourlyData.find(h => h.hour === hour);
  if (match) return match;
  // Find closest hour if no exact match
  const sorted = [...hourlyData].sort((a, b) =>
    Math.abs(a.hour - hour) - Math.abs(b.hour - hour)
  );
  return sorted[0] || null;
}

// Smart text parser for AI Import
function parseImportText(text, baseDate) {
  const lines = text.split(/\n/).filter(l => l.trim());
  const scheduleItems = [];
  const todoItems = [];

  // Time patterns
  const timePattern = /(\d{1,2}[:.]\d{0,2})\s*[-–:]?\s*(.+)/;
  const todoPatterns = [
    /^[-•*]\s*(.+)/,
    /^\d+[.)]\s*(.+)/,
    /^(swap|check|fix|replace|adjust|set|change|clean|prepare|inspect|verify)/i,
    /^(todo|task):\s*(.+)/i,
  ];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check for time-based schedule item
    const timeMatch = trimmed.match(timePattern);
    if (timeMatch) {
      const [, timeStr, description] = timeMatch;
      const parsedTime = parseTimeForDay(timeStr, baseDate);
      if (parsedTime) {
        // Find rider mentions
        const rider = RIDER_NAMES.find(r =>
          description.toLowerCase().includes(r.toLowerCase())
        );
        scheduleItems.push({
          id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: parsedTime,
          description: description.trim(),
          rider,
          selected: true,
        });
        return;
      }
    }

    // Check for todo patterns
    for (const pattern of todoPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const desc = match[2] || match[1] || trimmed;
        const rider = RIDER_NAMES.find(r =>
          desc.toLowerCase().includes(r.toLowerCase())
        );
        todoItems.push({
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          description: desc.trim(),
          rider,
          selected: true,
        });
        return;
      }
    }

    // Default: if contains time, schedule; else todo
    const hasTime = /\d{1,2}[:.]?\d{2}/.test(trimmed);
    if (hasTime) {
      const timeMatch2 = trimmed.match(/(\d{1,2}[:.]?\d{2})/);
      const time = timeMatch2 ? parseTimeForDay(timeMatch2[1], baseDate) : null;
      const description = trimmed.replace(/\d{1,2}[:.]?\d{2}/, "").trim().replace(/^[-–:]\s*/, "");
      const rider = RIDER_NAMES.find(r => description.toLowerCase().includes(r.toLowerCase()));
      scheduleItems.push({
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time,
        description: description || trimmed,
        rider,
        selected: true,
      });
    } else if (trimmed.length > 2) {
      const rider = RIDER_NAMES.find(r => trimmed.toLowerCase().includes(r.toLowerCase()));
      todoItems.push({
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: trimmed,
        rider,
        selected: true,
      });
    }
  });

  // Sort schedule by time
  scheduleItems.sort((a, b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0));

  return { scheduleItems, todoItems, noteItems: [] };
}

export default function RaceDashboardPage() {
  const navigate = useNavigate();
  const { isDark: _isDark } = useOutletContext(); // Available for future dark theme support

  // Date state
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data state - loaded from Supabase
  const [scheduleItems, setScheduleItems] = useState([]);
  const [todoItems, setTodoItems] = useState([]);
  const [noteItems, setNoteItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Location state - persisted to Supabase (shared across devices)
  const [location, setLocation] = useState(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationResult, setLocationResult] = useState(null);
  const locationInputRef = useRef(null);

  // Close location modal on navigation (fixes iOS swipe-back)
  const routeLocation = useLocation();
  useEffect(() => {
    const closeModal = () => setLocationModalOpen(false);
    closeModal();
    window.addEventListener('popstate', closeModal);
    return () => window.removeEventListener('popstate', closeModal);
  }, [routeLocation.pathname]);

  // Auto-focus location input when modal opens
  useEffect(() => {
    if (locationModalOpen && locationInputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => locationInputRef.current?.focus(), 100);
    }
  }, [locationModalOpen]);

  // Weather state - fetched from Open-Meteo API
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [weatherExpanded, setWeatherExpanded] = useState(false);

  // Load location from Supabase on mount
  useEffect(() => {
    async function loadLocation() {
      const { data, error } = await supabase
        .from("race_day_settings")
        .select("location_name, location_lat, location_lon")
        .eq("id", "default")
        .single();

      if (!error && data?.location_name) {
        setLocation({
          name: data.location_name,
          lat: data.location_lat,
          lon: data.location_lon,
        });
      }
    }
    loadLocation();

    // Subscribe to location changes from other devices
    const channel = supabase
      .channel("race_day_settings_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "race_day_settings", filter: "id=eq.default" },
        (payload) => {
          if (payload.new.location_name) {
            setLocation({
              name: payload.new.location_name,
              lat: payload.new.location_lat,
              lon: payload.new.location_lon,
            });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Fetch weather when location changes or date changes
  useEffect(() => {
    if (!location) return;
    fetchWeather(location.lat, location.lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, selectedDate]);

  // Load data from Supabase when date changes
  const loadDataFromSupabase = useCallback(async () => {
    const dateStr = formatDateForDB(selectedDate);
    setDataLoading(true);

    try {
      // Load schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("race_day_schedule")
        .select("*")
        .eq("race_date", dateStr)
        .order("event_time", { ascending: true });

      if (scheduleError) throw scheduleError;

      // Load todos
      const { data: todosData, error: todosError } = await supabase
        .from("race_day_todos")
        .select("*")
        .eq("race_date", dateStr)
        .order("created_at", { ascending: true });

      if (todosError) throw todosError;

      // Load notes
      const { data: notesData, error: notesError } = await supabase
        .from("race_day_notes")
        .select("*")
        .eq("race_date", dateStr)
        .order("created_at", { ascending: true });

      if (notesError) throw notesError;

      // Transform schedule data (convert time strings to Date objects)
      const schedule = (scheduleData || []).map(item => ({
        id: item.id,
        time: parseTimeFromDB(item.event_time, selectedDate),
        description: item.event,
        riders: item.riders || [], // array of riders
        pinned: item.pinned,
      }));

      // Transform todos data
      const todos = (todosData || []).map(item => ({
        id: item.id,
        description: item.task,
        riders: item.riders || [], // array of riders
        completed: item.completed,
        pinned: item.pinned,
      }));

      // Transform notes data
      const notes = (notesData || []).map(item => ({
        id: item.id,
        text: item.text,
      }));

      setScheduleItems(schedule);
      setTodoItems(todos);
      setNoteItems(notes);
    } catch (err) {
      console.error("[loadDataFromSupabase] Error:", err);
    } finally {
      setDataLoading(false);
    }
  }, [selectedDate]);

  // Load data on mount and when date changes
  useEffect(() => {
    loadDataFromSupabase();
  }, [loadDataFromSupabase]);

  // Real-time subscriptions
  useEffect(() => {
    const dateStr = formatDateForDB(selectedDate);

    // Subscribe to schedule changes
    const scheduleChannel = supabase
      .channel("race_day_schedule_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "race_day_schedule", filter: `race_date=eq.${dateStr}` },
        (payload) => {
          console.log("[realtime] Schedule change:", payload);
          if (payload.eventType === "INSERT") {
            const incomingRiders = Array.isArray(payload.new.riders) ? payload.new.riders : [];
            const newItem = {
              id: payload.new.id,
              time: parseTimeFromDB(payload.new.event_time, selectedDate),
              description: payload.new.event,
              riders: incomingRiders,
              pinned: payload.new.pinned,
            };
            setScheduleItems(prev => {
              // Check if we already have this item (optimistic update) - match by description + time
              const existingByContent = prev.find(s =>
                s.description === newItem.description &&
                Math.abs((s.time?.getTime() || 0) - (newItem.time?.getTime() || 0)) < 60000
              );
              // If existing item has riders but incoming doesn't, preserve existing riders
              if (existingByContent && existingByContent.riders?.length > 0 && incomingRiders.length === 0) {
                newItem.riders = existingByContent.riders;
              }
              // Remove any matching items (by ID or by content)
              const filtered = prev.filter(s =>
                s.id !== newItem.id &&
                !(s.description === newItem.description &&
                  Math.abs((s.time?.getTime() || 0) - (newItem.time?.getTime() || 0)) < 60000)
              );
              return [...filtered, newItem]
                .sort((a, b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0));
            });
          } else if (payload.eventType === "UPDATE") {
            const incomingRiders = Array.isArray(payload.new.riders) ? payload.new.riders : [];
            setScheduleItems(prev => prev.map(s =>
              s.id === payload.new.id ? {
                ...s,
                time: parseTimeFromDB(payload.new.event_time, selectedDate),
                description: payload.new.event,
                // Preserve existing riders if incoming is empty but existing has riders
                riders: incomingRiders.length > 0 ? incomingRiders : (s.riders || []),
                pinned: payload.new.pinned,
              } : s
            ));
          } else if (payload.eventType === "DELETE") {
            setScheduleItems(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to todos changes
    const todosChannel = supabase
      .channel("race_day_todos_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "race_day_todos", filter: `race_date=eq.${dateStr}` },
        (payload) => {
          console.log("[realtime] Todos change:", payload);
          if (payload.eventType === "INSERT") {
            const incomingRiders = Array.isArray(payload.new.riders) ? payload.new.riders : [];
            const newItem = {
              id: payload.new.id,
              description: payload.new.task,
              riders: incomingRiders,
              completed: payload.new.completed,
              pinned: payload.new.pinned,
            };
            setTodoItems(prev => {
              // Check if we already have this item (optimistic update) - match by description
              const existingByContent = prev.find(t => t.description === newItem.description);
              // If existing item has riders but incoming doesn't, preserve existing riders
              if (existingByContent && existingByContent.riders?.length > 0 && incomingRiders.length === 0) {
                newItem.riders = existingByContent.riders;
              }
              // Remove any matching items (by ID or by content)
              const filtered = prev.filter(t =>
                t.id !== newItem.id && t.description !== newItem.description
              );
              return [...filtered, newItem];
            });
          } else if (payload.eventType === "UPDATE") {
            const incomingRiders = Array.isArray(payload.new.riders) ? payload.new.riders : [];
            setTodoItems(prev => prev.map(t =>
              t.id === payload.new.id ? {
                ...t,
                description: payload.new.task,
                // Preserve existing riders if incoming is empty but existing has riders
                riders: incomingRiders.length > 0 ? incomingRiders : (t.riders || []),
                completed: payload.new.completed,
                pinned: payload.new.pinned,
              } : t
            ));
          } else if (payload.eventType === "DELETE") {
            setTodoItems(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to notes changes
    const notesChannel = supabase
      .channel("race_day_notes_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "race_day_notes", filter: `race_date=eq.${dateStr}` },
        (payload) => {
          console.log("[realtime] Notes change:", payload);
          if (payload.eventType === "INSERT") {
            const newItem = { id: payload.new.id, text: payload.new.text };
            setNoteItems(prev => [...prev.filter(n => n.id !== newItem.id), newItem]);
          } else if (payload.eventType === "DELETE") {
            setNoteItems(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount or date change
    return () => {
      supabase.removeChannel(scheduleChannel);
      supabase.removeChannel(todosChannel);
      supabase.removeChannel(notesChannel);
    };
  }, [selectedDate]);

  // Geocoding with Nominatim
  async function searchLocation(query) {
    if (!query.trim()) return;
    setLocationSearching(true);
    setLocationResult(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { "User-Agent": "CFR-Racing-App" } }
      );
      const data = await response.json();

      if (data.length > 0) {
        const result = data[0];
        setLocationResult({
          name: result.display_name.split(",").slice(0, 2).join(", "),
          fullName: result.display_name,
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
        });
      } else {
        setLocationResult({ error: "Location not found" });
      }
    } catch (err) {
      console.error("[searchLocation] Error:", err);
      setLocationResult({ error: "Search failed" });
    } finally {
      setLocationSearching(false);
    }
  }

  async function confirmLocation() {
    if (locationResult && !locationResult.error) {
      const newLocation = {
        name: locationResult.name,
        lat: locationResult.lat,
        lon: locationResult.lon,
      };

      // Optimistic update
      setLocation(newLocation);
      setLocationModalOpen(false);
      setLocationSearch("");
      setLocationResult(null);

      // Save to Supabase (shared across all devices)
      const { error } = await supabase
        .from("race_day_settings")
        .upsert({
          id: "default",
          location_name: newLocation.name,
          location_lat: newLocation.lat,
          location_lon: newLocation.lon,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("[confirmLocation] Error saving to Supabase:", error);
      }
    }
  }

  // Fetch weather from Open-Meteo
  async function fetchWeather(lat, lon) {
    setWeatherLoading(true);
    setWeatherError(null);

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&timezone=auto&forecast_days=3`;
      console.log("[fetchWeather] Fetching:", url);
      const response = await fetch(url);
      const data = await response.json();
      console.log("[fetchWeather] Response:", data);

      if (!data.hourly) {
        throw new Error("Invalid weather data");
      }

      // Use local date format (not UTC) to match weather API timezone
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const targetDateStr = `${year}-${month}-${day}`;
      console.log("[fetchWeather] Target date:", targetDateStr);

      const hourly = [];

      data.hourly.time.forEach((timeStr, i) => {
        const dateStr = timeStr.split("T")[0];
        if (dateStr === targetDateStr) {
          const hour = parseInt(timeStr.split("T")[1].split(":")[0], 10);
          const code = data.hourly.weathercode[i];
          hourly.push({
            hour,
            temp: Math.round(data.hourly.temperature_2m[i]),
            condition: getConditionFromCode(code),
            wind: Math.round(data.hourly.windspeed_10m[i]),
            rainProb: data.hourly.precipitation_probability[i] || 0,
          });
        }
      });

      console.log("[fetchWeather] Parsed hourly data:", hourly.length, "hours");

      // Get current hour data
      const currentHour = new Date().getHours();
      const currentData = hourly.find(h => h.hour === currentHour) || hourly[0];

      // Get later data (end of day or last schedule item)
      const laterData = hourly.find(h => h.hour === 18) || hourly[hourly.length - 1];

      const weatherState = {
        current: currentData ? {
          temp: currentData.temp,
          condition: currentData.condition,
          wind: currentData.wind,
        } : null,
        later: laterData ? { temp: laterData.temp } : null,
        hourly,
        fetchedAt: Date.now(),
      };
      console.log("[fetchWeather] Setting weather state:", weatherState);
      setWeather(weatherState);
    } catch (err) {
      console.error("[fetchWeather] Error:", err);
      setWeatherError("Failed to load weather");
    } finally {
      setWeatherLoading(false);
    }
  }

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importProcessing, setImportProcessing] = useState(false);
  const [importPreview, setImportPreview] = useState(null);

  // Clear all confirmation modal
  const [clearModalOpen, setClearModalOpen] = useState(false);

  // Quick add modals state
  const [scheduleAddOpen, setScheduleAddOpen] = useState(false);
  const [todoAddOpen, setTodoAddOpen] = useState(false);
  const [noteAddOpen, setNoteAddOpen] = useState(false);

  // Rider day view modal
  const [riderDayModalOpen, setRiderDayModalOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  // Close modals on navigation (fixes iOS swipe-back leaving modals open)
  useEffect(() => {
    const closeAllModals = () => {
      setImportModalOpen(false);
      setClearModalOpen(false);
      setScheduleAddOpen(false);
      setTodoAddOpen(false);
      setNoteAddOpen(false);
      setRiderDayModalOpen(false);
    };

    closeAllModals();
    window.addEventListener('popstate', closeAllModals);
    return () => window.removeEventListener('popstate', closeAllModals);
  }, [routeLocation.pathname]);

  // Quick add form state
  const [newScheduleTime, setNewScheduleTime] = useState("");
  const [newScheduleEvent, setNewScheduleEvent] = useState("");
  const [newScheduleRider, setNewScheduleRider] = useState("");
  const [newTodoTask, setNewTodoTask] = useState("");
  const [newTodoRider, setNewTodoRider] = useState("");
  const [newNoteText, setNewNoteText] = useState("");

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Computed values
  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const dayLabel = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = days[selectedDate.getDay()];
    const date = selectedDate.getDate();
    if (isToday) return `Today (${day} ${date})`;
    return `${day} ${date}`;
  }, [selectedDate, isToday]);

  const nextUpItem = useMemo(() => {
    const now = currentTime.getTime();
    const upcoming = scheduleItems
      .filter(item => item.time && item.time.getTime() > now)
      .sort((a, b) => a.time.getTime() - b.time.getTime());
    return upcoming[0] || null;
  }, [scheduleItems, currentTime]);

  const pinnedItems = useMemo(() => {
    const pinned = [
      ...scheduleItems.filter(s => s.pinned).map(s => ({ ...s, type: "schedule" })),
      ...todoItems.filter(t => t.pinned && !t.completed).map(t => ({ ...t, type: "todo" })),
    ];
    return pinned;
  }, [scheduleItems, todoItems]);

  const todoStats = useMemo(() => {
    const completed = todoItems.filter(t => t.completed).length;
    return { completed, total: todoItems.length };
  }, [todoItems]);

  // Handlers
  function navigateDay(delta) {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  async function toggleTodo(id) {
    const item = todoItems.find(t => t.id === id);
    if (!item) return;

    const newCompleted = !item.completed;

    // Optimistic update
    setTodoItems(prev => prev.map(t =>
      t.id === id ? { ...t, completed: newCompleted } : t
    ));

    // Persist to Supabase
    const { error } = await supabase
      .from("race_day_todos")
      .update({ completed: newCompleted })
      .eq("id", id);

    if (error) {
      console.error("[toggleTodo] Error:", error);
      // Revert on error
      setTodoItems(prev => prev.map(t =>
        t.id === id ? { ...t, completed: !newCompleted } : t
      ));
    }
  }

  async function togglePin(type, id) {
    if (type === "schedule") {
      const item = scheduleItems.find(s => s.id === id);
      if (!item) return;

      const newPinned = !item.pinned;

      // Optimistic update
      setScheduleItems(prev => prev.map(s =>
        s.id === id ? { ...s, pinned: newPinned } : s
      ));

      // Persist to Supabase
      const { error } = await supabase
        .from("race_day_schedule")
        .update({ pinned: newPinned })
        .eq("id", id);

      if (error) {
        console.error("[togglePin schedule] Error:", error);
        setScheduleItems(prev => prev.map(s =>
          s.id === id ? { ...s, pinned: !newPinned } : s
        ));
      }
    } else {
      const item = todoItems.find(t => t.id === id);
      if (!item) return;

      const newPinned = !item.pinned;

      // Optimistic update
      setTodoItems(prev => prev.map(t =>
        t.id === id ? { ...t, pinned: newPinned } : t
      ));

      // Persist to Supabase
      const { error } = await supabase
        .from("race_day_todos")
        .update({ pinned: newPinned })
        .eq("id", id);

      if (error) {
        console.error("[togglePin todo] Error:", error);
        setTodoItems(prev => prev.map(t =>
          t.id === id ? { ...t, pinned: !newPinned } : t
        ));
      }
    }
  }

  async function deleteItem(type, id) {
    if (type === "schedule") {
      // Optimistic update
      const deleted = scheduleItems.find(s => s.id === id);
      setScheduleItems(prev => prev.filter(s => s.id !== id));

      // Persist to Supabase
      const { error } = await supabase
        .from("race_day_schedule")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[deleteItem schedule] Error:", error);
        if (deleted) setScheduleItems(prev => [...prev, deleted]);
      }
    } else if (type === "note") {
      const deleted = noteItems.find(n => n.id === id);
      setNoteItems(prev => prev.filter(n => n.id !== id));

      const { error } = await supabase
        .from("race_day_notes")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[deleteItem note] Error:", error);
        if (deleted) setNoteItems(prev => [...prev, deleted]);
      }
    } else {
      const deleted = todoItems.find(t => t.id === id);
      setTodoItems(prev => prev.filter(t => t.id !== id));

      const { error } = await supabase
        .from("race_day_todos")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[deleteItem todo] Error:", error);
        if (deleted) setTodoItems(prev => [...prev, deleted]);
      }
    }
  }

  async function clearAllItems() {
    const dateStr = formatDateForDB(selectedDate);

    // Optimistic update
    const oldSchedule = scheduleItems;
    const oldTodos = todoItems;
    const oldNotes = noteItems;

    setScheduleItems([]);
    setTodoItems([]);
    setNoteItems([]);
    setClearModalOpen(false);

    // Delete from Supabase
    const [scheduleResult, todosResult, notesResult] = await Promise.all([
      supabase.from("race_day_schedule").delete().eq("race_date", dateStr),
      supabase.from("race_day_todos").delete().eq("race_date", dateStr),
      supabase.from("race_day_notes").delete().eq("race_date", dateStr),
    ]);

    if (scheduleResult.error || todosResult.error || notesResult.error) {
      console.error("[clearAllItems] Error:", { scheduleResult, todosResult, notesResult });
      // Revert on error
      setScheduleItems(oldSchedule);
      setTodoItems(oldTodos);
      setNoteItems(oldNotes);
    }
  }

  // Import handlers
  async function processImport() {
    if (!importText.trim()) return;
    setImportProcessing(true);

    try {
      // Format date for the edge function
      const dateStr = selectedDate.toISOString().split("T")[0];

      console.log("[processImport] Calling edge function with:", { textLength: importText.length, date: dateStr });

      // Call Supabase edge function
      const { data, error } = await supabase.functions.invoke("parse-plan", {
        body: { text: importText, date: dateStr },
      });

      console.log("[processImport] Edge function response:", { data, error });

      if (error) {
        console.error("[processImport] Edge function error:", error);
        // Fall back to local parsing
        const parsed = parseImportText(importText, selectedDate);
        setImportPreview(parsed);
      } else {
        console.log("[processImport] AI parsed schedule items:", data.schedule);
        console.log("[processImport] AI parsed todos:", data.todos);
        console.log("[processImport] AI parsed notes:", data.notes);

        // Convert edge function response to internal format
        const scheduleItems = (data.schedule || []).map((item, i) => {
          const time = item.time ? parseTimeForDay(item.time, selectedDate) : null;
          // Handle riders array (filter to valid rider names)
          const riders = Array.isArray(item.riders)
            ? item.riders.filter(r => RIDER_NAMES.includes(r))
            : (item.rider && RIDER_NAMES.includes(item.rider) ? [item.rider] : []);
          console.log("[processImport] Converting schedule item:", item, "→ time:", time, "riders:", riders);
          return {
            id: `s-${Date.now()}-${i}`,
            time,
            description: item.event,
            riders, // array of riders
            selected: true,
          };
        });

        const todoItems = (data.todos || []).map((item, i) => {
          const riders = Array.isArray(item.riders)
            ? item.riders.filter(r => RIDER_NAMES.includes(r))
            : (item.rider && RIDER_NAMES.includes(item.rider) ? [item.rider] : []);
          return {
            id: `t-${Date.now()}-${i}`,
            description: item.task,
            riders, // array of riders
            selected: true,
          };
        });

        const noteItems = (data.notes || []).map((item, i) => ({
          id: `n-${Date.now()}-${i}`,
          text: item.text,
          selected: true,
        }));

        // Sort schedule by time
        scheduleItems.sort((a, b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0));

        console.log("[processImport] Final preview:", { scheduleItems, todoItems, noteItems });
        setImportPreview({ scheduleItems, todoItems, noteItems });
      }
    } catch (err) {
      console.error("[processImport] Error:", err);
      // Fall back to local parsing
      const parsed = parseImportText(importText, selectedDate);
      setImportPreview(parsed);
    } finally {
      setImportProcessing(false);
    }
  }

  function togglePreviewItem(type, id) {
    if (!importPreview) return;
    if (type === "schedule") {
      setImportPreview(prev => ({
        ...prev,
        scheduleItems: prev.scheduleItems.map(s =>
          s.id === id ? { ...s, selected: !s.selected } : s
        ),
      }));
    } else if (type === "note") {
      setImportPreview(prev => ({
        ...prev,
        noteItems: (prev.noteItems || []).map(n =>
          n.id === id ? { ...n, selected: !n.selected } : n
        ),
      }));
    } else {
      setImportPreview(prev => ({
        ...prev,
        todoItems: prev.todoItems.map(t =>
          t.id === id ? { ...t, selected: !t.selected } : t
        ),
      }));
    }
  }

  // Check if schedule item is a duplicate (same time + similar event name)
  function isDuplicateSchedule(newItem, existingItems) {
    if (!newItem.time) return false;
    const newTimeStr = formatTime(newItem.time);
    const newDesc = newItem.description.toLowerCase().trim();

    return existingItems.some(existing => {
      if (!existing.time) return false;
      const existingTimeStr = formatTime(existing.time);
      const existingDesc = existing.description.toLowerCase().trim();

      // Same time
      if (newTimeStr !== existingTimeStr) return false;

      // Exact match or very similar description
      if (newDesc === existingDesc) return true;
      // Check if one contains the other (e.g. "Pre race meals" vs "Pre race meals lads")
      if (newDesc.includes(existingDesc) || existingDesc.includes(newDesc)) return true;

      return false;
    });
  }

  // Check if todo item is a duplicate
  function isDuplicateTodo(newItem, existingItems) {
    const newDesc = newItem.description.toLowerCase().trim();
    return existingItems.some(existing =>
      existing.description.toLowerCase().trim() === newDesc
    );
  }

  async function confirmImport() {
    if (!importPreview) return;

    const dateStr = formatDateForDB(selectedDate);

    // Filter out duplicates before adding
    const newSchedule = importPreview.scheduleItems
      .filter(s => s.selected)
      .filter(s => !isDuplicateSchedule(s, scheduleItems))
      .map(s => ({
        id: s.id,
        time: s.time,
        description: s.description,
        riders: s.riders || [], // array of riders
        pinned: false,
      }));

    const newTodos = importPreview.todoItems
      .filter(t => t.selected)
      .filter(t => !isDuplicateTodo(t, todoItems))
      .map(t => ({
        id: t.id,
        description: t.description,
        riders: t.riders || [], // array of riders
        completed: false,
        pinned: false,
      }));

    const newNotes = (importPreview.noteItems || [])
      .filter(n => n.selected)
      .map(n => ({
        id: n.id,
        text: n.text,
      }));

    // Optimistic update
    setScheduleItems(prev => [...prev, ...newSchedule].sort((a, b) =>
      (a.time?.getTime() || 0) - (b.time?.getTime() || 0)
    ));
    setTodoItems(prev => [...prev, ...newTodos]);
    setNoteItems(prev => [...prev, ...newNotes]);

    // Reset modal
    setImportModalOpen(false);
    setImportText("");
    setImportPreview(null);

    // Persist to Supabase
    try {
      // Insert schedule items
      if (newSchedule.length > 0) {
        const scheduleRows = newSchedule.map(s => ({
          race_date: dateStr,
          event_time: formatTimeForDB(s.time),
          event: s.description,
          riders: s.riders || [],
          pinned: false,
        }));

        const { data: insertedSchedule, error: scheduleError } = await supabase
          .from("race_day_schedule")
          .insert(scheduleRows)
          .select();

        if (scheduleError) {
          console.error("[confirmImport] Schedule insert error:", scheduleError);
        } else if (insertedSchedule) {
          // Update local IDs with Supabase UUIDs
          setScheduleItems(prev => {
            const updated = [...prev];
            insertedSchedule.forEach((dbItem, i) => {
              const localIdx = updated.findIndex(s => s.id === newSchedule[i].id);
              if (localIdx !== -1) {
                updated[localIdx] = { ...updated[localIdx], id: dbItem.id };
              }
            });
            return updated;
          });
        }
      }

      // Insert todo items
      if (newTodos.length > 0) {
        const todoRows = newTodos.map(t => ({
          race_date: dateStr,
          task: t.description,
          riders: t.riders || [],
          completed: false,
          pinned: false,
        }));

        const { data: insertedTodos, error: todosError } = await supabase
          .from("race_day_todos")
          .insert(todoRows)
          .select();

        if (todosError) {
          console.error("[confirmImport] Todos insert error:", todosError);
        } else if (insertedTodos) {
          setTodoItems(prev => {
            const updated = [...prev];
            insertedTodos.forEach((dbItem, i) => {
              const localIdx = updated.findIndex(t => t.id === newTodos[i].id);
              if (localIdx !== -1) {
                updated[localIdx] = { ...updated[localIdx], id: dbItem.id };
              }
            });
            return updated;
          });
        }
      }

      // Insert note items
      if (newNotes.length > 0) {
        const noteRows = newNotes.map(n => ({
          race_date: dateStr,
          text: n.text,
        }));

        const { data: insertedNotes, error: notesError } = await supabase
          .from("race_day_notes")
          .insert(noteRows)
          .select();

        if (notesError) {
          console.error("[confirmImport] Notes insert error:", notesError);
        } else if (insertedNotes) {
          setNoteItems(prev => {
            const updated = [...prev];
            insertedNotes.forEach((dbItem, i) => {
              const localIdx = updated.findIndex(n => n.id === newNotes[i].id);
              if (localIdx !== -1) {
                updated[localIdx] = { ...updated[localIdx], id: dbItem.id };
              }
            });
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("[confirmImport] Error persisting to Supabase:", err);
    }
  }

  function cancelImport() {
    setImportModalOpen(false);
    setImportText("");
    setImportPreview(null);
    setImportProcessing(false);
  }

  // Quick add handlers
  async function addScheduleItem() {
    if (!newScheduleTime || !newScheduleEvent.trim()) return;

    const dateStr = formatDateForDB(selectedDate);
    const time = parseTimeForDay(newScheduleTime, selectedDate);
    const tempId = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const riders = newScheduleRider ? [newScheduleRider] : [];

    const newItem = {
      id: tempId,
      time,
      description: newScheduleEvent.trim(),
      riders,
      pinned: false,
    };

    // Optimistic update
    setScheduleItems(prev =>
      [...prev, newItem].sort((a, b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0))
    );

    // Reset form
    setNewScheduleTime("");
    setNewScheduleEvent("");
    setNewScheduleRider("");
    setScheduleAddOpen(false);

    // Persist to Supabase
    const { data, error } = await supabase
      .from("race_day_schedule")
      .insert({
        race_date: dateStr,
        event_time: formatTimeForDB(time),
        event: newItem.description,
        riders: newItem.riders,
        pinned: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[addScheduleItem] Error:", error);
      setScheduleItems(prev => prev.filter(s => s.id !== tempId));
    } else if (data) {
      // Update with real ID from Supabase
      setScheduleItems(prev => prev.map(s =>
        s.id === tempId ? { ...s, id: data.id } : s
      ));
    }
  }

  async function addTodoItem() {
    if (!newTodoTask.trim()) return;

    const dateStr = formatDateForDB(selectedDate);
    const tempId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const riders = newTodoRider ? [newTodoRider] : [];

    const newItem = {
      id: tempId,
      description: newTodoTask.trim(),
      riders,
      completed: false,
      pinned: false,
    };

    // Optimistic update
    setTodoItems(prev => [...prev, newItem]);

    // Reset form
    setNewTodoTask("");
    setNewTodoRider("");
    setTodoAddOpen(false);

    // Persist to Supabase
    const { data, error } = await supabase
      .from("race_day_todos")
      .insert({
        race_date: dateStr,
        task: newItem.description,
        riders: newItem.riders,
        completed: false,
        pinned: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[addTodoItem] Error:", error);
      setTodoItems(prev => prev.filter(t => t.id !== tempId));
    } else if (data) {
      setTodoItems(prev => prev.map(t =>
        t.id === tempId ? { ...t, id: data.id } : t
      ));
    }
  }

  async function addNoteItem() {
    if (!newNoteText.trim()) return;

    const dateStr = formatDateForDB(selectedDate);
    const tempId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const newItem = {
      id: tempId,
      text: newNoteText.trim(),
    };

    // Optimistic update
    setNoteItems(prev => [...prev, newItem]);

    // Reset form
    setNewNoteText("");
    setNoteAddOpen(false);

    // Persist to Supabase
    const { data, error } = await supabase
      .from("race_day_notes")
      .insert({
        race_date: dateStr,
        text: newItem.text,
      })
      .select()
      .single();

    if (error) {
      console.error("[addNoteItem] Error:", error);
      setNoteItems(prev => prev.filter(n => n.id !== tempId));
    } else if (data) {
      setNoteItems(prev => prev.map(n =>
        n.id === tempId ? { ...n, id: data.id } : n
      ));
    }
  }

  // Rider color
  function getRiderColor(rider) {
    const colors = {
      Ana: "var(--status-destructive)",
      Charlie: "#4ecdc4",
      Cole: "#ffe66d",
      Luca: "#95e1d3",
      Jolanda: "#dda0dd",
    };
    return colors[rider] || "var(--text-muted)";
  }

  // Open rider day view modal
  function openRiderDayView(rider) {
    setSelectedRider(rider);
    setRiderDayModalOpen(true);
  }

  // Get rider's schedule for the day
  const riderSchedule = useMemo(() => {
    if (!selectedRider) return [];
    return scheduleItems.filter(item =>
      item.riders?.includes(selectedRider)
    ).sort((a, b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0));
  }, [selectedRider, scheduleItems]);

  // Get rider's todos for the day
  const riderTodos = useMemo(() => {
    if (!selectedRider) return [];
    return todoItems.filter(item =>
      item.riders?.includes(selectedRider)
    );
  }, [selectedRider, todoItems]);

  // Rider photo mapping
  const RIDER_PHOTOS = {
    Ana: "/riders/ana.png",
    Charlie: "/riders/charlie.png",
    Cole: "/riders/cole.png",
    Luca: "/riders/luca.png",
    Jolanda: "/riders/jolanda.png",
  };

  // Format rider's day for WhatsApp sharing
  function formatRiderDayForShare(rider) {
    const dateStr = selectedDate.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    let text = `🚴 ${rider}'s Day - ${dateStr}\n\n`;

    if (riderSchedule.length > 0) {
      text += "📅 SCHEDULE\n";
      riderSchedule.forEach(item => {
        const time = item.time ? formatTime(item.time) : "--:--";
        text += `${time}  ${item.description}\n`;
      });
      text += "\n";
    }

    if (riderTodos.length > 0) {
      text += "✅ TODOS\n";
      riderTodos.forEach(item => {
        const check = item.completed ? "✓" : "☐";
        text += `${check} ${item.description}\n`;
      });
    }

    return text.trim();
  }

  // Share rider's day via WhatsApp
  function shareRiderDay(rider) {
    const text = formatRiderDayForShare(rider);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  // Weather icon component
  const WeatherIcon = weather?.current?.condition
    ? (WEATHER_ICONS[weather.current.condition] || Cloud)
    : Cloud;

  return (
    <div
      className="min-h-dvh font-sans"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      <div className="max-w-lg mx-auto px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-24">

        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/v3")}
            className="p-2 -ml-2 rounded-xl text-white active:bg-[rgba(255,255,255,0.06)]"
          >
            <ArrowLeft size={24} />
          </button>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDay(-1)}
              className="p-2 rounded-lg text-text-muted active:bg-[rgba(255,255,255,0.06)]"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-white font-semibold min-w-[100px] text-center">
              {dayLabel}
            </span>
            <button
              onClick={() => navigateDay(1)}
              className="p-2 rounded-lg text-text-muted active:bg-[rgba(255,255,255,0.06)]"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            {/* Clear Day button - only show if there are items */}
            {(scheduleItems.length > 0 || todoItems.length > 0 || noteItems.length > 0) && (
              <button
                onClick={() => setClearModalOpen(true)}
                className="p-2 rounded-xl text-text-muted active:bg-[rgba(255,255,255,0.06)]"
                title="Clear day"
              >
                <Trash2 size={18} />
              </button>
            )}
            {/* Weather icon */}
            <button
              onClick={() => setWeatherExpanded(!weatherExpanded)}
              className="p-2 rounded-xl text-white active:bg-[rgba(255,255,255,0.06)]"
            >
              {weatherLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <WeatherIcon size={20} />
              )}
            </button>
          </div>
        </header>

        {/* Location Bar */}
        <button
          onClick={() => setLocationModalOpen(true)}
          className="w-full mb-6 flex items-center justify-center gap-2 py-2 rounded-xl bg-app-surface text-text-muted active:bg-app-elevated transition"
        >
          <MapPin size={14} />
          <span className="text-sm">
            {location ? location.name : "Set Location"}
          </span>
        </button>

        {/* Large Clock */}
        <div className="text-center mb-8">
          <div className="text-white font-bold text-[56px] leading-none tracking-tight font-mono tabular-nums">
            {formatTime(currentTime)}
          </div>
          {dataLoading && (
            <div className="flex items-center justify-center gap-2 mt-2 text-text-muted text-xs">
              <Loader2 size={12} className="animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>

        {/* Next Up + Weather Row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Next Up Card - with orange left border accent */}
          <div className="bg-app-surface rounded-2xl p-4 border-l-[3px] border-l-brand-orange">
            <div className="text-text-muted text-xs font-semibold tracking-wider mb-2">NEXT UP</div>
            {nextUpItem ? (
              <>
                <div className="text-white font-semibold text-sm mb-1 truncate">
                  {nextUpItem.description}
                </div>
                <div className="text-brand-orange font-bold text-2xl font-mono tabular-nums">
                  {formatCountdown(nextUpItem.time.getTime() - currentTime.getTime())}
                </div>
              </>
            ) : (
              <div className="text-text-muted text-sm">Nothing scheduled</div>
            )}
          </div>

          {/* Weather Card */}
          <button
            onClick={() => location ? setWeatherExpanded(!weatherExpanded) : setLocationModalOpen(true)}
            className="bg-app-surface rounded-2xl p-4 text-left active:bg-app-elevated transition"
          >
            <div className="text-text-muted text-xs font-semibold tracking-wider mb-2">WEATHER</div>
            {!location ? (
              <div className="flex items-center gap-2 text-text-muted">
                <MapPin size={16} />
                <span className="text-sm">Set location</span>
              </div>
            ) : weatherLoading ? (
              <div className="flex items-center gap-2 text-text-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : weatherError ? (
              <div className="text-status-destructive text-sm">{weatherError}</div>
            ) : weather?.current ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <WeatherIcon size={18} className="text-white" />
                  <span className="text-white font-bold text-xl">{weather.current.temp}°</span>
                  {weather.later && (
                    <>
                      <span className="text-text-muted">→</span>
                      <span className="text-text-muted">{weather.later.temp}°</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-text-muted text-xs">
                  <Wind size={12} />
                  <span>{weather.current.wind} km/h</span>
                </div>
              </>
            ) : (
              <div className="text-text-muted text-sm">No data</div>
            )}
          </button>
        </div>

        {/* Weather Expanded */}
        <AnimatePresence>
          {weatherExpanded && weather?.hourly?.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-app-surface rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-text-muted text-xs font-semibold tracking-wider">HOURLY</div>
                  {location && (
                    <div className="text-text-muted text-xs flex items-center gap-1">
                      <MapPin size={10} />
                      {location.name}
                    </div>
                  )}
                </div>
                <div className="flex justify-between overflow-x-auto gap-3 pb-1 scrollbar-dark">
                  {weather.hourly.filter(h => h.hour >= 7 && h.hour <= 20).slice(0, 7).map((h, i) => {
                    const Icon = WEATHER_ICONS[h.condition] || Cloud;
                    const hasHighRain = h.rainProb > 50;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 min-w-[40px]">
                        <span className="text-text-muted text-xs">{String(h.hour).padStart(2, '0')}:00</span>
                        <Icon size={16} className={hasHighRain ? "text-[#6ba3d6]" : "text-text-muted"} />
                        <span className="text-white text-sm font-semibold">{h.temp}°</span>
                        {h.rainProb > 20 && (
                          <div className="flex items-center gap-0.5">
                            <Droplets size={10} className="text-[#6ba3d6]" />
                            <span className="text-[#6ba3d6] text-[10px]">{h.rainProb}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pinned Countdowns */}
        {pinnedItems.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-dark">
              {pinnedItems.map(item => (
                <div
                  key={item.id}
                  className="flex-shrink-0 bg-app-elevated rounded-xl px-3 py-2 border-l-2 border-brand-orange"
                >
                  <div className="text-white text-xs font-medium truncate max-w-[120px]">
                    {item.description}
                  </div>
                  {item.type === "schedule" && item.time && (
                    <div className="text-brand-orange text-sm font-bold font-mono tabular-nums">
                      {formatCountdown(item.time.getTime() - currentTime.getTime())}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-text-muted text-xs font-semibold tracking-wider">SCHEDULE</div>
              <button
                onClick={() => setScheduleAddOpen(true)}
                className="p-1 rounded-md text-text-muted hover:text-brand-orange active:bg-[rgba(255,255,255,0.06)] transition"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={() => setImportModalOpen(true)}
              className="text-brand-orange text-xs font-semibold flex items-center gap-1 active:opacity-70"
            >
              <Plus size={14} />
              Import
            </button>
          </div>

          {scheduleItems.length === 0 ? (
            <div className="text-text-muted text-sm py-4 text-center">No events scheduled</div>
          ) : (
            <div className="space-y-2">
              {scheduleItems.map(item => {
                const hourWeather = weather?.hourly ? getWeatherForHour(weather.hourly, item.time) : null;
                // Highlight row with blue tint when rain probability > 50%
                // This alerts the team to potential weather issues for that time slot
                const hasHighRainProb = hourWeather?.rainProb > 50;
                const showWind = hourWeather?.wind >= 15;
                const WeatherCondIcon = hourWeather ? (WEATHER_ICONS[hourWeather.condition] || Cloud) : null;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
                      hasHighRainProb
                        ? "bg-[#1a2430] border border-[#2a3a4a]"
                        : "bg-app-surface"
                    }`}
                  >
                    {/* Left column: Time + Event (~70%) */}
                    <div className="flex items-center gap-3 flex-[7] min-w-0">
                      {/* Time */}
                      <div className="text-text-muted font-mono tabular-nums text-sm w-12 flex-shrink-0">
                        {item.time ? formatTime(item.time) : "--:--"}
                      </div>

                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm truncate">{item.description}</div>
                        {item.riders?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.riders.map(rider => (
                              <button
                                key={rider}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRiderDayView(rider);
                                }}
                                className="inline-block text-[10px] px-1.5 py-0.5 rounded-md font-medium hover:opacity-80 active:scale-95 transition-all"
                                style={{
                                  backgroundColor: `${getRiderColor(rider)}20`,
                                  color: getRiderColor(rider),
                                }}
                              >
                                {rider}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right column: Weather (~30%) */}
                    <div className="flex items-center gap-2 flex-[3] justify-end">
                      {hourWeather && (
                        <div className="flex items-center gap-1.5">
                          {/* Weather icon */}
                          {WeatherCondIcon && (
                            <WeatherCondIcon
                              size={16}
                              className={hasHighRainProb ? "text-[#6ba3d6]" : "text-text-muted"}
                            />
                          )}
                          {/* Temperature */}
                          <span className="text-white text-sm font-medium">
                            {hourWeather.temp}°
                          </span>
                          {/* Wind if significant */}
                          {showWind && (
                            <div className="flex items-center gap-0.5 text-text-muted text-xs">
                              <Wind size={12} />
                              <span>{hourWeather.wind}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions - subtle until interacted, always visible if pinned */}
                      <div className={`flex items-center gap-1 transition-opacity ${item.pinned ? "" : "opacity-40 hover:opacity-100"}`}>
                        <button
                          onClick={() => togglePin("schedule", item.id)}
                          className={`p-1.5 rounded-lg transition ${
                            item.pinned
                              ? "text-brand-orange bg-[rgba(233,78,27,0.15)]"
                              : "text-text-muted active:bg-[rgba(255,255,255,0.06)]"
                          }`}
                        >
                          <Pin size={14} />
                        </button>
                        <button
                          onClick={() => deleteItem("schedule", item.id)}
                          className="p-1.5 rounded-lg text-text-muted active:bg-[rgba(255,255,255,0.06)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Todos Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-text-muted text-xs font-semibold tracking-wider">TODOS</div>
              <button
                onClick={() => setTodoAddOpen(true)}
                className="p-1 rounded-md text-text-muted hover:text-brand-orange active:bg-[rgba(255,255,255,0.06)] transition"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="text-text-muted text-xs font-mono">
              {todoStats.completed}/{todoStats.total}
            </div>
          </div>

          {todoItems.length === 0 ? (
            <div className="text-text-muted text-sm py-4 text-center">No todos</div>
          ) : (
            <div className="space-y-2">
              {todoItems.map(item => (
                <div
                  key={item.id}
                  className={`bg-app-surface rounded-xl px-4 py-3 flex items-center gap-3 transition ${
                    item.completed ? "opacity-30" : ""
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(item.id)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                      item.completed
                        ? "bg-brand-orange border-brand-orange"
                        : "border-text-muted"
                    }`}
                  >
                    {item.completed && <Check size={12} className="text-white" />}
                  </button>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${
                      item.completed ? "text-text-muted line-through" : "text-white"
                    }`}>
                      {item.description}
                    </div>
                    {item.riders?.length > 0 && !item.completed && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.riders.map(rider => (
                          <button
                            key={rider}
                            onClick={(e) => {
                              e.stopPropagation();
                              openRiderDayView(rider);
                            }}
                            className="inline-block text-[10px] px-1.5 py-0.5 rounded-md font-medium hover:opacity-80 active:scale-95 transition-all"
                            style={{
                              backgroundColor: `${getRiderColor(rider)}20`,
                              color: getRiderColor(rider),
                            }}
                          >
                            {rider}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions - subtle until interacted, always visible if pinned */}
                  <div className={`flex items-center gap-1 transition-opacity ${(item.completed || item.pinned) ? "" : "opacity-40 hover:opacity-100"}`}>
                    <button
                      onClick={() => togglePin("todo", item.id)}
                      className={`p-1.5 rounded-lg transition ${
                        item.pinned
                          ? "text-brand-orange bg-[rgba(233,78,27,0.15)]"
                          : "text-text-muted active:bg-[rgba(255,255,255,0.06)]"
                      }`}
                    >
                      <Pin size={14} />
                    </button>
                    <button
                      onClick={() => deleteItem("todo", item.id)}
                      className="p-1.5 rounded-lg text-text-muted active:bg-[rgba(255,255,255,0.06)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote size={14} className="text-text-muted" />
            <div className="text-text-muted text-xs font-semibold tracking-wider">NOTES</div>
            <button
              onClick={() => setNoteAddOpen(true)}
              className="p-1 rounded-md text-text-muted hover:text-brand-orange active:bg-[rgba(255,255,255,0.06)] transition"
            >
              <Plus size={14} />
            </button>
          </div>

          {noteItems.length === 0 ? (
            <div className="text-text-muted text-sm py-4 text-center">No notes</div>
          ) : (
            <div className="space-y-2">
              {noteItems.map(item => (
                <div
                  key={item.id}
                  className="bg-app-surface rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-text-secondary text-sm">{item.text}</div>
                  </div>
                  <button
                    onClick={() => deleteItem("note", item.id)}
                    className="p-1.5 rounded-lg text-text-muted opacity-40 hover:opacity-100 active:bg-[rgba(255,255,255,0.06)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <Drawer.Root
        open={importModalOpen}
        onOpenChange={(open) => {
          if (!open) cancelImport();
          else setImportModalOpen(true);
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Drawer.Content
            className="flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-chrome-strong"
            style={{ background: "var(--bg-surface)", maxHeight: "90dvh" }}
            aria-describedby={undefined}
          >
            <Drawer.Title className="sr-only">Import Plan</Drawer.Title>

            {/* Fixed Header */}
            <div className="flex-shrink-0 px-4 pt-4">
              {/* Drag handle */}
              <div className="mx-auto w-12 h-1.5 rounded-full mb-4 bg-text-muted" />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  {importPreview
                    ? `Found ${importPreview.scheduleItems.length + importPreview.todoItems.length + (importPreview.noteItems || []).length} items`
                    : "Import Plan"
                  }
                </h2>
                <button
                  onClick={cancelImport}
                  className="p-2 rounded-full bg-app-elevated text-text-muted"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto px-4 overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {!importPreview ? (
                // Input state
                <>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste schedule, WhatsApp message, notes, todos... anything"
                    rows={8}
                    className="w-full px-4 py-3 rounded-xl bg-app-elevated border border-chrome-strong text-white placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(233,78,27,0.25)] mb-2"
                    style={{ fontSize: "16px" }}
                  />

                  <p className="text-text-muted text-xs mb-4">
                    GPT-4o will extract times, events, and tasks automatically
                  </p>
                </>
              ) : (
                // Preview state
                <>
                  {/* Schedule Items */}
                  {importPreview.scheduleItems.length > 0 && (
                    <div className="mb-4">
                      <div className="text-brand-orange text-xs font-semibold tracking-wider mb-2">
                        SCHEDULE
                      </div>
                      <div className="space-y-2">
                        {importPreview.scheduleItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => togglePreviewItem("schedule", item.id)}
                            className="w-full bg-app-elevated rounded-xl px-4 py-3 flex items-center gap-3 text-left"
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                              item.selected
                                ? "bg-brand-orange border-brand-orange"
                                : "border-text-muted"
                            }`}>
                              {item.selected && <Check size={12} className="text-white" />}
                            </div>
                            <div className="text-text-muted font-mono text-sm w-12 flex-shrink-0">
                              {item.time ? formatTime(item.time) : "--:--"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm truncate">{item.description}</div>
                              {item.riders?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {item.riders.map(rider => (
                                    <span key={rider} className="text-xs" style={{ color: getRiderColor(rider) }}>
                                      {rider}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Todo Items */}
                  {importPreview.todoItems.length > 0 && (
                    <div className="mb-4">
                      <div className="text-brand-orange text-xs font-semibold tracking-wider mb-2">
                        TODOS
                      </div>
                      <div className="space-y-2">
                        {importPreview.todoItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => togglePreviewItem("todo", item.id)}
                            className="w-full bg-app-elevated rounded-xl px-4 py-3 flex items-center gap-3 text-left"
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                              item.selected
                                ? "bg-brand-orange border-brand-orange"
                                : "border-text-muted"
                            }`}>
                              {item.selected && <Check size={12} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm truncate">{item.description}</div>
                              {item.riders?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {item.riders.map(rider => (
                                    <span key={rider} className="text-xs" style={{ color: getRiderColor(rider) }}>
                                      {rider}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Note Items */}
                  {(importPreview.noteItems || []).length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <StickyNote size={12} className="text-brand-orange" />
                        <div className="text-brand-orange text-xs font-semibold tracking-wider">
                          NOTES
                        </div>
                      </div>
                      <div className="space-y-2">
                        {importPreview.noteItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => togglePreviewItem("note", item.id)}
                            className="w-full bg-app-elevated rounded-xl px-4 py-3 flex items-center gap-3 text-left"
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                              item.selected
                                ? "bg-brand-orange border-brand-orange"
                                : "border-text-muted"
                            }`}>
                              {item.selected && <Check size={12} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-text-secondary text-sm">{item.text}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {importPreview.scheduleItems.length === 0 && importPreview.todoItems.length === 0 && (importPreview.noteItems || []).length === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-text-muted">No items found in the text</p>
                      <button
                        onClick={() => setImportPreview(null)}
                        className="text-brand-orange text-sm font-semibold mt-2"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2">
              {!importPreview ? (
                <button
                  onClick={processImport}
                  disabled={!importText.trim() || importProcessing}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-brand-orange shadow-[0_8px_20px_rgba(233,78,27,0.35)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      AI parsing...
                    </>
                  ) : (
                    "Process with AI"
                  )}
                </button>
              ) : (
                (importPreview.scheduleItems.length > 0 || importPreview.todoItems.length > 0 || (importPreview.noteItems || []).length > 0) && (
                  <div className="flex gap-3">
                    <button
                      onClick={cancelImport}
                      className="flex-1 py-3 rounded-xl font-semibold text-text-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmImport}
                      className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-orange shadow-[0_8px_20px_rgba(233,78,27,0.35)]"
                    >
                      Add Selected
                    </button>
                  </div>
                )
              )}

              {/* Bottom safe area padding */}
              <div className="h-[env(safe-area-inset-bottom)]" />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Location Picker Modal - Top positioned for mobile keyboard */}
      <AnimatePresence>
        {locationModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setLocationModalOpen(false);
                setLocationSearch("");
                setLocationResult(null);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            {/* Modal - positioned at top */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed z-50 left-4 right-4 top-[10vh] max-h-[70vh] overflow-y-auto rounded-2xl border border-chrome-strong"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapPin size={20} className="text-brand-orange" />
                    Set Location
                  </h2>
                  <button
                    onClick={() => {
                      setLocationModalOpen(false);
                      setLocationSearch("");
                      setLocationResult(null);
                    }}
                    className="p-2 rounded-full bg-app-elevated text-text-muted"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Search Input - optimized for mobile */}
                <div className="flex gap-2 mb-4">
                  <input
                    ref={locationInputRef}
                    type="text"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchLocation(locationSearch)}
                    placeholder="e.g. Malaga, Val di Sole, Nove Mesto"
                    className="flex-1 px-4 py-3 rounded-xl bg-app-elevated border border-chrome-strong text-white text-base placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[rgba(233,78,27,0.25)]"
                    style={{ fontSize: "16px" }} // Prevents iOS zoom
                  />
                  <button
                    onClick={() => searchLocation(locationSearch)}
                    disabled={!locationSearch.trim() || locationSearching}
                    className="px-4 py-3 rounded-xl bg-brand-orange text-white font-semibold disabled:opacity-50 flex items-center gap-2"
                  >
                    {locationSearching ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Search size={18} />
                    )}
                  </button>
                </div>

                {/* Search Result */}
                {locationResult && (
                  <div className="mb-4">
                    {locationResult.error ? (
                      <div className="px-4 py-3 rounded-xl bg-[#2a2020] border border-[#4a3030] text-status-destructive text-sm">
                        {locationResult.error}
                      </div>
                    ) : (
                      <div className="px-4 py-3 rounded-xl bg-[#1a2a1a] border border-[#2a4a2a]">
                        <div className="text-white font-medium mb-1">{locationResult.name}</div>
                        <div className="text-text-muted text-xs">
                          {locationResult.lat.toFixed(2)}°, {locationResult.lon.toFixed(2)}°
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Current Location */}
                {location && (
                  <div className="mb-4 px-4 py-3 rounded-xl bg-app-elevated border border-chrome-strong">
                    <div className="text-text-muted text-xs mb-1">Current location</div>
                    <div className="text-white">{location.name}</div>
                  </div>
                )}

                {/* Confirm Button */}
                <button
                  onClick={confirmLocation}
                  disabled={!locationResult || locationResult.error}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-brand-orange shadow-[0_8px_20px_rgba(233,78,27,0.35)] transition-all disabled:opacity-50"
                >
                  Confirm Location
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Modal */}
      <Drawer.Root open={clearModalOpen} onOpenChange={setClearModalOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Drawer.Content
            className="flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-chrome-strong"
            style={{ background: "var(--bg-surface)" }}
            aria-describedby={undefined}
          >
            <Drawer.Title className="sr-only">Clear All Items</Drawer.Title>
            <div className="p-4">
              {/* Drag handle */}
              <div className="mx-auto w-12 h-1.5 rounded-full mb-4 bg-text-muted" />

              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#2a2020] flex items-center justify-center mb-4">
                  <AlertTriangle size={32} className="text-status-destructive" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Clear all items for today?</h2>
                <p className="text-text-muted text-sm">
                  This will remove all {scheduleItems.length} schedule items, {todoItems.length} todos, and {noteItems.length} notes for {dayLabel}.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setClearModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-semibold text-white bg-app-elevated"
                >
                  Cancel
                </button>
                <button
                  onClick={clearAllItems}
                  className="flex-1 py-4 rounded-2xl font-bold text-white bg-[#ff4444] shadow-[0_8px_20px_rgba(255,68,68,0.35)]"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Bottom safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Schedule Quick Add Modal */}
      <AnimatePresence>
        {scheduleAddOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setScheduleAddOpen(false);
                setNewScheduleTime("");
                setNewScheduleEvent("");
                setNewScheduleRider("");
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed z-50 left-4 right-4 top-[10vh] rounded-2xl border border-chrome-strong"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Add Schedule Item</h2>
                  <button
                    onClick={() => {
                      setScheduleAddOpen(false);
                      setNewScheduleTime("");
                      setNewScheduleEvent("");
                      setNewScheduleRider("");
                    }}
                    className="p-2 rounded-full bg-app-elevated text-text-muted"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Time Input - 24h format */}
                <div className="mb-3">
                  <label className="text-text-muted text-xs font-semibold tracking-wider mb-1 block">TIME (24H)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newScheduleTime}
                    onChange={(e) => {
                      // Allow digits and colon, auto-format
                      let val = e.target.value.replace(/[^\d:]/g, "");
                      // Auto-insert colon after 2 digits if not present
                      if (val.length === 2 && !val.includes(":") && newScheduleTime.length < val.length) {
                        val = val + ":";
                      }
                      // Limit to HH:MM format
                      if (val.length <= 5) {
                        setNewScheduleTime(val);
                      }
                    }}
                    placeholder="14:30"
                    maxLength={5}
                    className="w-full px-4 py-3 rounded-xl bg-app-elevated border border-chrome-strong text-white text-base placeholder:text-text-muted focus:outline-none focus:border-brand-orange font-mono"
                    style={{ fontSize: "16px" }}
                  />
                </div>

                {/* Event Input */}
                <div className="mb-3">
                  <label className="text-text-muted text-xs font-semibold tracking-wider mb-1 block">EVENT</label>
                  <input
                    type="text"
                    value={newScheduleEvent}
                    onChange={(e) => setNewScheduleEvent(e.target.value)}
                    placeholder="e.g. Practice run, Bike check"
                    className="w-full px-4 py-3 rounded-xl bg-app-elevated border border-chrome-strong text-white text-base placeholder:text-text-muted focus:outline-none focus:border-brand-orange"
                    style={{ fontSize: "16px" }}
                  />
                </div>

                {/* Rider Dropdown */}
                <div className="mb-4">
                  <label className="text-text-muted text-xs font-semibold tracking-wider mb-1 block">RIDER (optional)</label>
                  <select
                    value={newScheduleRider}
                    onChange={(e) => setNewScheduleRider(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-app-elevated border border-chrome-strong text-white text-base focus:outline-none focus:border-brand-orange appearance-none"
                    style={{ fontSize: "16px" }}
                  >
                    <option value="">None</option>
                    {RIDER_NAMES.map(rider => (
                      <option key={rider} value={rider}>{rider}</option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setScheduleAddOpen(false);
                      setNewScheduleTime("");
                      setNewScheduleEvent("");
                      setNewScheduleRider("");
                    }}
                    className="flex-1 py-3 rounded-xl font-semibold text-text-muted bg-app-elevated"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addScheduleItem}
                    disabled={!newScheduleTime || !newScheduleEvent.trim()}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-orange disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Todo Quick Add Modal */}
      <AnimatePresence>
        {todoAddOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setTodoAddOpen(false);
                setNewTodoTask("");
                setNewTodoRider("");
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed z-50 left-4 right-4 top-[10vh] rounded-2xl border border-chrome-strong"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Add Todo</h2>
                  <button
                    onClick={() => {
                      setTodoAddOpen(false);
                      setNewTodoTask("");
                      setNewTodoRider("");
                    }}
                    className="p-2 rounded-full bg-app-elevated text-text-muted"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Task Input */}
                <div className="mb-3">
                  <label className="text-text-muted text-xs font-semibold tracking-wider mb-1 block">TASK</label>
                  <input
                    type="text"
                    value={newTodoTask}
                    onChange={(e) => setNewTodoTask(e.target.value)}
                    placeholder="e.g. Check brakes, Swap tyres"
                    className="w-full px-4 py-3 rounded-xl bg-app-elevated border border-chrome-strong text-white text-base placeholder:text-text-muted focus:outline-none focus:border-brand-orange"
                    style={{ fontSize: "16px" }}
                  />
                </div>

                {/* Rider Dropdown */}
                <div className="mb-4">
                  <label className="text-text-muted text-xs font-semibold tracking-wider mb-1 block">RIDER (optional)</label>
                  <select
                    value={newTodoRider}
                    onChange={(e) => setNewTodoRider(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-app-elevated border border-chrome-strong text-white text-base focus:outline-none focus:border-brand-orange appearance-none"
                    style={{ fontSize: "16px" }}
                  >
                    <option value="">None</option>
                    {RIDER_NAMES.map(rider => (
                      <option key={rider} value={rider}>{rider}</option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setTodoAddOpen(false);
                      setNewTodoTask("");
                      setNewTodoRider("");
                    }}
                    className="flex-1 py-3 rounded-xl font-semibold text-text-muted bg-app-elevated"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addTodoItem}
                    disabled={!newTodoTask.trim()}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-orange disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Note Quick Add Modal */}
      <AnimatePresence>
        {noteAddOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setNoteAddOpen(false);
                setNewNoteText("");
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed z-50 left-4 right-4 top-[10vh] rounded-2xl border border-chrome-strong"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Add Note</h2>
                  <button
                    onClick={() => {
                      setNoteAddOpen(false);
                      setNewNoteText("");
                    }}
                    className="p-2 rounded-full bg-app-elevated text-text-muted"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Note Input */}
                <div className="mb-4">
                  <label className="text-text-muted text-xs font-semibold tracking-wider mb-1 block">NOTE</label>
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="e.g. Radios channel 16"
                    className="w-full px-4 py-3 rounded-xl bg-app-elevated border border-chrome-strong text-white text-base placeholder:text-text-muted focus:outline-none focus:border-brand-orange"
                    style={{ fontSize: "16px" }}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setNoteAddOpen(false);
                      setNewNoteText("");
                    }}
                    className="flex-1 py-3 rounded-xl font-semibold text-text-muted bg-app-elevated"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addNoteItem}
                    disabled={!newNoteText.trim()}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-orange disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Rider Day View Modal */}
      <AnimatePresence>
        {riderDayModalOpen && selectedRider && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRiderDayModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 left-4 right-4 top-[5vh] bottom-[5vh] rounded-2xl border border-chrome-strong overflow-hidden flex flex-col"
              style={{ background: "var(--bg-surface)" }}
            >
              {/* Header */}
              <div className="p-4 border-b border-chrome-strong flex items-center gap-3">
                {/* Rider Photo */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-app-elevated flex-shrink-0">
                  <img
                    src={RIDER_PHOTOS[selectedRider]}
                    alt={selectedRider}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8A9A94" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg></div>`;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white">{selectedRider}</h2>
                  <div className="text-text-muted text-sm">
                    {selectedDate.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
                <button
                  onClick={() => setRiderDayModalOpen(false)}
                  className="p-2 rounded-full bg-app-elevated text-text-muted"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Schedule Section */}
                {riderSchedule.length > 0 && (
                  <div className="mb-6">
                    <div className="text-brand-orange text-xs font-semibold tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-orange" />
                      SCHEDULE
                    </div>
                    <div className="space-y-2">
                      {riderSchedule.map(item => {
                        // Get weather for this hour (same as main dashboard)
                        const hourWeather = weather?.hourly ? getWeatherForHour(weather.hourly, item.time) : null;
                        const WeatherIcon = hourWeather ? WEATHER_ICONS[hourWeather.condition] : null;
                        const hasHighRain = hourWeather?.rainProb > 50;

                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
                              hasHighRain ? "bg-[#1a2a3a]" : "bg-app-elevated"
                            }`}
                          >
                            <div className="text-text-muted font-mono text-sm w-12 flex-shrink-0">
                              {item.time ? formatTime(item.time) : "--:--"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm truncate">{item.description}</div>
                            </div>
                            {hourWeather && (
                              <div className="flex items-center gap-1.5">
                                {WeatherIcon && (
                                  <WeatherIcon
                                    size={14}
                                    className={hasHighRain ? "text-[#6ba3d6]" : "text-text-muted"}
                                  />
                                )}
                                <span className="text-white text-sm font-medium">{hourWeather.temp}°</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Todos Section */}
                {riderTodos.length > 0 && (
                  <div className="mb-6">
                    <div className="text-brand-orange text-xs font-semibold tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-orange" />
                      TODOS
                    </div>
                    <div className="space-y-2">
                      {riderTodos.map(item => (
                        <div
                          key={item.id}
                          className="bg-app-elevated rounded-xl px-4 py-3 flex items-center gap-3"
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                            item.completed
                              ? "bg-brand-orange border-brand-orange"
                              : "border-text-muted"
                          }`}>
                            {item.completed && <Check size={12} className="text-white" />}
                          </div>
                          <div className={`flex-1 text-sm ${
                            item.completed ? "text-text-muted line-through" : "text-white"
                          }`}>
                            {item.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {riderSchedule.length === 0 && riderTodos.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-app-elevated flex items-center justify-center mx-auto mb-4">
                      <User size={32} className="text-text-muted" />
                    </div>
                    <div className="text-text-muted">No items for {selectedRider} today</div>
                  </div>
                )}
              </div>

              {/* Footer - Share Button */}
              <div className="p-4 border-t border-chrome-strong">
                <button
                  onClick={() => shareRiderDay(selectedRider)}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-[#25D366] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Share2 size={18} />
                  Share via WhatsApp
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
