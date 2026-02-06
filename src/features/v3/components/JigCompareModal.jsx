// JigCompareModal.jsx - Compare jig measurements between two bikes
// Shows delta values between two rider/bike combinations

import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { X, ArrowUpDown, ChevronDown } from "lucide-react";
import { fetchLatestQuick } from "../../measurements/api/measurementsApi";

// Riders and bike types matching JigPage
const RIDERS = [
  { id: "ana", name: "Ana" },
  { id: "charlie", name: "Charlie" },
  { id: "cole", name: "Cole" },
  { id: "luca", name: "Luca" },
  { id: "jolanda", name: "Jolanda" },
];

const BIKE_TYPES = [
  { id: "race", label: "Race" },
  { id: "training", label: "Training" },
  { id: "road", label: "Road" },
  { id: "ebike", label: "E-Bike" },
  { id: "cx", label: "CX" },
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatValue(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export function JigCompareModal({ open, onClose, defaultRider, defaultBike }) {
  // Bike 1 selection (defaults to current rider/bike)
  const [rider1, setRider1] = useState(defaultRider || "Ana");
  const [bike1, setBike1] = useState(defaultBike || "race");
  const [rider1Open, setRider1Open] = useState(false);
  const [bike1Open, setBike1Open] = useState(false);

  // Bike 2 selection (defaults to same rider, different bike or next rider)
  const [rider2, setRider2] = useState(defaultRider || "Ana");
  const [bike2, setBike2] = useState(defaultBike === "race" ? "training" : "race");
  const [rider2Open, setRider2Open] = useState(false);
  const [bike2Open, setBike2Open] = useState(false);

  // Data states
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compared, setCompared] = useState(false);
  const [error, setError] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setRider1(defaultRider || "Ana");
      setBike1(defaultBike || "race");
      setRider2(defaultRider || "Ana");
      setBike2(defaultBike === "race" ? "training" : "race");
      setData1(null);
      setData2(null);
      setCompared(false);
      setError(null);
    }
  }, [open, defaultRider, defaultBike]);

  // Check if same selection
  const isSameSelection = rider1 === rider2 && bike1 === bike2;

  // Swap selections
  function handleSwap() {
    const tempRider = rider1;
    const tempBike = bike1;
    setRider1(rider2);
    setBike1(bike2);
    setRider2(tempRider);
    setBike2(tempBike);
    // Also swap data if already compared
    if (compared) {
      const tempData = data1;
      setData1(data2);
      setData2(tempData);
    }
  }

  // Fetch comparison data
  async function handleCompare() {
    if (isSameSelection) return;

    setLoading(true);
    setError(null);

    try {
      const [result1, result2] = await Promise.all([
        fetchLatestQuick(rider1, bike1),
        fetchLatestQuick(rider2, bike2),
      ]);
      setData1(result1);
      setData2(result2);
      setCompared(true);
    } catch (err) {
      setError("Failed to load comparison data");
      console.error("Compare error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate delta
  function getDelta(val1, val2) {
    if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) {
      return { value: null, display: "—", color: "var(--text-muted)" };
    }
    const n1 = Number(val1);
    const n2 = Number(val2);
    if (!Number.isFinite(n1) || !Number.isFinite(n2)) {
      return { value: null, display: "—", color: "var(--text-muted)" };
    }
    const diff = n2 - n1;
    if (diff === 0) {
      return { value: 0, display: "—", color: "var(--text-muted)" };
    }
    const sign = diff > 0 ? "+" : "";
    const arrow = diff > 0 ? "↑" : "↓";
    const color = diff > 0 ? "#22c55e" : "#ef4444";
    return { value: diff, display: `${sign}${diff.toFixed(1)} ${arrow}`, color };
  }

  // Get bike label
  function getBikeLabel(bikeId) {
    return BIKE_TYPES.find((b) => b.id === bikeId)?.label || bikeId;
  }

  return (
    <Drawer.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 outline-none max-h-[85dvh] flex flex-col">
          <div className="bg-app-surface rounded-t-[20px] flex flex-col max-h-[85dvh]">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-text-muted rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b border-chrome-strong flex-shrink-0">
              <Drawer.Title className="text-lg font-bold text-white">
                Compare JIG
              </Drawer.Title>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-app-elevated text-white/60 hover:text-white active:scale-95 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Bike 1 Selection */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Bike 1</div>
                <div className="flex gap-2">
                  {/* Rider 1 Dropdown */}
                  <div className="flex-1 relative">
                    <button
                      onClick={() => { setRider1Open(!rider1Open); setBike1Open(false); }}
                      className="w-full px-3 py-2.5 rounded-xl bg-app-elevated border border-chrome-strong text-white text-sm font-medium flex items-center justify-between focus:border-brand-orange transition"
                    >
                      {rider1}
                      <ChevronDown size={16} className="text-text-muted" />
                    </button>
                    {rider1Open && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-app-elevated border border-chrome-strong rounded-xl overflow-hidden z-10 shadow-xl">
                        {RIDERS.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => { setRider1(r.name); setRider1Open(false); }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-chrome-strong transition ${rider1 === r.name ? "text-brand-orange font-medium" : "text-white"}`}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Bike 1 Dropdown */}
                  <div className="flex-1 relative">
                    <button
                      onClick={() => { setBike1Open(!bike1Open); setRider1Open(false); }}
                      className="w-full px-3 py-2.5 rounded-xl bg-app-elevated border border-chrome-strong text-white text-sm font-medium flex items-center justify-between focus:border-brand-orange transition"
                    >
                      {getBikeLabel(bike1)}
                      <ChevronDown size={16} className="text-text-muted" />
                    </button>
                    {bike1Open && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-app-elevated border border-chrome-strong rounded-xl overflow-hidden z-10 shadow-xl">
                        {BIKE_TYPES.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => { setBike1(b.id); setBike1Open(false); }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-chrome-strong transition ${bike1 === b.id ? "text-brand-orange font-medium" : "text-white"}`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleSwap}
                  className="p-2 rounded-lg bg-app-elevated text-text-muted hover:text-white active:scale-95 transition"
                  title="Swap selections"
                >
                  <ArrowUpDown size={18} />
                </button>
              </div>

              {/* Bike 2 Selection */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Bike 2</div>
                <div className="flex gap-2">
                  {/* Rider 2 Dropdown */}
                  <div className="flex-1 relative">
                    <button
                      onClick={() => { setRider2Open(!rider2Open); setBike2Open(false); }}
                      className="w-full px-3 py-2.5 rounded-xl bg-app-elevated border border-chrome-strong text-white text-sm font-medium flex items-center justify-between focus:border-brand-orange transition"
                    >
                      {rider2}
                      <ChevronDown size={16} className="text-text-muted" />
                    </button>
                    {rider2Open && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-app-elevated border border-chrome-strong rounded-xl overflow-hidden z-10 shadow-xl">
                        {RIDERS.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => { setRider2(r.name); setRider2Open(false); }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-chrome-strong transition ${rider2 === r.name ? "text-brand-orange font-medium" : "text-white"}`}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Bike 2 Dropdown */}
                  <div className="flex-1 relative">
                    <button
                      onClick={() => { setBike2Open(!bike2Open); setRider2Open(false); }}
                      className="w-full px-3 py-2.5 rounded-xl bg-app-elevated border border-chrome-strong text-white text-sm font-medium flex items-center justify-between focus:border-brand-orange transition"
                    >
                      {getBikeLabel(bike2)}
                      <ChevronDown size={16} className="text-text-muted" />
                    </button>
                    {bike2Open && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-app-elevated border border-chrome-strong rounded-xl overflow-hidden z-10 shadow-xl">
                        {BIKE_TYPES.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => { setBike2(b.id); setBike2Open(false); }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-chrome-strong transition ${bike2 === b.id ? "text-brand-orange font-medium" : "text-white"}`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Same selection warning */}
              {isSameSelection && (
                <div className="text-center text-sm text-text-muted py-2">
                  Select two different bikes to compare
                </div>
              )}

              {/* Compare Button */}
              <button
                onClick={handleCompare}
                disabled={isSameSelection || loading}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--brand-orange)", color: "var(--text-primary)" }}
              >
                {loading ? "Loading..." : "Compare"}
              </button>

              {/* Error state */}
              {error && (
                <div className="text-center text-sm text-red-400 py-2">{error}</div>
              )}

              {/* Comparison Table */}
              {compared && !loading && (
                <div className="mt-4 rounded-xl overflow-hidden border border-chrome-strong">
                  {/* Table Header */}
                  <div className="grid grid-cols-4 bg-app-elevated text-xs font-semibold">
                    <div className="p-3 text-text-muted"></div>
                    <div className="p-3 text-white text-center">
                      <div className="truncate">{rider1}</div>
                      <div className="text-text-muted text-[10px] font-normal">{getBikeLabel(bike1)}</div>
                    </div>
                    <div className="p-3 text-white text-center">
                      <div className="truncate">{rider2}</div>
                      <div className="text-text-muted text-[10px] font-normal">{getBikeLabel(bike2)}</div>
                    </div>
                    <div className="p-3 text-text-muted text-center">Δ</div>
                  </div>

                  {/* No data messages */}
                  {!data1 && !data2 ? (
                    <div className="p-4 text-center text-sm text-text-muted">
                      No jig data for either bike
                    </div>
                  ) : (
                    <>
                      {/* Data Rows */}
                      {[
                        { label: "Saddle Setback", key: "saddle_setback", unit: "mm", showDelta: true },
                        { label: "Height 4cm", key: "height_4cm", unit: "mm", showDelta: true },
                        { label: "Height 15cm", key: "height_15cm", unit: "mm", showDelta: true },
                        { label: "Location", key: "location", unit: "", showDelta: false },
                        { label: "Last Updated", key: "timestamp", unit: "", showDelta: false, isDate: true },
                      ].map((row, i) => {
                        const val1 = data1?.[row.key];
                        const val2 = data2?.[row.key];
                        const delta = row.showDelta ? getDelta(val1, val2) : null;

                        return (
                          <div
                            key={row.key}
                            className={`grid grid-cols-4 text-sm ${i % 2 === 0 ? "bg-app-surface" : "bg-app-bg"} border-t border-chrome-strong`}
                          >
                            <div className="p-3 text-text-muted text-xs">{row.label}</div>
                            <div className="p-3 text-white text-center font-mono">
                              {row.isDate ? formatDate(val1) : formatValue(val1)}
                            </div>
                            <div className="p-3 text-white text-center font-mono">
                              {row.isDate ? formatDate(val2) : formatValue(val2)}
                            </div>
                            <div className="p-3 text-center font-mono text-sm" style={{ color: delta?.color || "var(--text-muted)" }}>
                              {row.showDelta ? delta?.display : (
                                row.key === "location" ? (
                                  val1 === val2 ? "same" : (val1 && val2 ? "diff" : "—")
                                ) : "—"
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* No data warnings */}
                      {!data1 && (
                        <div className="p-3 text-center text-xs text-text-muted bg-app-bg border-t border-chrome-strong">
                          No jig data for {rider1} {getBikeLabel(bike1)}
                        </div>
                      )}
                      {!data2 && (
                        <div className="p-3 text-center text-xs text-text-muted bg-app-bg border-t border-chrome-strong">
                          No jig data for {rider2} {getBikeLabel(bike2)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Safe area spacer */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default JigCompareModal;
