import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ensureSession, fetchHistory } from "../api/measurementsApi";
import { ArrowLeft, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";

function isQuickType(t) {
  const x = String(t || "").toLowerCase();
  return x === "quick" || x === "quick_road" || x === "quick_cx";
}

function quickTypeForBikeType(bikeType) {
  const k = String(bikeType || "mtb").toLowerCase();
  if (k === "road") return "quick_road";
  if (k === "cx") return "quick_cx";
  return "quick";
}

function isDeltaNonZero(d) {
  if (d === null || d === undefined) return false;
  return Math.abs(Number(d)) >= 0.05; // ignore tiny float noise
}

function metricCellClass({ isLatest, delta }) {
  // Highlight ONLY the latest row when that metric changed vs baseline
  if (!isLatest || !isDeltaNonZero(delta)) return "px-4 py-3 text-white/70 whitespace-nowrap";
  return "px-4 py-3 text-white/85 whitespace-nowrap bg-lime-300/10 border-l border-r border-lime-300/20";
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { displayName } = useAuth();

  const mechanic = (displayName || "").trim();
  const rider = params.get("rider") || "";

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ kind: "idle", msg: "" }); // idle|loading|err

  // dropdown: Jig / Bike Spec / All
  const [filter, setFilter] = useState("quick"); // quick|full|all

  const [openFullKey, setOpenFullKey] = useState(null); // id|timestamp of expanded full-spec row

  // Default is MTB so Road/CX are minimal visibility
  const [jigBikeType, setJigBikeType] = useState("mtb"); // mtb|road|cx|all

  // iOS Safari sometimes doesn't paint the page until the first scroll.
  // This 1px nudge forces a paint without changing where the user ends up.
  useEffect(() => {
    const isiOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isiOS) return;
    requestAnimationFrame(() => {
      window.scrollBy(0, 1);
      window.scrollBy(0, -1);
    });
  }, []);

  async function load({ silent = false } = {}) {
    if (!rider) return;
    if (!silent) setStatus({ kind: "loading", msg: "" });

    try {
      await ensureSession();
      const data = await fetchHistory(rider, 180);
      setItems(data);
      if (!silent) setStatus({ kind: "idle", msg: "" });
    } catch (e) {
      if (!silent) setStatus({ kind: "err", msg: e.message || "Failed to load history." });
    }
  }

  useEffect(() => {
    load();

    const onVis = () => {
      if (document.visibilityState === "visible") load({ silent: true });
    };
    const onFocus = () => load({ silent: true });
    const onOnline = () => load({ silent: true });

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider]);

  const jigAllNewestFirst = useMemo(
    () =>
      (items || [])
        .filter((x) => isQuickType(x.type))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [items]
  );

  const jigFilteredNewestFirst = useMemo(() => {
    if (jigBikeType === "all") return jigAllNewestFirst;
    const t = quickTypeForBikeType(jigBikeType);
    return jigAllNewestFirst.filter((x) => String(x.type || "").toLowerCase() === t);
  }, [jigAllNewestFirst, jigBikeType]);

  const fullRowsNewestFirst = useMemo(
    () =>
      (items || [])
        .filter((x) => String(x.type || "").toLowerCase() === "full")
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [items]
  );

  const showJig = filter === "quick" || filter === "all";
  const showFull = filter === "full" || filter === "all";

  async function shareLatestJig() {
    const latest = jigFilteredNewestFirst[0];
    if (!latest) return;

    const sb = toNum(latest.saddle_setback);
    const h4 = toNum(latest.height_4cm);
    const h15 = toNum(latest.height_15cm);

    const base = rollingBaselineForIndex(jigFilteredNewestFirst, 0);
    const dSB = base ? diff(sb, base.sb) : null;
    const d4 = base ? diff(h4, base.h4) : null;
    const d15 = base ? diff(h15, base.h15) : null;

    const text =
      `${rider} — Jig Update (${bikeLabelFromType(latest.type)})\n` +
      `SB: ${fmtNum(sb)}${dSB !== null ? ` (${fmtSigned(dSB)})` : ""}\n` +
      `4cm: ${fmtNum(h4)}${d4 !== null ? ` (${fmtSigned(d4)})` : ""}\n` +
      `15cm: ${fmtNum(h15)}${d15 !== null ? ` (${fmtSigned(d15)})` : ""}\n` +
      (latest.location ? `Location: ${latest.location}\n` : "") +
      (latest.notes ? `Notes: ${latest.notes}\n` : "") +
      `When: ${formatDateTime(latest.timestamp)}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: `${rider} Jig Update`, text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Copied to clipboard");
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/measurements")}
        className="inline-flex items-center gap-2 text-white/70 hover:text-white"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div
        className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6"
        style={{ WebkitTransform: "translateZ(0)" }}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-sm text-white/60 uppercase tracking-widest">History</div>
            <div className="text-2xl font-black mt-1">{rider || "No rider selected"}</div>
            <div className="text-white/50 text-sm mt-1">Mechanic: {mechanic || "—"}</div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {showJig && jigFilteredNewestFirst.length > 0 && (
              <button
                onClick={shareLatestJig}
                className="rounded-2xl px-4 py-3 font-black border border-white/10 bg-white/5 hover:bg-white/10 text-white/85 inline-flex items-center gap-2"
              >
                <Share2 size={16} /> Share Jig
              </button>
            )}

            <label className="block">
              <div className="text-[11px] text-white/50 uppercase tracking-widest mb-2">View</div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
              >
                <option value="quick">Jig</option>
                <option value="full">Bike Spec</option>
                <option value="all">All</option>
              </select>
            </label>

            {showJig && (
              <label className="block">
                <div className="text-[11px] text-white/50 uppercase tracking-widest mb-2">Bike</div>
                <select
                  value={jigBikeType}
                  onChange={(e) => setJigBikeType(e.target.value)}
                  className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
                >
                  <option value="mtb">MTB</option>
                  <option value="road">Road</option>
                  <option value="cx">CX</option>
                  <option value="all">All</option>
                </select>
              </label>
            )}
          </div>
        </div>

        {status.kind === "loading" ? (
          <div className="mt-6 text-white/60">Loading history…</div>
        ) : status.kind === "err" ? (
          <div className="mt-6 text-red-200/90">{status.msg}</div>
        ) : (
          <div className="mt-6 space-y-6">
            {showJig && (
              <div className="space-y-3">
                <div className="text-xs text-white/60 uppercase tracking-widest">Jig / Quick</div>

                {jigFilteredNewestFirst.length === 0 ? (
                  <div className="text-white/60">No jig/quick entries yet.</div>
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-black/20 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-[820px] w-full text-sm">
                        <thead>
                          <tr className="bg-black/35 text-white/70">
                            <th className="px-4 py-3 text-left font-bold">When</th>
                            <th className="px-4 py-3 text-left font-bold">Bike</th>
                            <th className="px-4 py-3 text-left font-bold">SB</th>
                            <th className="px-4 py-3 text-left font-bold">4cm</th>
                            <th className="px-4 py-3 text-left font-bold">15cm</th>
                            <th className="px-4 py-3 text-left font-bold">Location</th>
                            <th className="px-4 py-3 text-left font-bold">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jigFilteredNewestFirst.map((row, idx) => {
                            const isLatest = idx === 0;

                            const sb = toNum(row.saddle_setback);
                            const h4 = toNum(row.height_4cm);
                            const h15 = toNum(row.height_15cm);

                            const base = rollingBaselineForIndex(jigFilteredNewestFirst, idx);
                            const dSB = base ? diff(sb, base.sb) : null;
                            const d4 = base ? diff(h4, base.h4) : null;
                            const d15 = base ? diff(h15, base.h15) : null;

                            return (
                              <tr
                                key={row.id || row.timestamp}
                                className={`border-t border-white/10 ${isLatest ? "bg-white/[0.02]" : ""}`}
                              >
                                <td className="px-4 py-3 text-white/80 whitespace-nowrap">
                                  <div className="font-semibold">{formatDateTime(row.timestamp)}</div>
                                  <div className="text-xs text-white/40">{formatTime(row.timestamp)}</div>
                                </td>
                                <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                                  {bikeLabelFromType(row.type)}
                                </td>

                                <td className={metricCellClass({ isLatest, delta: dSB })}>
                                  <div className="font-semibold">{fmtNum(sb)}</div>
                                  {dSB !== null ? (
                                    <div className={`text-xs ${isLatest && isDeltaNonZero(dSB) ? "text-lime-200/90" : "text-white/45"}`}>
                                      {fmtSigned(dSB)}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-white/25">—</div>
                                  )}
                                </td>

                                <td className={metricCellClass({ isLatest, delta: d4 })}>
                                  <div className="font-semibold">{fmtNum(h4)}</div>
                                  {d4 !== null ? (
                                    <div className={`text-xs ${isLatest && isDeltaNonZero(d4) ? "text-lime-200/90" : "text-white/45"}`}>
                                      {fmtSigned(d4)}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-white/25">—</div>
                                  )}
                                </td>

                                <td className={metricCellClass({ isLatest, delta: d15 })}>
                                  <div className="font-semibold">{fmtNum(h15)}</div>
                                  {d15 !== null ? (
                                    <div className={`text-xs ${isLatest && isDeltaNonZero(d15) ? "text-lime-200/90" : "text-white/45"}`}>
                                      {fmtSigned(d15)}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-white/25">—</div>
                                  )}
                                </td>

                                <td className="px-4 py-3 text-white/70 align-top break-words">
                                  {row.location ? <span>{row.location}</span> : <span className="text-white/25">—</span>}
                                </td>
                                <td className="px-4 py-3 text-white/70 align-top break-words">
                                  {row.notes ? (
                                    <span className="text-lime-200/80 italic">“{row.notes}”</span>
                                  ) : (
                                    <span className="text-white/25">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showFull && (
              <div className="space-y-3">
                <div className="text-xs text-white/60 uppercase tracking-widest">Bike Spec</div>
                {fullRowsNewestFirst.length === 0 ? (
                  <div className="text-white/60">No bike spec entries yet.</div>
                ) : (
                  <div className="space-y-2">
                    {fullRowsNewestFirst.map((row) => {
                      const key = row.id || row.timestamp;
                      const isOpen = openFullKey === key;
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setOpenFullKey((prev) => (prev === key ? null : key))}
                          className="w-full text-left rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-black/25 transition"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-white/80 font-semibold">{formatDateTime(row.timestamp)}</div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-white/50">{row.full_spec ? "Saved ✓" : "—"}</div>
                              {isOpen ? (
                                <ChevronUp size={16} className="text-white/50" />
                              ) : (
                                <ChevronDown size={16} className="text-white/50" />
                              )}
                            </div>
                          </div>

                          {(row.notes || row.location) && (
                            <div className="mt-2 text-sm text-white/70">
                              {row.notes && <div className="text-lime-200/80 italic">“{row.notes}”</div>}
                              {row.location && <div className="text-xs text-white/40 mt-1">{row.location}</div>}
                            </div>
                          )}

                          {isOpen && (
                            <div className="mt-4">
                              {row.full_spec ? (
                                <FullSpecViewer spec={row.full_spec} />
                              ) : (
                                <div className="text-sm text-white/55">No bike spec data stored in this entry.</div>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FullSpecViewer({ spec }) {
  const normalized = normalizeFullSpec(spec);

  if (!normalized) {
    return (
      <pre className="text-xs text-white/70 bg-black/40 border border-white/10 rounded-2xl p-4 overflow-auto">
        {safeStringify(spec)}
      </pre>
    );
  }

  const sections = Object.keys(normalized);

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const sectionObj = normalized[section];
        const entries = sectionObj && typeof sectionObj === "object" ? Object.entries(sectionObj) : [];

        return (
          <div key={section} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] text-white/50 uppercase tracking-widest">{humanize(section)}</div>

            {entries.length === 0 ? (
              <div className="mt-2 text-sm text-white/55">—</div>
            ) : (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {entries.map(([key, value]) => (
                  <div key={key} className="flex items-start justify-between gap-3">
                    <div className="text-xs text-white/45 uppercase tracking-widest">{humanize(key)}</div>
                    <div className="text-sm text-white/80 text-right break-words">{formatSpecValue(value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function normalizeFullSpec(spec) {
  if (!spec || typeof spec !== "object") return null;
  if (spec.mtb && typeof spec.mtb === "object") return spec.mtb;
  return spec;
}

function formatSpecValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.trim() ? v : "—";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function safeStringify(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function humanize(str) {
  return String(str || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function rollingBaselineForIndex(rowsNewestFirst, index) {
  const older = [];
  for (let i = index + 1; i < rowsNewestFirst.length && older.length < 3; i++) {
    const r = rowsNewestFirst[i];
    const sb = toNum(r.saddle_setback);
    const h4 = toNum(r.height_4cm);
    const h15 = toNum(r.height_15cm);
    if (sb === null && h4 === null && h15 === null) continue;
    older.push({ sb, h4, h15 });
  }
  if (older.length === 0) return null;

  const avg = (key) => {
    const vals = older.map((x) => x[key]).filter((n) => n !== null);
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return +((sum / vals.length).toFixed(1));
  };

  return { sb: avg("sb"), h4: avg("h4"), h15: avg("h15") };
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function diff(a, b) {
  if (a === null || b === null) return null;
  return +((a - b).toFixed(1));
}

function fmtSigned(n) {
  if (n === null || n === undefined) return "—";
  const s = n > 0 ? `+${n}` : String(n);
  return `${s}mm`;
}

function fmtNum(n) {
  if (n === null || n === undefined) return "—";
  return `${n}mm`;
}

function bikeLabelFromType(t) {
  const x = String(t || "").toLowerCase();
  if (x === "quick_road") return "Road";
  if (x === "quick_cx") return "CX";
  return "MTB";
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
