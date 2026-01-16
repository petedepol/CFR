import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ensureSession,
  fetchHistory,
  updateMeasurement,
  deleteMeasurement,
} from "../api/measurementsApi";
import { ArrowLeft, Share2, Pencil, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { UI } from "../../../ui/styles.js";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

const INPUT =
  "w-full rounded-2xl bg-white/[0.07] border border-white/15 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-lime-300/40 focus:border-white/25 transition";

function isQuickType(t) {
  const x = String(t || "").toLowerCase();
  return x === "quick" || x === "quick_road" || x === "quick_cx";
}

function isFullType(t) {
  const x = String(t || "").toLowerCase();
  return x === "full" || x === "full_road" || x === "full_cx";
}

function fullLabelFromType(t) {
  const x = String(t || "").toLowerCase();
  if (x === "full_road") return "Road";
  if (x === "full_cx") return "CX";
  return "MTB";
}

function quickTypeForBikeType(bikeType) {
  const k = String(bikeType || "mtb").toLowerCase();
  if (k === "road") return "quick_road";
  if (k === "cx") return "quick_cx";
  return "quick";
}

function bikeLabelFromType(t) {
  const x = String(t || "").toLowerCase();
  if (x === "quick_road") return "Road";
  if (x === "quick_cx") return "CX";
  return "MTB";
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "px-3 py-2 rounded-2xl text-xs font-black border transition inline-flex items-center gap-2 active:scale-[0.99]",
        active ? UI.tabActive : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
      )}
      type="button"
    >
      {children}
    </button>
  );
}

function Field({ label, value, onChange, inputMode }) {
  return (
    <label className="block">
      <div className={cx(UI.helper, "mb-2")}>{label}</div>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className={INPUT}
      />
    </label>
  );
}

function Metric({ label, value, delta }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className={cx(UI.helper)}>{label}</div>
      <div className="mt-1 text-lime-200 font-black tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs tabular-nums">
        {delta !== null ? (
          <span className="text-red-300">{fmtSigned(delta)}</span>
        ) : (
          <span className="text-white/25">—</span>
        )}
      </div>
    </div>
  );
}

// Baseline from 3 older entries (same filtered list)
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

// ---------- Full spec render helpers ----------

function humanizeKey(key) {
  const s = String(key || "");
  if (!s) return "";
  // snake_case -> words
  const snake = s.replace(/_/g, " ");
  // camelCase -> words
  const spaced = snake.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  // Title Case
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isEmptyValue(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return !Number.isFinite(v);
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

function normalizeFullSpec(row) {
  // Most likely field is row.full_spec (jsonb). Be defensive.
  const raw =
    row?.full_spec ??
    row?.fullSpec ??
    row?.spec ??
    row?.bike_spec ??
    row?.bikeSpec ??
    null;

  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return { Notes: raw };
    }
  }

  return raw;
}

function renderFullSpec(spec) {
  if (!spec) return <div className="text-white/60">No spec data found on this entry.</div>;

  // If it's a flat value, just stringify
  if (typeof spec !== "object" || Array.isArray(spec)) {
    return (
      <pre className="text-xs text-white/60 whitespace-pre-wrap break-words bg-black/40 border border-white/10 rounded-2xl p-3">
        {JSON.stringify(spec, null, 2)}
      </pre>
    );
  }

  // Group by top-level sections
  const sectionKeys = Object.keys(spec);
  if (sectionKeys.length === 0) {
    return <div className="text-white/60">No spec fields saved.</div>;
  }

  const sections = sectionKeys
    .map((sk) => {
      const sv = spec[sk];

      // If section is primitive, treat as a single field section
      if (sv === null || sv === undefined || typeof sv !== "object" || Array.isArray(sv)) {
        if (isEmptyValue(sv)) return null;
        return {
          title: humanizeKey(sk),
          fields: [{ label: humanizeKey(sk), value: sv }],
        };
      }

      const fieldKeys = Object.keys(sv);
      const fields = fieldKeys
        .map((fk) => {
          const fv = sv[fk];
          if (isEmptyValue(fv)) return null;
          return { label: humanizeKey(fk), value: fv };
        })
        .filter(Boolean);

      if (!fields.length) return null;
      return { title: humanizeKey(sk), fields };
    })
    .filter(Boolean);

  if (!sections.length) {
    return <div className="text-white/60">No spec fields saved.</div>;
  }

  return (
    <div className="space-y-3">
      {sections.map((sec) => (
        <div key={sec.title} className="rounded-3xl border border-white/10 bg-black/30 p-4">
          <div className="text-xs text-white/60 font-black tracking-widest uppercase mb-3">
            {sec.title}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sec.fields.map((f) => (
              <div key={`${sec.title}-${f.label}`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/50 font-bold mb-1">{f.label}</div>
                <div className="text-sm text-white/85 break-words">
                  {typeof f.value === "object"
                    ? JSON.stringify(f.value)
                    : String(f.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { displayName, isAdmin } = useAuth();

  const mechanic = (displayName || "").trim();
  const rider = params.get("rider") || "";

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ kind: "idle", msg: "" }); // idle|loading|err
  const [filter, setFilter] = useState("quick"); // quick|all|full

  // Default is MTB so Road/CX are minimal visibility
  const [jigBikeType, setJigBikeType] = useState("mtb"); // mtb|road|cx|all

  const [editing, setEditing] = useState(null); // row or null
  const [editVals, setEditVals] = useState({
    saddle_setback: "",
    height_4cm: "",
    height_15cm: "",
    location: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Full spec expand/collapse
  const [expandedFullId, setExpandedFullId] = useState(null);

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
        .filter((x) => isFullType(x.type))
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

  function openEdit(row) {
    setEditing(row);
    setEditVals({
      saddle_setback: row?.saddle_setback ?? "",
      height_4cm: row?.height_4cm ?? "",
      height_15cm: row?.height_15cm ?? "",
      location: row?.location ?? "",
      notes: row?.notes ?? "",
    });
  }

  async function saveEdit() {
    if (!editing?.id) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      alert("You are offline. Admin edits require being online.");
      return;
    }

    setSavingEdit(true);
    try {
      const patch = {
        saddle_setback: editVals.saddle_setback === "" ? null : Number(editVals.saddle_setback),
        height_4cm: editVals.height_4cm === "" ? null : Number(editVals.height_4cm),
        height_15cm: editVals.height_15cm === "" ? null : Number(editVals.height_15cm),
        location: String(editVals.location || ""),
        notes: String(editVals.notes || ""),
      };

      for (const k of ["saddle_setback", "height_4cm", "height_15cm"]) {
        if (patch[k] !== null && !Number.isFinite(patch[k])) patch[k] = null;
      }

      await updateMeasurement(editing.id, patch);
      setEditing(null);
      await load({ silent: true });
    } catch (e) {
      alert(e?.message || "Failed to save edit.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function doDelete(row) {
    if (!row?.id) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      alert("You are offline. Admin deletes require being online.");
      return;
    }
    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;

    try {
      await deleteMeasurement(row.id);
      await load({ silent: true });
    } catch (e) {
      alert(e?.message || "Failed to delete entry.");
    }
  }

  // NOTE: the full-bleed black wrapper prevents iOS Safari "white bounce" behind scroll content.
  return (
    <div className="-mx-4 px-4 space-y-4 pb-24 bg-black min-h-[100dvh]">
      <button
        onClick={() => navigate("/measurements")}
        className="inline-flex items-center gap-2 text-white/75 hover:text-white transition"
        type="button"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className={cx(UI.card, "p-5")}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-white/65 font-bold tracking-wide">History</div>
            <div className="text-2xl font-black mt-1 text-white">{rider || "No rider selected"}</div>
            <div className={cx(UI.helper, "mt-1")}>Mechanic: {mechanic || "—"}</div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            {showJig ? (
              <button
                onClick={shareLatestJig}
                className={cx(UI.btnPrimary, "px-4 py-3")}
                title="Share latest jig update"
                type="button"
              >
                <Share2 size={16} /> Share Jig
              </button>
            ) : null}

            <div className="flex flex-col">
              <div className={cx(UI.helper, "mb-2")}>View</div>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className={INPUT}>
                <option value="quick">Jig History</option>
                <option value="all">All</option>
                <option value="full">Bike Spec</option>
              </select>
            </div>

            {showJig ? (
              <div className="flex flex-col">
                <div className={cx(UI.helper, "mb-2")}>Bike</div>
                <select value={jigBikeType} onChange={(e) => setJigBikeType(e.target.value)} className={INPUT}>
                  <option value="mtb">MTB</option>
                  <option value="road">Road</option>
                  <option value="cx">CX</option>
                  <option value="all">All</option>
                </select>
              </div>
            ) : null}
          </div>
        </div>

        {status.kind === "loading" ? (
          <div className="mt-6 space-y-3">
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        ) : status.kind === "err" ? (
          <div className="mt-6 rounded-3xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-200 text-sm">
            {status.msg}
            <div className="mt-2 text-xs text-red-100/70">Tip: switch tabs and come back to trigger auto-recover.</div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* ---------------- Jig ---------------- */}
            {showJig ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className={cx(UI.helper)}>
                    Jig History {jigBikeType !== "all" ? `(${String(jigBikeType).toUpperCase()})` : "(ALL)"}
                  </div>

                  <div className="hidden md:flex items-center gap-2">
                    <Chip active={filter === "quick"} onClick={() => setFilter("quick")}>
                      Jig
                    </Chip>
                    <Chip active={filter === "all"} onClick={() => setFilter("all")}>
                      All
                    </Chip>
                    <Chip active={filter === "full"} onClick={() => setFilter("full")}>
                      Spec
                    </Chip>
                  </div>
                </div>

                {jigFilteredNewestFirst.length === 0 ? (
                  <div className="text-white/60">No jig entries for this bike type.</div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                      <div className="max-h-[70vh] overflow-auto">
                        <table className="w-full text-sm table-fixed">
                          <thead className="sticky top-0 bg-black/70 backdrop-blur border-b border-white/10">
                            <tr className="text-white/60">
                              <th className="text-left font-black px-4 py-3 w-[170px] border-r border-white/10">Date</th>
                              <th className="text-left font-black px-3 py-3 w-[90px] border-r border-white/10">Bike</th>

                              <th className="text-right font-black px-3 py-3 w-[110px]">SB</th>
                              <th className="text-right font-black px-2 py-3 w-[70px] border-r border-white/10">Δ</th>

                              <th className="text-right font-black px-3 py-3 w-[110px]">4cm</th>
                              <th className="text-right font-black px-2 py-3 w-[70px] border-r border-white/10">Δ</th>

                              <th className="text-right font-black px-3 py-3 w-[110px]">15cm</th>
                              <th className="text-right font-black px-2 py-3 w-[70px] border-r border-white/10">Δ</th>

                              <th className="text-left font-black px-4 py-3 w-auto min-w-[320px]">Notes</th>

                              {isAdmin ? <th className="text-right font-black px-4 py-3 w-[130px]"> </th> : null}
                            </tr>
                          </thead>

                          <tbody>
                            {jigFilteredNewestFirst.map((row, idx) => {
                              const base = rollingBaselineForIndex(jigFilteredNewestFirst, idx);
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
                                    <div className="font-bold text-white/85">{formatDateShort(row.timestamp)}</div>
                                    <div className="text-xs text-white/45 mt-0.5">{formatTime(row.timestamp)}</div>
                                    {row.location ? <div className="text-xs text-white/45 mt-1">{row.location}</div> : null}
                                  </td>

                                  <td className="px-3 py-3 text-white/70 align-top border-r border-white/10">
                                    <span className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-black text-white/70">
                                      {bikeLabelFromType(row.type)}
                                    </span>
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

                                  {isAdmin ? (
                                    <td className="px-4 py-3 align-top">
                                      <div className="flex justify-end gap-2">
                                        <button onClick={() => openEdit(row)} className={UI.btnIcon} title="Edit" type="button">
                                          <Pencil size={16} className="text-white/75" />
                                        </button>
                                        <button
                                          onClick={() => doDelete(row)}
                                          className={cx(UI.btnIcon, "border-red-500/25")}
                                          title="Delete"
                                          type="button"
                                        >
                                          <Trash2 size={16} className="text-red-300" />
                                        </button>
                                      </div>
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile cards (iPhone) */}
                    <div className="md:hidden space-y-2">
                      {jigFilteredNewestFirst.map((row, idx) => {
                        const base = rollingBaselineForIndex(jigFilteredNewestFirst, idx);
                        const sb = toNum(row.saddle_setback);
                        const h4 = toNum(row.height_4cm);
                        const h15 = toNum(row.height_15cm);

                        const dSB = base ? diff(sb, base.sb) : null;
                        const d4 = base ? diff(h4, base.h4) : null;
                        const d15 = base ? diff(h15, base.h15) : null;

                        return (
                          <div key={row.id || `${row.timestamp}-${idx}`} className={cx(UI.card, "p-4 bg-black/30")}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-white/85 font-black">
                                  {bikeLabelFromType(row.type)} • {formatDateTime(row.timestamp)}
                                </div>
                                {row.location ? <div className={cx(UI.helper, "mt-1")}>{row.location}</div> : null}
                              </div>

                              {isAdmin ? (
                                <div className="flex gap-2 shrink-0">
                                  <button onClick={() => openEdit(row)} className={UI.btnIcon} title="Edit" type="button">
                                    <Pencil size={16} className="text-white/75" />
                                  </button>
                                  <button
                                    onClick={() => doDelete(row)}
                                    className={cx(UI.btnIcon, "border-red-500/25")}
                                    title="Delete"
                                    type="button"
                                  >
                                    <Trash2 size={16} className="text-red-300" />
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <Metric label="SB" value={fmtNum(sb)} delta={dSB} />
                              <Metric label="4cm" value={fmtNum(h4)} delta={d4} />
                              <Metric label="15cm" value={fmtNum(h15)} delta={d15} />
                            </div>

                            {row.notes ? <div className="mt-3 text-lime-200/80 italic">“{row.notes}”</div> : null}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {/* ---------------- Full Spec ---------------- */}
            {showFull ? (
              <div className="space-y-3">
                <div className={cx(UI.helper)}>Bike Spec History</div>

                {fullRowsNewestFirst.length === 0 ? (
                  <div className="text-white/60">No bike spec entries yet.</div>
                ) : (
                  <div className="space-y-2">
                    {fullRowsNewestFirst.map((row) => {
                      const isOpen = expandedFullId === row.id;
                      const spec = normalizeFullSpec(row);

                      return (
                        <div
                          key={row.id || row.timestamp}
                          className={cx(UI.card, "p-4 bg-black/30")}
                        >
                          {/* Header row (tap to expand) */}
                          <button
                            onClick={() => setExpandedFullId((prev) => (prev === row.id ? null : row.id))}
                            className="w-full text-left"
                            type="button"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-white/85 font-bold">{formatDateTime(row.timestamp)}</div>
                                  <span className={cx(UI.pillBase, "bg-white/5 border-white/10 text-white/65")}>{fullLabelFromType(row.type)}</span>
                                </div>
                                {(row.location || row.notes) ? (
                                  <div className="mt-1 text-sm text-white/70">
                                    {row.notes ? <div className="text-lime-200/80 italic">“{row.notes}”</div> : null}
                                    {row.location ? <div className={cx(UI.helper, "mt-1")}>{row.location}</div> : null}
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className={cx(UI.pillBase, "bg-white/5 border-white/10 text-white/65")}>
                                  {isOpen ? (
                                    <span className="inline-flex items-center gap-2">
                                      <ChevronUp size={14} /> Hide
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-2">
                                      <ChevronDown size={14} /> View
                                    </span>
                                  )}
                                </div>

                                {isAdmin && row.id ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      doDelete(row);
                                    }}
                                    className={cx(UI.btnIcon, "border-red-500/25")}
                                    title="Delete"
                                    type="button"
                                  >
                                    <Trash2 size={16} className="text-red-300" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </button>

                          {/* Expanded content */}
                          {isOpen ? (
                            <div className="mt-4">
                              {renderFullSpec(spec)}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Edit Modal */}
        {isAdmin && editing ? (
          <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/70" onClick={() => (savingEdit ? null : setEditing(null))} />
            <div
              className={cx(
                "absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 p-5",
                UI.card,
                "bg-black/80"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white font-black text-lg">Edit Entry</div>
                  <div className={cx(UI.helper, "mt-1")}>{formatDateTime(editing.timestamp)}</div>
                </div>

                <button onClick={() => (savingEdit ? null : setEditing(null))} className={UI.btnIcon} title="Close" type="button">
                  <X size={18} className="text-white/80" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field
                  label="SB (mm)"
                  value={editVals.saddle_setback}
                  onChange={(v) => setEditVals((s) => ({ ...s, saddle_setback: v }))}
                  inputMode="decimal"
                />
                <Field
                  label="4cm (mm)"
                  value={editVals.height_4cm}
                  onChange={(v) => setEditVals((s) => ({ ...s, height_4cm: v }))}
                  inputMode="decimal"
                />
                <Field
                  label="15cm (mm)"
                  value={editVals.height_15cm}
                  onChange={(v) => setEditVals((s) => ({ ...s, height_15cm: v }))}
                  inputMode="decimal"
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <Field
                  label="Location"
                  value={editVals.location}
                  onChange={(v) => setEditVals((s) => ({ ...s, location: v }))}
                />
                <Field
                  label="Notes"
                  value={editVals.notes}
                  onChange={(v) => setEditVals((s) => ({ ...s, notes: v }))}
                />
              </div>

              <div className="mt-5 flex gap-2">
                <button onClick={saveEdit} disabled={savingEdit} className={cx(UI.btnPrimary, "flex-1 justify-center")} type="button">
                  {savingEdit ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  disabled={savingEdit}
                  className={cx(UI.btnSecondary, "px-4 py-3")}
                  type="button"
                >
                  Cancel
                </button>
              </div>

              <div className={cx(UI.helper, "mt-3")}>Admin edits require being online. Changes are applied immediately.</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
