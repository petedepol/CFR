import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ensureSession, fetchHistory } from "../api/measurementsApi";
import { ArrowLeft, RefreshCcw, Share2 } from "lucide-react";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const mechanic = params.get("mech") || "";
  const rider = params.get("rider") || "";

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ kind: "idle", msg: "" }); // idle|loading|err
  const [filter, setFilter] = useState("quick"); // quick|all|full

  async function load({ silent = false } = {}) {
    if (!rider) return;
    if (!silent) setStatus({ kind: "loading", msg: "" });

    try {
      await ensureSession();
      const data = await fetchHistory(rider, 160);
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

  const jigRowsNewestFirst = useMemo(() => {
    return (items || [])
      .filter((x) => (x.type || "").toLowerCase() === "quick") // DB stays "quick"
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [items]);

  const fullRowsNewestFirst = useMemo(() => {
    return (items || [])
      .filter((x) => (x.type || "").toLowerCase() === "full") // DB stays "full"
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [items]);

  const filteredJig = useMemo(() => {
    if (filter === "full") return [];
    if (filter === "all") return jigRowsNewestFirst;
    return filter === "quick" ? jigRowsNewestFirst : [];
  }, [filter, jigRowsNewestFirst]);

  const filteredFull = useMemo(() => {
    if (filter === "quick") return [];
    if (filter === "all") return fullRowsNewestFirst;
    return filter === "full" ? fullRowsNewestFirst : [];
  }, [filter, fullRowsNewestFirst]);

  async function shareLatestJig() {
    const latest = jigRowsNewestFirst[0];
    if (!latest) return;

    const sb = toNum(latest.saddle_setback);
    const h4 = toNum(latest.height_4cm);
    const h15 = toNum(latest.height_15cm);

    const base = rollingBaselineForIndex(jigRowsNewestFirst, 0);
    const dSB = base ? diff(sb, base.sb) : null;
    const d4 = base ? diff(h4, base.h4) : null;
    const d15 = base ? diff(h15, base.h15) : null;

    const text =
      `${rider} — Jig Update\n` +
      `SB: ${fmtNum(sb)}mm${dSB !== null ? ` (${fmtSigned(dSB)}mm)` : ""}\n` +
      `4cm: ${fmtNum(h4)}mm${d4 !== null ? ` (${fmtSigned(d4)}mm)` : ""}\n` +
      `15cm: ${fmtNum(h15)}mm${d15 !== null ? ` (${fmtSigned(d15)}mm)` : ""}\n` +
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
        onClick={() => navigate(`/measurements?mech=${encodeURIComponent(mechanic)}&rider=${encodeURIComponent(rider)}`)}
        className="inline-flex items-center gap-2 text-white/70 hover:text-white"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-sm text-white/60 uppercase tracking-widest">History</div>
            <div className="text-2xl font-black mt-1">{rider || "No rider selected"}</div>
            <div className="text-white/50 text-sm mt-1">Mechanic: {mechanic || "—"}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={shareLatestJig}
              className="rounded-2xl px-4 py-3 font-bold bg-lime-300 text-black hover:bg-lime-200 inline-flex items-center gap-2"
              title="Share latest jig update"
            >
              <Share2 size={16} /> Share Jig
            </button>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
            >
              <option value="quick">Jig History</option>
              <option value="all">All</option>
              <option value="full">Bike Spec</option>
            </select>

            <button
              onClick={() => load()}
              className="rounded-2xl px-4 py-3 font-bold bg-white/10 text-white hover:bg-white/15 border border-white/10 inline-flex items-center gap-2"
            >
              <RefreshCcw size={16} /> Refresh
            </button>
          </div>
        </div>

        {status.kind === "loading" ? (
          <div className="mt-6 text-white/60">Loading…</div>
        ) : status.kind === "err" ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-200 text-sm">
            {status.msg}
          </div>
        ) : filteredJig.length === 0 && filteredFull.length === 0 ? (
          <div className="mt-6 text-white/60">No entries yet.</div>
        ) : (
          <div className="mt-6 space-y-6">
            {filteredJig.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs text-white/60 uppercase tracking-widest">Jig History</div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <div className="max-h-[70vh] overflow-auto">
                    <table className="w-full text-sm table-fixed">
                      <thead className="sticky top-0 bg-black/70 backdrop-blur border-b border-white/10">
                        <tr className="text-white/60">
                          <th className="text-left font-black px-4 py-3 w-[150px] border-r border-white/10">
                            Date
                          </th>

                          <th className="text-right font-black px-3 py-3 w-[110px]">SB</th>
                          <th className="text-right font-black px-2 py-3 w-[70px] border-r border-white/10">Δ</th>

                          <th className="text-right font-black px-3 py-3 w-[110px]">4cm</th>
                          <th className="text-right font-black px-2 py-3 w-[70px] border-r border-white/10">Δ</th>

                          <th className="text-right font-black px-3 py-3 w-[110px]">15cm</th>
                          <th className="text-right font-black px-2 py-3 w-[70px] border-r border-white/10">Δ</th>

                          <th className="text-left font-black px-4 py-3 w-auto min-w-[320px]">Notes</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredJig.map((row, idx) => {
                          const base = rollingBaselineForIndex(filteredJig, idx);
                          const sb = toNum(row.saddle_setback);
                          const h4 = toNum(row.height_4cm);
                          const h15 = toNum(row.height_15cm);

                          const dSB = base ? diff(sb, base.sb) : null;
                          const d4 = base ? diff(h4, base.h4) : null;
                          const d15 = base ? diff(h15, base.h15) : null;

                          const zebra = idx % 2 === 0 ? "bg-black/15" : "bg-black/5";

                          return (
                            <tr key={row.id || `${row.timestamp}-${idx}`} className={`border-b border-white/5 ${zebra}`}>
                              <td className="px-4 py-3 text-white/70 align-top border-r border-white/10">
                                <div className="font-semibold text-white/80">{formatDateShort(row.timestamp)}</div>
                                <div className="text-xs text-white/40 mt-0.5">{formatTime(row.timestamp)}</div>
                                {row.location ? (
                                  <div className="text-xs text-white/40 mt-1">{row.location}</div>
                                ) : null}
                              </td>

                              <td className="px-3 py-3 text-right font-black text-lime-200 tabular-nums align-top">
                                {fmtNum(sb)}
                              </td>
                              <td className="px-2 py-3 text-right tabular-nums align-top border-r border-white/10">
                                {dSB !== null ? (
                                  <span className="text-red-300">{fmtSigned(dSB)}</span>
                                ) : (
                                  <span className="text-white/25">—</span>
                                )}
                              </td>

                              <td className="px-3 py-3 text-right font-black text-lime-200 tabular-nums align-top">
                                {fmtNum(h4)}
                              </td>
                              <td className="px-2 py-3 text-right tabular-nums align-top border-r border-white/10">
                                {d4 !== null ? (
                                  <span className="text-red-300">{fmtSigned(d4)}</span>
                                ) : (
                                  <span className="text-white/25">—</span>
                                )}
                              </td>

                              <td className="px-3 py-3 text-right font-black text-lime-200 tabular-nums align-top">
                                {fmtNum(h15)}
                              </td>
                              <td className="px-2 py-3 text-right tabular-nums align-top border-r border-white/10">
                                {d15 !== null ? (
                                  <span className="text-red-300">{fmtSigned(d15)}</span>
                                ) : (
                                  <span className="text-white/25">—</span>
                                )}
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

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {filteredJig.map((row) => (
                    <JigCard key={row.id || row.timestamp} row={row} jigRows={filteredJig} />
                  ))}
                </div>
              </div>
            )}

            {filteredFull.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs text-white/60 uppercase tracking-widest">Bike Spec History</div>
                <div className="space-y-2">
                  {filteredFull.map((row) => (
                    <div key={row.id || row.timestamp} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-white/80 font-semibold">{formatDateTime(row.timestamp)}</div>
                        <div className="text-xs text-white/50">{row.full_spec ? "Saved ✓" : "—"}</div>
                      </div>
                      {(row.notes || row.location) && (
                        <div className="mt-2 text-sm text-white/70">
                          {row.notes && <div className="text-lime-200/80 italic">“{row.notes}”</div>}
                          {row.location && <div className="text-xs text-white/40 mt-1">{row.location}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function JigCard({ row, jigRows }) {
  const idx = jigRows.findIndex((q) => q.id === row.id);
  const base = idx >= 0 ? rollingBaselineForIndex(jigRows, idx) : null;

  const sb = toNum(row.saddle_setback);
  const h4 = toNum(row.height_4cm);
  const h15 = toNum(row.height_15cm);

  const dSB = base ? diff(sb, base.sb) : null;
  const d4 = base ? diff(h4, base.h4) : null;
  const d15 = base ? diff(h15, base.h15) : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/50">{formatTime(row.timestamp)}</div>
        <div className="text-[11px] font-black text-lime-200/80">JIG</div>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <Line label="SB" value={sb} delta={dSB} />
        <Line label="4cm" value={h4} delta={d4} />
        <Line label="15cm" value={h15} delta={d15} />
      </div>

      {(row.notes || row.location) && (
        <div className="mt-3 text-sm text-white/70">
          {row.notes && <div className="text-lime-200/80 italic">“{row.notes}”</div>}
          {row.location && <div className="text-xs text-white/40 mt-1">{row.location}</div>}
        </div>
      )}
    </div>
  );
}

function Line({ label, value, delta }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-white/70">{label}</div>
      <div className="text-right">
        <span className="font-black text-lime-200 tabular-nums">{fmtNum(value)}</span>
        {delta !== null && <span className="ml-2 text-red-300 tabular-nums">({fmtSigned(delta)})</span>}
      </div>
    </div>
  );
}

/**
 * Baseline for a given index in a newest-first list:
 * baseline = avg of next 3 rows (older entries).
 */
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

function diff(v, b) {
  if (v === null || b === null) return null;
  return +(v - b).toFixed(1);
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtNum(v) {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function fmtSigned(n) {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n}`;
}

function formatDateShort(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
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
