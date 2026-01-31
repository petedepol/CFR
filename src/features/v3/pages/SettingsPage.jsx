// SettingsPage.jsx - App settings, data export, and digest configuration
// Dark theme matching CFR Kit colors

import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ArrowLeft, Wifi, WifiOff, LogOut, Download, Send, Trash2, ChevronDown, Check } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { supabase } from "../../../lib/supabaseClient.js";
import { SpecSection } from "../components/SpecSection.jsx";
import { fetchDigestSettings, updateDigestSettings } from "../../settings/api/digestApi.js";
import { exportData, generateDigestSummary, generatePDF } from "../../settings/utils/exportUtils.js";
import { LogoutConfirmDialog, ClearCacheConfirmDialog } from "../../../components/ui/ConfirmDialog.jsx";

// Riders list
const RIDERS = ["Ana", "Charlie", "Cole", "Luca", "Jolanda"];

// Bike types
const BIKE_TYPES = ["Race", "Training", "Road", "Ebike", "CX"];

// Data types for export
const DATA_TYPES = [
  { id: "jig", label: "Jig" },
  { id: "specs", label: "Specs" },
  { id: "setup", label: "Setup" },
  { id: "service", label: "Service" },
  { id: "dashboard", label: "Dashboard" },
];

// Days of week
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Days of month (1-31)
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

// Time options (every hour)
const TIMES = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return `${h}:00`;
});

// Supabase URL for Edge Function calls
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://dmacykhkrzxsqiaurdec.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Date range presets
const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "7days", label: "Last 7 Days" },
  { id: "month", label: "This Month" },
  { id: "30days", label: "Last 30 Days" },
  { id: "season", label: "This Season" },
  { id: "custom", label: "Custom Range" },
];

// Calculate date range from preset
function getDateRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { start: today.toISOString(), end: null };
    case "week": {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { start: startOfWeek.toISOString(), end: null };
    }
    case "7days": {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return { start: sevenDaysAgo.toISOString(), end: null };
    }
    case "month": {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: startOfMonth.toISOString(), end: null };
    }
    case "30days": {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return { start: thirtyDaysAgo.toISOString(), end: null };
    }
    case "season": {
      // Assume season starts Jan 1
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return { start: startOfYear.toISOString(), end: null };
    }
    default:
      return { start: null, end: null };
  }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { displayName, email, isAdmin, role } = useAuth();
  const toast = useToast();
  const context = useOutletContext();
  // eslint-disable-next-line no-unused-vars
  const isDark = context?.isDark ?? true; // Available for future light theme support

  // Offline state
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  // Export state
  const [exportDataTypes, setExportDataTypes] = useState(["jig", "specs", "setup", "service"]);
  const [exportRider, setExportRider] = useState("all");
  const [exportBikeType, setExportBikeType] = useState("all");
  const [exportDatePreset, setExportDatePreset] = useState("30days");
  const [exportCustomStart, setExportCustomStart] = useState("");
  const [exportCustomEnd, setExportCustomEnd] = useState("");
  const [exportFormat, setExportFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);

  // Digest state
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestFrequency, setDigestFrequency] = useState("weekly");
  const [digestDay, setDigestDay] = useState("Sunday");
  const [digestDayOfMonth, setDigestDayOfMonth] = useState(1);
  const [digestTime, setDigestTime] = useState("20:00");
  const [coachEmails, setCoachEmails] = useState("");
  const [mechanicEmails, setMechanicEmails] = useState("");
  const [riderEmails, setRiderEmails] = useState("");
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestSaving, setDigestSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Dropdown open states
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);
  const [bikeDropdownOpen, setBikeDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const [dayOfMonthDropdownOpen, setDayOfMonthDropdownOpen] = useState(false);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  // Confirmation dialog states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);

  // Load digest settings
  useEffect(() => {
    loadDigestSettings();
  }, []);

  async function loadDigestSettings() {
    setDigestLoading(true);
    try {
      const data = await fetchDigestSettings();
      setDigestEnabled(data.enabled || false);
      setDigestFrequency(data.frequency || "weekly");
      setDigestDay(data.day || "Sunday");
      setDigestDayOfMonth(data.day_of_month || 1);
      setDigestTime(data.time || "20:00");
      setCoachEmails((data.coach_emails || []).join(", "));
      setMechanicEmails((data.mechanic_emails || []).join(", "));
      setRiderEmails((data.rider_emails || []).join(", "));
    } catch {
      // Use defaults
    } finally {
      setDigestLoading(false);
    }
  }

  // Save digest settings
  async function saveDigestSettings() {
    setDigestSaving(true);
    try {
      await updateDigestSettings({
        enabled: digestEnabled,
        frequency: digestFrequency,
        day: digestDay,
        dayOfMonth: digestDayOfMonth,
        time: digestTime,
        coachEmails: coachEmails.split(",").map((e) => e.trim()).filter(Boolean),
        mechanicEmails: mechanicEmails.split(",").map((e) => e.trim()).filter(Boolean),
        riderEmails: riderEmails.split(",").map((e) => e.trim()).filter(Boolean),
        updatedBy: email,
      });
      toast.success("Digest settings saved");
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setDigestSaving(false);
    }
  }

  // Auto-save digest settings on change (debounced)
  useEffect(() => {
    if (digestLoading) return;
    const timer = setTimeout(() => {
      saveDigestSettings();
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digestEnabled, digestFrequency, digestDay, digestDayOfMonth, digestTime, coachEmails, mechanicEmails, riderEmails]);

  // Handle export
  async function handleExport() {
    if (exportDataTypes.length === 0) {
      toast.error("Select at least one data type");
      return;
    }

    setExporting(true);
    try {
      const dateRange = exportDatePreset === "custom"
        ? { start: exportCustomStart || null, end: exportCustomEnd || null }
        : getDateRange(exportDatePreset);

      await exportData({
        dataTypes: exportDataTypes,
        rider: exportRider,
        bikeType: exportBikeType.toLowerCase(),
        startDate: dateRange.start,
        endDate: dateRange.end,
        format: exportFormat,
      });

      toast.success(`Export downloaded as ${exportFormat.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  // Handle Share Now
  async function handleShareNow() {
    setSharing(true);
    try {
      const days = digestFrequency === "monthly" ? 30 : 7;
      const { summary, results } = await generateDigestSummary(days);
      const doc = await generatePDF(results, { dateRange: summary.period });

      // Generate blob for sharing
      const digestLabel = digestFrequency === "monthly" ? "monthly" : "weekly";
      const blob = doc.output("blob");
      const file = new File([blob], `cfr-${digestLabel}-digest-${new Date().toISOString().split("T")[0]}.pdf`, {
        type: "application/pdf",
      });

      // Try native share if available
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `CFR ${digestFrequency === "monthly" ? "Monthly" : "Weekly"} Digest`,
          text: `${digestFrequency === "monthly" ? "Monthly" : "Weekly"} summary: ${summary.jigCount} JIG, ${summary.setupCount} Setup (${summary.raceSetups} race), ${summary.serviceCount} Service`,
          files: [file],
        });
        toast.success("Shared successfully");
      } else {
        // Fallback to download
        doc.save(`cfr-${digestLabel}-digest-${new Date().toISOString().split("T")[0]}.pdf`);
        toast.success("Digest downloaded");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        toast.error(err.message || "Share failed");
      }
    } finally {
      setSharing(false);
    }
  }

  // Handle Send Test Email
  async function handleSendTestEmail() {
    setSendingTest(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/send-weekly-digest`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ force: true }),
        }
      );
      const result = await response.json();
      if (result.success) {
        toast.success(`Test email sent to ${result.sent} recipient${result.sent === 1 ? "" : "s"}`);
      } else if (result.skipped) {
        toast.error(result.reason || "Digest skipped");
      } else {
        toast.error(result.error || "Failed to send test email");
      }
    } catch (err) {
      toast.error(err.message || "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  }

  // Handle logout
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      toast.error(err.message || "Logout failed");
    }
  }

  // Handle clear cache
  function handleClearCache() {
    try {
      // Clear localStorage items with our prefixes
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("cfr_") || key?.startsWith("cached_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      toast.success(`Cleared ${keysToRemove.length} cached items`);
    } catch {
      toast.error("Failed to clear cache");
    }
  }

  // Toggle data type selection
  function toggleDataType(id) {
    setExportDataTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  // Colors
  const colors = {
    pageBg: "#121212",
    cardBg: "#1e1e1e",
    cardBorder: "#2a2a2a",
    inputBg: "#252525",
    primary: "#ff6b2c",
    text: "#ffffff",
    textMuted: "#888888",
    textDim: "#666666",
    success: "#4ade80",
    warning: "#f59e0b",
  };

  return (
    <div
      className="min-h-dvh pb-32"
      style={{ backgroundColor: colors.pageBg }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-sm border-b border-[#2a2a2a] bg-[rgba(18,18,18,0.85)] pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/v3")}
            className="p-2 -ml-2 rounded-xl text-white active:bg-[rgba(255,255,255,0.05)]"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-semibold text-white tracking-wide">Settings</h1>
          <div className="flex items-center gap-2">
            {offline ? (
              <WifiOff size={16} className="text-amber-500" />
            ) : (
              <Wifi size={16} className="text-green-500" />
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Account Section */}
        <div
          className="rounded-[26px] p-5 backdrop-blur-sm border ring-1 ring-[rgba(255,255,255,0.05)]"
          style={{
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
            borderLeft: `3px solid ${colors.primary}`,
          }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: colors.primary, color: "#fff" }}
            >
              {(displayName || email || "U")[0].toUpperCase()}
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">{displayName || "User"}</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
                  style={{
                    backgroundColor: isAdmin ? colors.primary : colors.inputBg,
                    color: isAdmin ? "#fff" : colors.textMuted,
                  }}
                >
                  {role || "Mechanic"}
                </span>
              </div>
              <div className="text-sm truncate" style={{ color: colors.textMuted }}>
                {email}
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="mt-4 w-full py-2.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition"
            style={{ borderColor: colors.primary, color: "#fff" }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* Data Export Section - Admin Only */}
        {isAdmin && (
        <SpecSection title="DATA EXPORT" defaultOpen={false} theme="dark">
          <div className="space-y-4">
            {/* Data Type Pills */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                Data Type
              </label>
              <div className="flex flex-wrap gap-2">
                {DATA_TYPES.map((dt) => {
                  const active = exportDataTypes.includes(dt.id);
                  return (
                    <button
                      key={dt.id}
                      onClick={() => toggleDataType(dt.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      style={{
                        backgroundColor: active ? colors.primary : colors.inputBg,
                        color: active ? "#fff" : colors.textMuted,
                      }}
                    >
                      {dt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rider Dropdown */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                Rider
              </label>
              <button
                onClick={() => setRiderDropdownOpen(!riderDropdownOpen)}
                className="w-full px-4 py-3 rounded-xl flex items-center justify-between text-sm"
                style={{ backgroundColor: colors.inputBg, color: "#fff" }}
              >
                <span>{exportRider === "all" ? "All Riders" : exportRider}</span>
                <ChevronDown size={16} className={`transition ${riderDropdownOpen ? "rotate-180" : ""}`} style={{ color: colors.textDim }} />
              </button>
              {riderDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 border" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                  <button
                    onClick={() => { setExportRider("all"); setRiderDropdownOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-[rgba(255,255,255,0.05)]"
                    style={{ color: exportRider === "all" ? colors.primary : "#fff" }}
                  >
                    All Riders
                  </button>
                  {RIDERS.map((r) => (
                    <button
                      key={r}
                      onClick={() => { setExportRider(r); setRiderDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-[rgba(255,255,255,0.05)]"
                      style={{ color: exportRider === r ? colors.primary : "#fff" }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bike Type Dropdown */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                Bike Type
              </label>
              <button
                onClick={() => setBikeDropdownOpen(!bikeDropdownOpen)}
                className="w-full px-4 py-3 rounded-xl flex items-center justify-between text-sm"
                style={{ backgroundColor: colors.inputBg, color: "#fff" }}
              >
                <span>{exportBikeType === "all" ? "All Bikes" : exportBikeType}</span>
                <ChevronDown size={16} className={`transition ${bikeDropdownOpen ? "rotate-180" : ""}`} style={{ color: colors.textDim }} />
              </button>
              {bikeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 border" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                  <button
                    onClick={() => { setExportBikeType("all"); setBikeDropdownOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-[rgba(255,255,255,0.05)]"
                    style={{ color: exportBikeType === "all" ? colors.primary : "#fff" }}
                  >
                    All Bikes
                  </button>
                  {BIKE_TYPES.map((b) => (
                    <button
                      key={b}
                      onClick={() => { setExportBikeType(b); setBikeDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-[rgba(255,255,255,0.05)]"
                      style={{ color: exportBikeType === b ? colors.primary : "#fff" }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range Dropdown */}
            <div className="relative">
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                Time Range
              </label>
              <button
                onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                className="w-full px-4 py-3 rounded-xl flex items-center justify-between text-sm"
                style={{ backgroundColor: colors.inputBg, color: "#fff" }}
              >
                <span>{DATE_PRESETS.find((p) => p.id === exportDatePreset)?.label || "Select"}</span>
                <ChevronDown size={16} className={`transition ${dateDropdownOpen ? "rotate-180" : ""}`} style={{ color: colors.textDim }} />
              </button>
              {dateDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 border" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                  {DATE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setExportDatePreset(p.id); setDateDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-[rgba(255,255,255,0.05)]"
                      style={{ color: exportDatePreset === p.id ? colors.primary : "#fff" }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Date Inputs */}
            {exportDatePreset === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={exportCustomStart}
                    onChange={(e) => setExportCustomStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{ backgroundColor: colors.inputBg, color: "#fff", border: "none" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={exportCustomEnd}
                    onChange={(e) => setExportCustomEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{ backgroundColor: colors.inputBg, color: "#fff", border: "none" }}
                  />
                </div>
              </div>
            )}

            {/* Format Toggle */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setExportFormat("csv")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{
                    backgroundColor: exportFormat === "csv" ? colors.primary : colors.inputBg,
                    color: exportFormat === "csv" ? "#fff" : colors.textMuted,
                  }}
                >
                  CSV
                </button>
                <button
                  onClick={() => setExportFormat("pdf")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                  style={{
                    backgroundColor: exportFormat === "pdf" ? colors.primary : colors.inputBg,
                    color: exportFormat === "pdf" ? "#fff" : colors.textMuted,
                  }}
                >
                  PDF
                </button>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={exporting || offline || exportDataTypes.length === 0}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.primary, color: "#fff" }}
            >
              <Download size={16} />
              {exporting ? "Exporting..." : "Export Data"}
            </button>
          </div>
        </SpecSection>
        )}

        {/* Digest Section - Admin Only */}
        {isAdmin && (
        <SpecSection title="DIGEST" defaultOpen={false} theme="dark">
          {digestLoading ? (
            <div className="h-32 rounded-xl animate-pulse" style={{ backgroundColor: colors.inputBg }} />
          ) : (
            <div className="space-y-4">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Automated Share</span>
                <button
                  onClick={() => setDigestEnabled(!digestEnabled)}
                  className="w-12 h-7 rounded-full p-1 transition"
                  style={{ backgroundColor: digestEnabled ? colors.primary : colors.inputBg }}
                >
                  <div
                    className="w-5 h-5 rounded-full bg-white transition-transform"
                    style={{ transform: digestEnabled ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>

              {/* Frequency Toggle */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                  Frequency
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDigestFrequency("weekly")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                    style={{
                      backgroundColor: digestFrequency === "weekly" ? colors.primary : colors.inputBg,
                      color: digestFrequency === "weekly" ? "#fff" : colors.textMuted,
                    }}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setDigestFrequency("monthly")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                    style={{
                      backgroundColor: digestFrequency === "monthly" ? colors.primary : colors.inputBg,
                      color: digestFrequency === "monthly" ? "#fff" : colors.textMuted,
                    }}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                {/* Day Dropdown - Weekly: Day of week, Monthly: Day of month */}
                {digestFrequency === "weekly" ? (
                  <div className="relative">
                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                      Day
                    </label>
                    <button
                      onClick={() => setDayDropdownOpen(!dayDropdownOpen)}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm"
                      style={{ backgroundColor: colors.inputBg, color: "#fff" }}
                    >
                      <span>{digestDay}</span>
                      <ChevronDown size={14} className={`transition ${dayDropdownOpen ? "rotate-180" : ""}`} style={{ color: colors.textDim }} />
                    </button>
                    {dayDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 border max-h-48 overflow-y-auto" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                        {DAYS.map((d) => (
                          <button
                            key={d}
                            onClick={() => { setDigestDay(d); setDayDropdownOpen(false); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(255,255,255,0.05)]"
                            style={{ color: digestDay === d ? colors.primary : "#fff" }}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                      Day of Month
                    </label>
                    <button
                      onClick={() => setDayOfMonthDropdownOpen(!dayOfMonthDropdownOpen)}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm"
                      style={{ backgroundColor: colors.inputBg, color: "#fff" }}
                    >
                      <span>{digestDayOfMonth}{digestDayOfMonth === 1 ? "st" : digestDayOfMonth === 2 ? "nd" : digestDayOfMonth === 3 ? "rd" : "th"}</span>
                      <ChevronDown size={14} className={`transition ${dayOfMonthDropdownOpen ? "rotate-180" : ""}`} style={{ color: colors.textDim }} />
                    </button>
                    {dayOfMonthDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 border max-h-48 overflow-y-auto" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                        {DAYS_OF_MONTH.map((d) => (
                          <button
                            key={d}
                            onClick={() => { setDigestDayOfMonth(d); setDayOfMonthDropdownOpen(false); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(255,255,255,0.05)]"
                            style={{ color: digestDayOfMonth === d ? colors.primary : "#fff" }}
                          >
                            {d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Time Dropdown */}
                <div className="relative">
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.textMuted }}>
                    Time
                  </label>
                  <button
                    onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                    className="w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-sm"
                    style={{ backgroundColor: colors.inputBg, color: "#fff" }}
                  >
                    <span>{digestTime}</span>
                    <ChevronDown size={14} className={`transition ${timeDropdownOpen ? "rotate-180" : ""}`} style={{ color: colors.textDim }} />
                  </button>
                  {timeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 border max-h-48 overflow-y-auto" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                      {TIMES.map((t) => (
                        <button
                          key={t}
                          onClick={() => { setDigestTime(t); setTimeDropdownOpen(false); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[rgba(255,255,255,0.05)]"
                          style={{ color: digestTime === t ? colors.primary : "#fff" }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Groups */}
              <div className="space-y-3">
                {/* Coaches */}
                <div className="p-3 rounded-xl" style={{ backgroundColor: colors.inputBg }}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.primary }}>
                    Coaches
                  </label>
                  <input
                    type="text"
                    value={coachEmails}
                    onChange={(e) => setCoachEmails(e.target.value)}
                    placeholder="email1@team.com, email2@team.com"
                    className="w-full bg-transparent text-sm text-white placeholder-[#666] outline-none"
                  />
                  <div className="text-[10px] mt-2" style={{ color: colors.textDim }}>
                    Receives: Jig changes, Race setup (full)
                  </div>
                </div>

                {/* Mechanics */}
                <div className="p-3 rounded-xl" style={{ backgroundColor: colors.inputBg }}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.primary }}>
                    Mechanics
                  </label>
                  <input
                    type="text"
                    value={mechanicEmails}
                    onChange={(e) => setMechanicEmails(e.target.value)}
                    placeholder="email1@team.com, email2@team.com"
                    className="w-full bg-transparent text-sm text-white placeholder-[#666] outline-none"
                  />
                  <div className="text-[10px] mt-2" style={{ color: colors.textDim }}>
                    Receives: Jig changes, Settings changes, Service summary
                  </div>
                </div>

                {/* Riders */}
                <div className="p-3 rounded-xl" style={{ backgroundColor: colors.inputBg }}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: colors.primary }}>
                    Riders
                  </label>
                  <input
                    type="text"
                    value={riderEmails}
                    onChange={(e) => setRiderEmails(e.target.value)}
                    placeholder="email1@team.com, email2@team.com"
                    className="w-full bg-transparent text-sm text-white placeholder-[#666] outline-none"
                  />
                  <div className="text-[10px] mt-2" style={{ color: colors.textDim }}>
                    Receives: Service summary, Jig changes, Race settings
                  </div>
                </div>
              </div>

              {/* Share Now Button */}
              <button
                onClick={handleShareNow}
                disabled={sharing || offline}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition active:scale-[0.98] disabled:opacity-50"
                style={{ borderColor: colors.primary, color: "#fff" }}
              >
                <Send size={16} />
                {sharing ? "Generating..." : "Share Now (Download PDF)"}
              </button>

              {/* Send Test Email Button */}
              <button
                onClick={handleSendTestEmail}
                disabled={sendingTest || offline}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: colors.primary, color: "#fff" }}
              >
                <Send size={16} />
                {sendingTest ? "Sending..." : "Send Test Email"}
              </button>

              {digestSaving && (
                <div className="text-center text-xs" style={{ color: colors.textDim }}>
                  Saving...
                </div>
              )}
            </div>
          )}
        </SpecSection>
        )}

        {/* App Info Section - Always visible */}
        <SpecSection title="APP INFO" defaultOpen={false} theme="dark">
          <div className="space-y-4">
            {/* Version */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: colors.textMuted }}>Version</span>
              <span className="text-sm font-medium text-white">1.0.0</span>
            </div>

            {/* Sync Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: colors.textMuted }}>Sync Status</span>
              <div className="flex items-center gap-2">
                {offline ? (
                  <>
                    <WifiOff size={14} style={{ color: colors.warning }} />
                    <span className="text-sm font-medium" style={{ color: colors.warning }}>Offline</span>
                  </>
                ) : (
                  <>
                    <Check size={14} style={{ color: colors.success }} />
                    <span className="text-sm font-medium" style={{ color: colors.success }}>Connected</span>
                  </>
                )}
              </div>
            </div>

            {/* Clear Cache */}
            <button
              onClick={() => setShowClearCacheConfirm(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition active:scale-[0.98]"
              style={{ backgroundColor: colors.inputBg, color: colors.textMuted }}
            >
              <Trash2 size={14} />
              Clear Local Cache
            </button>

            {/* Divider */}
            <div className="border-t" style={{ borderColor: colors.cardBorder }} />

            {/* Credits */}
            <div className="text-center space-y-1">
              <div className="text-sm" style={{ color: colors.textMuted }}>
                Created by <span className="text-white">Piotr Michaliszyn</span>
              </div>
              <div className="text-xs" style={{ color: colors.textDim }}>
                © 2026 All Rights Reserved
              </div>
            </div>

            {/* Feedback */}
            <a
              href="mailto:feedback@cfrbikeapp.com?subject=CFR%20Bike%20App%20Feedback"
              className="block w-full py-2.5 rounded-xl text-sm font-medium text-center transition active:scale-[0.98]"
              style={{ backgroundColor: colors.inputBg, color: colors.primary }}
            >
              Send Feedback
            </a>
          </div>
        </SpecSection>
      </main>

      {/* Confirmation Dialogs */}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
      <ClearCacheConfirmDialog
        open={showClearCacheConfirm}
        onClose={() => setShowClearCacheConfirm(false)}
        onConfirm={handleClearCache}
      />
    </div>
  );
}
