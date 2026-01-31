// ServicePage.jsx - Service logging for bike maintenance
// Track parts/actions per rider and bike with instant logging

import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { ArrowLeft, Wifi, WifiOff, History, Trophy, Trash2, ChevronDown } from "lucide-react";
import { Drawer } from "vaul";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { ensureSession } from "../../measurements/api/measurementsApi";
import { SpecSection } from "../components/SpecSection.jsx";
import { Avatar } from "../components/Avatar.jsx";

import { ACTIONS, ACTION_PRICE_EUR, CATEGORY_ORDER, getPrice, buildActionLabel } from "../../service/config/serviceConfig.js";
import { logServiceAction, fetchRecentHistory, fetchServiceHistory, fetchLeaderboardData, deleteServiceLog } from "../../service/api/serviceApi.js";

// Riders list (shared with other v3 pages)
const RIDERS = [
  { id: "ana", name: "Ana", image: "/riders/ana.png" },
  { id: "charlie", name: "Charlie", image: "/riders/charlie.png" },
  { id: "cole", name: "Cole", image: "/riders/cole.png" },
  { id: "luca", name: "Luca", image: "/riders/luca.png" },
  { id: "jolanda", name: "Jolanda", image: "/riders/jolanda.png" },
];

const BIKE_TYPES = [
  { id: "race", label: "Race", image: "/bikes/race.png" },
  { id: "training", label: "Train", image: "/bikes/training.png" },
  { id: "ebike", label: "E-Bike", image: "/bikes/ebike.png" },
  { id: "road", label: "Road", image: "/bikes/road.png" },
  { id: "cx", label: "CX", image: "/bikes/cx.png" },
];

// Format date for history
function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

// Format time only
function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Get date key for grouping (YYYY-MM-DD)
function getDateKey(iso) {
  if (!iso) return "unknown";
  try {
    const d = new Date(iso);
    return d.toISOString().split("T")[0];
  } catch {
    return "unknown";
  }
}

// Group history by date
function groupByDate(items) {
  const groups = {};
  for (const item of items) {
    const key = getDateKey(item.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  // Return as array of { date, label, items } sorted newest first
  return Object.entries(groups)
    .map(([date, items]) => ({
      date,
      label: formatDate(items[0]?.created_at),
      items,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Format price
function formatPrice(price) {
  return `€${Number(price || 0).toLocaleString()}`;
}

export default function ServicePage() {
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const { displayName, email, isAdmin } = useAuth();
  const toast = useToast();

  // Get theme from V3Layout context
  const context = useOutletContext();
  const isDark = context?.isDark ?? false;
  const theme = isDark ? "dark" : "light";

  const rider = params.get("rider") || "";
  const bikeType = (() => {
    const bt = String(params.get("bike") || "race").toLowerCase();
    return ["race", "training", "ebike", "road", "cx"].includes(bt) ? bt : "race";
  })();
  const mechanic = displayName || "";
  const mechanicEmail = email || "";

  // Picker states
  const [riderPickerOpen, setRiderPickerOpen] = useState(false);
  const [bikePickerOpen, setBikePickerOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [leaderboardDrawerOpen, setLeaderboardDrawerOpen] = useState(false);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  // History state
  const [recentHistory, setRecentHistory] = useState([]);
  const [fullHistory, setFullHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedDays, setExpandedDays] = useState(() => new Set());

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState({ seasonTotal: 0, byRiderBike: {}, byMechanic: {} });
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Reset key to collapse sections after save
  const [sectionResetKey, setSectionResetKey] = useState(0);

  // Switch rider
  function switchRider(newRiderName) {
    if (newRiderName === rider) {
      setRiderPickerOpen(false);
      return;
    }
    setSearchParams({ rider: newRiderName, bike: bikeType });
    setRiderPickerOpen(false);
  }

  // Switch bike type
  function switchBikeType(newBikeType) {
    if (newBikeType === bikeType) {
      setBikePickerOpen(false);
      return;
    }
    setSearchParams({ rider, bike: newBikeType });
    setBikePickerOpen(false);
  }

  // Load recent history
  async function loadRecentHistory() {
    if (!rider) return;
    try {
      await ensureSession();
      const data = await fetchRecentHistory(rider, bikeType, 5);
      setRecentHistory(data);
    } catch (e) {
      console.error("Failed to load recent history:", e);
    }
  }

  // Load full history
  async function loadFullHistory() {
    if (!rider) return;
    setHistoryLoading(true);
    try {
      await ensureSession();
      const data = await fetchServiceHistory(rider, { bikeType, limit: 100 });
      setFullHistory(data);
    } catch (e) {
      console.error("Failed to load history:", e);
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }

  // Load leaderboard
  async function loadLeaderboard() {
    setLeaderboardLoading(true);
    try {
      await ensureSession();
      const data = await fetchLeaderboardData();
      setLeaderboard(data);
    } catch (e) {
      console.error("Failed to load leaderboard:", e);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  // Log an action
  async function handleLogAction(category, item) {
    if (!rider || !mechanic || offline) {
      if (offline) toast.error("You're offline");
      return;
    }

    const price = getPrice(item);
    setSaving(true);

    try {
      await ensureSession();
      await logServiceAction({
        riderName: rider,
        bikeType,
        category,
        item,
        price,
        mechanicName: mechanic,
        mechanicEmail,
      });
      toast.success(`✓ ${item} logged`);
      setSectionResetKey((k) => k + 1); // Collapse sections after save
      loadRecentHistory();
    } catch (e) {
      toast.error(e.message || "Failed to log action");
    } finally {
      setSaving(false);
    }
  }

  // Delete a history entry
  async function handleDeleteEntry(id) {
    if (!isAdmin || offline) return;
    if (!window.confirm("Delete this entry?")) return;

    try {
      await deleteServiceLog(id);
      toast.success("Deleted");
      loadFullHistory();
      loadRecentHistory();
    } catch {
      toast.error("Delete failed");
    }
  }

  // Load data on mount and when rider/bike changes
  useEffect(() => {
    loadRecentHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider, bikeType]);

  // Load full history when drawer opens + auto-expand today
  useEffect(() => {
    if (historyDrawerOpen) {
      loadFullHistory();
      // Auto-expand today
      const today = new Date().toISOString().split("T")[0];
      setExpandedDays(new Set([today]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyDrawerOpen]);

  // Load leaderboard when drawer opens
  useEffect(() => {
    if (leaderboardDrawerOpen) loadLeaderboard();
  }, [leaderboardDrawerOpen]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    if (historyFilter === "All") return fullHistory;
    return fullHistory.filter((h) => h.category === historyFilter);
  }, [fullHistory, historyFilter]);

  // Theme colors
  const colors = isDark
    ? {
        pageBg: "#121212",
        backBtn: "bg-[#1e1e1e] text-white border border-[#2a2a2a]",
        headerSubtext: "text-[#ff6b2c]",
        cardBg: "bg-[#1e1e1e]",
        cardBorder: "border-[#2a2a2a]",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.40)]",
        riderName: "text-white",
        wifiOnline: "text-green-400",
        wifiOffline: "text-[#888888]",
        alertBg: "bg-[rgba(255,107,44,0.15)]",
        alertBorder: "border-[rgba(255,107,44,0.30)]",
        alertText: "text-[#ff6b2c]",
        modalBg: "#1e1e1e",
        modalBorder: "#2a2a2a",
        modalHandle: "bg-[#444444]",
        modalHeader: "text-[#ff6b2c]",
        historyText: "text-[#888888]",
        historyItem: "text-white",
        historyPrice: "text-[#ff6b2c]",
      }
    : {
        pageBg: "rgba(232,228,220,0.97)",
        backBtn: "bg-[rgba(255,255,255,0.75)] text-[#1e3331] border border-[rgba(0,0,0,0.08)]",
        headerSubtext: "text-[#5A7A70]",
        cardBg: "bg-[rgba(232,228,220,0.75)]",
        cardBorder: "border-[rgba(0,0,0,0.08)]",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.10)]",
        riderName: "text-[#1e3331]",
        wifiOnline: "text-green-600",
        wifiOffline: "text-[#8A9A94]",
        alertBg: "bg-[rgba(233,78,27,0.10)]",
        alertBorder: "border-[rgba(233,78,27,0.25)]",
        alertText: "text-[#e94e1b]",
        modalBg: "rgba(232,228,220,0.98)",
        modalBorder: "rgba(0,0,0,0.08)",
        modalHandle: "bg-[rgba(30,51,49,0.15)]",
        modalHeader: "text-[#5A7A70] opacity-70",
        historyText: "text-[#8A9A94]",
        historyItem: "text-[#1e3331]",
        historyPrice: "text-[#e94e1b]",
      };

  const pageStyle = isDark
    ? { background: colors.pageBg }
    : {
        background: colors.pageBg,
        backgroundImage: "radial-gradient(520px 360px at 50% 0, rgba(30,51,49,0.30), rgba(30,51,49,0.12) 35%, transparent 70%)",
        backgroundAttachment: "fixed",
      };

  return (
    <div className="min-h-dvh font-sans" style={pageStyle}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="mb-6">
          {/* Top row: Back button + Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/v3")}
                className={`p-2.5 rounded-full active:scale-95 transition ${colors.backBtn}`}
              >
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <span className={`text-xs font-semibold tracking-[0.15em] uppercase ${colors.headerSubtext}`}>
                Service
              </span>
            </div>

            {/* Status + Leaderboard */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLeaderboardDrawerOpen(true)}
                className={`p-2 rounded-full active:scale-95 transition ${colors.backBtn}`}
                title="Leaderboard"
              >
                <Trophy size={18} />
              </button>
              {offline ? (
                <WifiOff size={16} className={colors.wifiOffline} />
              ) : (
                <Wifi size={16} className={colors.wifiOnline} />
              )}
            </div>
          </div>

          {/* Rider + Bike Type Row */}
          <div
            className={`flex items-center justify-between rounded-[26px] p-3.5 backdrop-blur-sm border ring-1 ${isDark ? "ring-[rgba(255,107,44,0.15)]" : "ring-[rgba(255,255,255,0.05)]"} ${colors.cardBg} ${colors.cardBorder} ${colors.cardShadow}`}
            style={{
              boxShadow: isDark
                ? "0 10px 28px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(255, 107, 44, 0.08)"
                : "0 10px 28px rgba(0, 0, 0, 0.10)",
            }}
          >
            {/* Rider Selector */}
            <RiderButton
              rider={rider}
              riders={RIDERS}
              isDark={isDark}
              colors={colors}
              onClick={() => setRiderPickerOpen(true)}
            />

            {/* Bike Selector */}
            <BikeButton
              bikeType={bikeType}
              bikeTypes={BIKE_TYPES}
              isDark={isDark}
              onClick={() => setBikePickerOpen(true)}
            />
          </div>
        </div>

        {/* Offline warning */}
        {offline && (
          <div className={`mb-4 px-4 py-3 rounded-2xl border text-sm flex items-center gap-2 ${colors.alertBg} ${colors.alertBorder} ${colors.alertText}`}>
            <WifiOff size={16} /> Offline — logging disabled
          </div>
        )}

        {/* Category Accordions */}
        {!rider ? (
          <div className={`text-center py-12 ${colors.historyText}`}>
            Select a rider to start logging
          </div>
        ) : (
          <div className="space-y-2">
            {CATEGORY_ORDER.map((category) => (
              <SpecSection key={`${category}-${sectionResetKey}`} title={category} defaultOpen={false} theme={theme}>
                <ActionGrid
                  category={category}
                  actions={ACTIONS[category]}
                  onAction={(item) => handleLogAction(category, item)}
                  disabled={saving || offline}
                  isDark={isDark}
                />
              </SpecSection>
            ))}
          </div>
        )}

        {/* Recent History */}
        {rider && recentHistory.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold tracking-[0.15em] uppercase ${colors.headerSubtext}`}>
                History
              </span>
              <button
                onClick={() => setHistoryDrawerOpen(true)}
                className={`text-xs font-semibold ${isDark ? "text-[#ff6b2c]" : "text-[#e94e1b]"}`}
              >
                View All →
              </button>
            </div>
            <div className={`rounded-[26px] p-4 backdrop-blur-sm border ring-1 ${isDark ? "ring-[rgba(255,255,255,0.05)]" : "ring-[rgba(30,51,49,0.12)]"} ${colors.cardBg} ${colors.cardBorder} ${colors.cardShadow}`}>
              {groupByDate(recentHistory).map((group, gi) => (
                <div key={group.date}>
                  {/* Day header */}
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${gi > 0 ? "mt-3 pt-3 border-t" : ""} ${isDark ? "text-[#ff6b2c] border-[#2a2a2a]" : "text-[#e94e1b] border-[rgba(0,0,0,0.06)]"}`}>
                    {group.label}
                  </div>
                  {/* Items for this day */}
                  {group.items.map((h) => (
                    <div key={h.id} className="py-1.5 flex items-center gap-2">
                      <span className={`font-semibold ${colors.historyItem}`}>{h.item}</span>
                      <span className={`text-xs ${colors.historyText}`}>{formatTime(h.created_at)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rider Picker Drawer */}
      <Drawer.Root open={riderPickerOpen} onOpenChange={setRiderPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Drawer.Content
            className={`flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t`}
            style={{
              background: isDark ? colors.modalBg : `radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%), ${colors.modalBg}`,
              borderColor: colors.modalBorder,
            }}
          >
            <div className="p-4 rounded-t-[20px] flex-none">
              <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${colors.modalHandle}`} />
            </div>

            <div className="text-center pb-4">
              <p className={`text-[10px] uppercase font-semibold tracking-[0.3em] ${colors.modalHeader}`}>
                Tap Rider → Switch
              </p>
            </div>

            <div className="px-4 pb-6">
              <div className="flex justify-center gap-4 mb-6">
                {RIDERS.slice(0, 3).map((r) => (
                  <Avatar
                    key={r.id}
                    name={r.name}
                    initial={r.name[0]}
                    image={r.image}
                    selected={rider === r.name}
                    onClick={() => switchRider(r.name)}
                    theme={theme}
                  />
                ))}
              </div>

              <div className="flex justify-center gap-4">
                {RIDERS.slice(3).map((r) => (
                  <Avatar
                    key={r.id}
                    name={r.name}
                    initial={r.name[0]}
                    image={r.image}
                    selected={rider === r.name}
                    onClick={() => switchRider(r.name)}
                    theme={theme}
                  />
                ))}
              </div>
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Bike Picker Drawer */}
      <Drawer.Root open={bikePickerOpen} onOpenChange={setBikePickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className={`fixed inset-0 backdrop-blur-sm z-50 ${isDark ? "bg-black/60" : "bg-black/40"}`} />
          <Drawer.Content
            className={`flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t ${
              isDark ? "border-[#2a2a2a]" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{
              background: isDark
                ? "#1e1e1e"
                : "radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%), rgba(232,228,220,0.98)",
            }}
          >
            <div className="p-4 rounded-t-[32px] flex-none">
              <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${isDark ? "bg-[#444444]" : "bg-[rgba(30,51,49,0.15)]"}`} />
            </div>

            <div className="text-center pb-4">
              <p className={`text-[10px] uppercase font-semibold tracking-[0.3em] ${isDark ? "text-[#ff6b2c]" : "text-[#5A7A70] opacity-70"}`}>
                Tap Bike → Switch
              </p>
            </div>

            <div className="px-4 pb-6">
              <div className="flex justify-center gap-4 flex-wrap">
                {BIKE_TYPES.map((b) => (
                  <BikePickerTile
                    key={b.id}
                    bike={b}
                    selected={bikeType === b.id}
                    isDark={isDark}
                    onClick={() => {
                      switchBikeType(b.id);
                      setBikePickerOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* History Drawer */}
      <Drawer.Root open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Drawer.Content
            className={`flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t max-h-[85vh]`}
            style={{
              background: isDark ? colors.modalBg : `radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%), ${colors.modalBg}`,
              borderColor: colors.modalBorder,
            }}
          >
            <div className="p-4 rounded-t-[20px] flex-none">
              <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${colors.modalHandle}`} />
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-semibold tracking-[0.15em] uppercase ${colors.modalHeader}`}>
                  Service History
                </span>
                <span className={`text-xs ${colors.historyText}`}>
                  {rider} • {BIKE_TYPES.find((b) => b.id === bikeType)?.label}
                </span>
              </div>

              {/* Filter chips */}
              <div className="flex gap-2 flex-wrap mb-4">
                {["All", ...CATEGORY_ORDER].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setHistoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      historyFilter === cat
                        ? isDark
                          ? "bg-[#ff6b2c] text-white"
                          : "bg-[#e94e1b] text-white"
                        : isDark
                          ? "bg-[#252525] text-[#888888] border border-[#333333]"
                          : "bg-[rgba(30,51,49,0.06)] text-[#5A7A70] border border-[rgba(0,0,0,0.06)]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* History list - grouped by day */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {historyLoading ? (
                <div className={`animate-pulse h-32 rounded-xl ${isDark ? "bg-[#1e1e1e]" : "bg-[rgba(30,51,49,0.04)]"}`} />
              ) : filteredHistory.length === 0 ? (
                <div className={`text-center py-8 ${colors.historyText}`}>No history found</div>
              ) : (
                <div className="space-y-2">
                  {groupByDate(filteredHistory).map((group) => {
                    const isExpanded = expandedDays.has(group.date);
                    const toggleDay = () => {
                      setExpandedDays((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.date)) next.delete(group.date);
                        else next.add(group.date);
                        return next;
                      });
                    };
                    return (
                      <div
                        key={group.date}
                        className={`rounded-xl overflow-hidden ${isDark ? "bg-[#1e1e1e] border border-[#2a2a2a]" : "bg-[rgba(255,255,255,0.45)] border border-[rgba(0,0,0,0.06)]"}`}
                      >
                        {/* Day header - tap to expand/collapse */}
                        <button
                          onClick={toggleDay}
                          className={`w-full px-4 py-3 flex items-center justify-between ${isDark ? "active:bg-[rgba(255,255,255,0.03)]" : "active:bg-[rgba(0,0,0,0.03)]"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isDark ? "text-[#ff6b2c]" : "text-[#e94e1b]"}`}>
                              {group.label}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-[#252525] text-[#888888]" : "bg-[rgba(30,51,49,0.08)] text-[#8A9A94]"}`}>
                              {group.items.length}
                            </span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`transition-transform ${isExpanded ? "rotate-180" : ""} ${isDark ? "text-[#666666]" : "text-[#8A9A94]"}`}
                          />
                        </button>
                        {/* Expanded items */}
                        {isExpanded && (
                          <div className={`px-4 pb-3 border-t ${isDark ? "border-[#2a2a2a]" : "border-[rgba(0,0,0,0.06)]"}`}>
                            {group.items.map((h) => (
                              <div key={h.id} className={`flex items-center justify-between py-2 border-b last:border-b-0 ${isDark ? "border-[#2a2a2a]" : "border-[rgba(0,0,0,0.04)]"}`}>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${colors.historyItem}`}>{h.item}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-[#252525] text-[#888888]" : "bg-[rgba(30,51,49,0.06)] text-[#8A9A94]"}`}>
                                      {h.category}
                                    </span>
                                  </div>
                                  <div className={`text-xs ${colors.historyText}`}>
                                    {formatTime(h.created_at)} • {h.mechanic_name || "—"}
                                  </div>
                                </div>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteEntry(h.id)}
                                    className={`p-1.5 rounded-lg transition ${isDark ? "text-[#666666] hover:text-red-400" : "text-[#8A9A94] hover:text-red-500"}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Leaderboard Drawer */}
      <Drawer.Root open={leaderboardDrawerOpen} onOpenChange={setLeaderboardDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Drawer.Content
            className={`flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t max-h-[85vh]`}
            style={{
              background: isDark ? colors.modalBg : `radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%), ${colors.modalBg}`,
              borderColor: colors.modalBorder,
            }}
          >
            <div className="p-4 rounded-t-[20px] flex-none">
              <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${colors.modalHandle}`} />
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={18} className={isDark ? "text-[#ff6b2c]" : "text-[#e94e1b]"} />
                <span className={`text-xs font-semibold tracking-[0.15em] uppercase ${colors.modalHeader}`}>
                  Leaderboard
                </span>
              </div>

              {/* Season total */}
              <div className={`text-center py-4 mb-4 rounded-xl ${isDark ? "bg-[#1e1e1e]" : "bg-[rgba(255,255,255,0.45)]"}`}>
                <div className={`text-xs ${colors.historyText}`}>Season Total</div>
                <div className={`text-3xl font-black ${isDark ? "text-[#ff6b2c]" : "text-[#e94e1b]"}`}>
                  {formatPrice(leaderboard.seasonTotal)}
                </div>
              </div>
            </div>

            {/* Leaderboard lists */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {leaderboardLoading ? (
                <div className={`animate-pulse h-32 rounded-xl ${isDark ? "bg-[#1e1e1e]" : "bg-[rgba(30,51,49,0.04)]"}`} />
              ) : (
                <>
                  {/* By Rider/Bike */}
                  <div className="mb-6">
                    <div className={`text-xs font-semibold mb-2 ${colors.historyText}`}>BY RIDER / BIKE</div>
                    <div className="space-y-1">
                      {Object.entries(leaderboard.byRiderBike)
                        .sort((a, b) => b[1] - a[1])
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              isDark ? "bg-[#1e1e1e]" : "bg-[rgba(255,255,255,0.45)]"
                            }`}
                          >
                            <span className={colors.historyItem}>{key}</span>
                            <span className={`font-bold ${colors.historyPrice}`}>{formatPrice(value)}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* By Mechanic */}
                  <div>
                    <div className={`text-xs font-semibold mb-2 ${colors.historyText}`}>BY MECHANIC</div>
                    <div className="space-y-1">
                      {Object.entries(leaderboard.byMechanic)
                        .sort((a, b) => b[1] - a[1])
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              isDark ? "bg-[#1e1e1e]" : "bg-[rgba(255,255,255,0.45)]"
                            }`}
                          >
                            <span className={colors.historyItem}>{key}</span>
                            <span className={`font-bold ${colors.historyPrice}`}>{formatPrice(value)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

// ----- Subcomponents -----

function RiderButton({ rider, riders, isDark, colors, onClick }) {
  const currentRider = riders.find((r) => r.name === rider);
  return (
    <button onClick={onClick} className="flex items-center gap-3 active:scale-[0.98] transition">
      <div className={`relative p-[2px] rounded-2xl backdrop-blur-sm border ${isDark ? "bg-[#252525] border-b-2 border-b-[#ff6b2c]" : "bg-[rgba(30,51,49,0.12)] border-[rgba(0,0,0,0.08)]"} ring-1 ${isDark ? "ring-[rgba(255,255,255,0.05)]" : "ring-[rgba(30,51,49,0.20)]"} shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}>
        <div className={`w-[50px] h-[50px] rounded-xl overflow-hidden border ${isDark ? "bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]" : "bg-[#1e3331] border-[rgba(255,255,255,0.1)]"}`}>
          {currentRider?.image ? (
            <img src={currentRider.image} alt={rider} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isDark ? "bg-[linear-gradient(180deg,#ff8a50_0%,#ff6b2c_100%)]" : "bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)]"}`}>
              <span className="text-sm font-bold text-white">{rider?.[0] || "?"}</span>
            </div>
          )}
        </div>
      </div>
      <span className={`font-bold tracking-[0.10em] ${colors.riderName}`}>{rider?.toUpperCase() || "SELECT"}</span>
    </button>
  );
}

function BikeButton({ bikeType, bikeTypes, isDark, onClick }) {
  const currentBike = bikeTypes.find((b) => b.id === bikeType);
  return (
    <button onClick={onClick} className="flex items-center gap-3 active:scale-[0.98] transition">
      <span className={`font-bold tracking-[0.10em] ${isDark ? "text-white" : "text-[#1e3331]"}`}>{currentBike?.label?.toUpperCase()}</span>
      <div className={`relative p-[2px] rounded-2xl backdrop-blur-sm border ring-1 ${
        isDark
          ? "bg-[#252525] border-b-2 border-b-[#ff6b2c] ring-[rgba(255,255,255,0.05)] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
          : "bg-[rgba(30,51,49,0.12)] border-[rgba(0,0,0,0.08)] ring-[rgba(30,51,49,0.20)] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
      }`}>
        <div className={`w-[50px] h-[50px] rounded-xl overflow-hidden flex items-center justify-center border ${
          isDark
            ? "bg-[#1e1e1e] border-[rgba(255,255,255,0.05)]"
            : "bg-[rgba(255,255,255,0.70)] border-[rgba(0,0,0,0.06)]"
        }`}>
          {currentBike?.image ? (
            <img src={currentBike.image} alt={currentBike.label} className="w-[42px] h-[42px] object-contain" />
          ) : (
            <div className="w-full h-full bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)] flex items-center justify-center">
              <span className="text-sm font-bold text-white">{currentBike?.label?.[0] || "?"}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function BikePickerTile({ bike, selected, isDark, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-3 w-[80px] flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 ${isDark ? "focus-visible:ring-[#ff6b2c]" : "focus-visible:ring-[rgba(233,78,27,0.55)]"}`}
    >
      <div
        style={{
          boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.4)" : "0 10px 28px rgba(0, 0, 0, 0.18)",
        }}
        className={[
          "relative p-[2px] rounded-2xl",
          "group-hover:scale-[1.03] group-active:scale-[0.97]",
          isDark ? (selected ? "bg-[#2a2a2a]" : "bg-[#1e1e1e]") : (selected ? "bg-[rgba(30,51,49,0.18)]" : "bg-[rgba(30,51,49,0.12)]"),
          "backdrop-blur-sm",
          isDark ? "border-transparent border-b-2 border-b-[#ff6b2c]" : "border border-[rgba(0,0,0,0.08)]",
          selected ? (isDark ? "ring-1 ring-[#ff6b2c]" : "ring-1 ring-[rgba(233,78,27,0.50)]") : (isDark ? "ring-0" : "ring-1 ring-[rgba(30,51,49,0.20)]"),
        ].join(" ")}
      >
        <div className={`w-[70px] h-[70px] rounded-xl overflow-hidden flex items-center justify-center ${isDark ? "bg-[#1e1e1e] border border-[rgba(255,255,255,0.05)]" : "bg-[rgba(255,255,255,0.70)] border border-[rgba(0,0,0,0.06)]"}`}>
          {bike.image ? (
            <img src={bike.image} alt={bike.label} className="w-[58px] h-[58px] object-contain" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isDark ? "bg-[#ff6b2c]" : "bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)]"}`}>
              <span className="text-lg font-bold text-white">{bike.label[0]}</span>
            </div>
          )}
        </div>
      </div>
      <span className={`text-sm font-semibold truncate max-w-full ${selected ? (isDark ? "text-[#ff6b2c]" : "text-[#e94e1b]") : (isDark ? "text-white" : "text-[#1e3331]")}`}>
        {bike.label}
      </span>
    </button>
  );
}

function ActionGrid({ actions, onAction, disabled, isDark }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => {
        if (action.split) {
          // Split action: show two buttons side by side
          return action.split.map((variant) => {
            const label = buildActionLabel(action.base, variant);
            const isLeft = variant === "L" || variant === "F";
            return (
              <ActionButton
                key={label}
                base={action.base}
                variant={variant}
                onClick={() => onAction(label)}
                disabled={disabled}
                isDark={isDark}
                isLeft={isLeft}
              />
            );
          });
        } else {
          // Single action: full width
          return (
            <ActionButton
              key={action.base}
              base={action.base}
              onClick={() => onAction(action.base)}
              disabled={disabled}
              isDark={isDark}
              fullWidth
            />
          );
        }
      })}
    </div>
  );
}

function ActionButton({ base, variant, onClick, disabled, isDark, isLeft, fullWidth }) {
  // Subtle tint for L/F vs R
  const tintClass = variant
    ? isLeft
      ? isDark ? "bg-cyan-400/5" : "bg-cyan-500/5"
      : isDark ? "bg-amber-400/5" : "bg-amber-500/5"
    : "";

  const variantColor = variant
    ? isLeft
      ? "text-cyan-400"
      : "text-amber-400"
    : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${fullWidth ? "col-span-2" : ""}
        flex items-center gap-2 p-3 rounded-xl border
        active:scale-[0.98] transition
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${isDark
          ? `bg-[#1a1a1a] border-[#2a2a2a] ${tintClass}`
          : `bg-[rgba(255,255,255,0.45)] border-[rgba(0,0,0,0.06)] shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${tintClass}`
        }
      `}
    >
      <span className={`font-semibold ${isDark ? "text-white" : "text-[#1e3331]"}`}>{base}</span>
      {variant && (
        <span className={`text-sm font-bold ${variantColor}`}>{variant}</span>
      )}
    </button>
  );
}
