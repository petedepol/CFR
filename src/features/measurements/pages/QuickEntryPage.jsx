import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ensureSession,
  fetchLatestQuick,
  insertQuick,
  fetchHistory,
  updateMeasurement,
  deleteMeasurement,
} from "../api/measurementsApi";
import { ArrowLeft, Save, WifiOff, AlertTriangle, X, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { UI } from "../../../ui/styles.js";

const WARN_THRESHOLD_MM = 4;

const INPUT =
  "w-full rounded-2xl bg-white/[0.07] border border-white/15 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-lime-300/40 focus:border-white/25 transition";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function Field({ label, unit, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-2">
        <div className={UI.label}>{label}</div>
        {unit ? (
          <div className="text-[11px] text-white/55 px-2 py-0.5 rounded-xl border border-white/10 bg-white/5">
            {unit}
          </div>
        ) : null}
      </div>
      {children}
    </label>
  );
}

export default function QuickEntryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { displayName, isAdmin } = useAuth();
  const toast = useToast();

  const mechanic = (displayName || "").trim();
  const rider = params.get("rider") || "";

  // Road/CX are rare — keep Jig workflow MTB-only.
  const bikeType = "mtb";
  const [form, setForm] = useState({
    saddleSetback: "",
    height4cm: "",
    height15cm: "",
    notes: "",
    location: "",
  });

  const [status, setStatus] = useState({ kind: "idle", msg: "" }); // idle|saving|ok|err
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);

  const [historyRows, setHistoryRows] = useState([]);
  const [historyStatus, setHistoryStatus] = useState({ kind: "loading", msg: "" }); // loading|ok|err

  // Admin edit/delete (embedded history)
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editVals, setEditVals] = useState({
    saddle_setback: "",
    height_4cm: "",
    height_15cm: "",
    location: "",
    notes: "",
  });

  const lastLoadedQuickRef = useRef(null);

  const [warnOpen, setWarnOpen] = useState(false);
  const [warnInfo, setWarnInfo] = useState(null);
  const pendingPayloadRef = useRef(null);

  const lastSaveRef = useRef({ at: 0, sig: "" });

  const canSave = useMemo(() => mechanic && rider, [mechanic, rider]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  async function loadHistory({ silent = false } = {}) {
    if (!rider) return;
    if (!silent) setHistoryStatus({ kind: "loading", msg: "" });

    try {
      await ensureSession();
      const rows = await fetchHistory(rider, 50);
      setHistoryRows(rows || []);
      if (!silent) setHistoryStatus({ kind: "ok", msg: "" });
    } catch (e) {
      if (!silent) setHistoryStatus({ kind: "err", msg: e?.message || "Failed to load history." });
    }
  }

  async function load({ silent = false } = {}) {
    if (!rider) return;
    if (!silent) setLoading(true);

    try {
      await ensureSession();
      const latest = await fetchLatestQuick(rider, bikeType);

      lastLoadedQuickRef.current = latest || null;

      if (latest) {
        setForm({
          saddleSetback: latest.saddle_setback ?? "",
          height4cm: latest.height_4cm ?? "",
          height15cm: latest.height_15cm ?? "",
          notes: latest.notes ?? "",
          location: latest.location ?? "",
        });
      }

      if (!silent) setStatus({ kind: "idle", msg: "" });

      // keep history fresh (silent)
      await loadHistory({ silent: true });
    } catch (e) {
      if (!silent) setStatus({ kind: "err", msg: e.message || "Failed to load latest jig update." });
    } finally {
      if (!silent) setLoading(false);
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
    return (historyRows || []).filter((r) => String(r?.type || "") === "quick");
  }, [historyRows]);

  function openEdit(row) {
    if (!row) return;
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

  async function doSave(payload) {
    if (!canSave) {
      setStatus({ kind: "err", msg: "No mechanic/rider found." });
      toast.error("Missing mechanic or rider");
      return;
    }
    if (status.kind === "saving") return;

    // Dedupe signature WITHOUT timestamp
    const dedupeSig = JSON.stringify({
      rider: payload.rider,
      mechanic: payload.mechanic,
      bikeType: payload.bikeType,
      saddleSetback: payload.saddleSetback,
      height4cm: payload.height4cm,
      height15cm: payload.height15cm,
      notes: payload.notes,
      location: payload.location,
    });

    const now = Date.now();
    if (lastSaveRef.current.sig === dedupeSig && now - lastSaveRef.current.at < 1500) {
      setStatus({ kind: "ok", msg: "✓ Already saved (just now)" });
      toast.success("Already saved (just now)");
      return;
    }

    setStatus({ kind: "saving", msg: "Saving…" });

    try {
      const res = await insertQuick({ ...payload, dedupeSig });

      lastSaveRef.current = { sig: dedupeSig, at: Date.now() };

      setSnapshot({
        bikeType: payload.bikeType,
        saddleSetback: payload.saddleSetback,
        height4cm: payload.height4cm,
        height15cm: payload.height15cm,
        at: new Date(),
        queued: !!res?.queued,
      });

      if (res?.queued) {
        setStatus({ kind: "ok", msg: "✓ Saved offline (queued)" });
        toast.success("Saved offline — queued to sync");
        // don’t reload; it would just re-pull old DB state and confuse
      } else {
        setStatus({ kind: "ok", msg: "✓ Saved" });
        toast.success("Saved ✓");
        await load({ silent: true });
      }
    } catch (e) {
      setStatus({ kind: "err", msg: `Save failed: ${e.message || "unknown error"}` });
      toast.error(`Save failed: ${e.message || "unknown error"}`);
    }
  }

  function computeDeviationWarning(payload) {
    const prev = lastLoadedQuickRef.current;
    if (!prev) return null;

    const prevSB = toNum(prev.saddle_setback);
    const prev4 = toNum(prev.height_4cm);
    const prev15 = toNum(prev.height_15cm);

    const nextSB = toNum(payload.saddleSetback);
    const next4 = toNum(payload.height4cm);
    const next15 = toNum(payload.height15cm);

    const diffs = [
      mkDiff("Saddle Setback", "SB", prevSB, nextSB),
      mkDiff("Height @ 4cm", "4cm", prev4, next4),
      mkDiff("Height @ 15cm", "15cm", prev15, next15),
    ].filter(Boolean);

    const flagged = diffs.filter((d) => Math.abs(d.diff) >= WARN_THRESHOLD_MM);
    if (!flagged.length) return null;

    flagged.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    return {
      prevWhen: prev.timestamp ? new Date(prev.timestamp) : null,
      flagged,
      threshold: WARN_THRESHOLD_MM,
    };
  }

  async function onSave() {
    const payload = { rider, mechanic, bikeType, ...form };

    const info = computeDeviationWarning(payload);
    if (info) {
      pendingPayloadRef.current = payload;
      setWarnInfo(info);
      setWarnOpen(true);
      return;
    }

    await doSave(payload);
  }

  async function confirmSaveAnyway() {
    const payload = pendingPayloadRef.current;
    setWarnOpen(false);
    setWarnInfo(null);
    pendingPayloadRef.current = null;
    if (payload) await doSave(payload);
  }

  function cancelWarn() {
    setWarnOpen(false);
    setWarnInfo(null);
    pendingPayloadRef.current = null;
  }

  return (
    <div className="space-y-4 pb-28">
      <button
        onClick={() => navigate("/measurements")}
        className="inline-flex items-center gap-2 text-white/75 hover:text-white transition"
        type="button"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className={cx(UI.card, "p-5")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-white/65 font-bold tracking-wide">Jig Update</div>
            <div className="text-2xl font-black mt-1 text-white">{rider || "No rider selected"}</div>
            <div className={cx(UI.helper, "mt-1")}>Mechanic: {mechanic || "—"}</div>
          </div>

          {offline ? (
            <div className={cx(UI.pillBase, UI.pillWarn)}>
              <span className="inline-flex items-center gap-2">
                <WifiOff size={14} /> Offline
              </span>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Saddle Setback" unit="mm">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={form.saddleSetback}
                onChange={(e) => setForm({ ...form, saddleSetback: e.target.value })}
                className={INPUT}
              />
            </Field>

            <Field label="Height at 4cm" unit="mm">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={form.height4cm}
                onChange={(e) => setForm({ ...form, height4cm: e.target.value })}
                className={INPUT}
              />
            </Field>

            <Field label="Height at 15cm" unit="mm">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={form.height15cm}
                onChange={(e) => setForm({ ...form, height15cm: e.target.value })}
                className={INPUT}
              />
            </Field>

            <Field label="Location" unit="optional">
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={INPUT}
                placeholder="e.g. Team truck / Hotel"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Notes" unit="optional">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={cx(INPUT, "min-h-[110px]")}
                  placeholder="Any observations / changes…"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* Embedded Jig History (same look/behavior as HistoryPage: table on desktop, cards on mobile) */}
      <div className="space-y-3">
        <div className={cx(UI.helper)}>Jig History</div>

        {historyStatus.kind === "err" ? (
          <div className="rounded-3xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-200 text-sm">
            {historyStatus.msg || "Failed to load history."}
          </div>
        ) : jigRowsNewestFirst.length === 0 ? (
          <div className="text-white/60">No jig entries yet.</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-hidden rounded-3xl border border-white/15 bg-black/30">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full text-sm table-fixed">
                  <thead className="sticky top-0 bg-black/70 backdrop-blur border-b border-white/15">
                    <tr className="text-white/60">
                      <th className="text-left font-black px-4 py-3 w-[170px] border-r border-white/15">Date</th>
                      <th className="text-left font-black px-3 py-3 w-[90px] border-r border-white/15">Bike</th>

                      <th className="text-right font-black px-3 py-3 w-[110px]">SB</th>
                      <th className="text-right font-black px-2 py-3 w-[70px] border-r border-white/15">Δ</th>

                      <th className="text-right font-black px-3 py-3 w-[110px]">4cm</th>
                      <th className="text-right font-black px-2 py-3 w-[70px] border-r border-white/15">Δ</th>

                      <th className="text-right font-black px-3 py-3 w-[110px]">15cm</th>
                      <th className="text-right font-black px-2 py-3 w-[70px] border-r border-white/15">Δ</th>

                      <th className="text-left font-black px-4 py-3 w-auto min-w-[320px]">Notes</th>

                      {isAdmin ? <th className="text-right font-black px-4 py-3 w-[130px]"> </th> : null}
                    </tr>
                  </thead>

                  <tbody>
                    {jigRowsNewestFirst.map((row, idx) => {
                      const base = rollingBaselineForIndex(jigRowsNewestFirst, idx);
                      const sb = toNum(row.saddle_setback);
                      const h4 = toNum(row.height_4cm);
                      const h15 = toNum(row.height_15cm);

                      const dSB = base ? diff(sb, base.sb) : null;
                      const d4 = base ? diff(h4, base.h4) : null;
                      const d15 = base ? diff(h15, base.h15) : null;

                      const zebra = idx % 2 === 0 ? "bg-black/15" : "bg-black/5";

                      return (
                        <tr key={row.id || `${row.timestamp}-${idx}`} className={`border-b border-white/8 ${zebra}`}>
                          <td className="px-4 py-3 text-white/70 align-top border-r border-white/15">
                            <div className="font-bold text-white/85">{formatDateShort(row.timestamp)}</div>
                            <div className="text-xs text-white/45 mt-0.5">{formatTime(row.timestamp)}</div>
                            {row.location ? <div className="text-xs text-white/45 mt-1">{row.location}</div> : null}
                            {row.mechanic ? <div className="text-xs text-white/45 mt-1">By {row.mechanic}</div> : null}
                          </td>

                          <td className="px-3 py-3 text-white/70 align-top border-r border-white/15">
                            <span className="inline-flex items-center rounded-2xl border border-white/12 bg-white/5 px-2 py-1 text-[11px] font-black text-white/70">
                              {bikeLabelFromType(row.type)}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-right font-black text-lime-200 tabular-nums align-top">{fmtNum(sb)}</td>
                          <td className="px-2 py-3 text-right tabular-nums align-top border-r border-white/15">
                            {dSB !== null ? <span className="text-red-300">{fmtSigned(dSB)}</span> : <span className="text-white/25">—</span>}
                          </td>

                          <td className="px-3 py-3 text-right font-black text-lime-200 tabular-nums align-top">{fmtNum(h4)}</td>
                          <td className="px-2 py-3 text-right tabular-nums align-top border-r border-white/15">
                            {d4 !== null ? <span className="text-red-300">{fmtSigned(d4)}</span> : <span className="text-white/25">—</span>}
                          </td>

                          <td className="px-3 py-3 text-right font-black text-lime-200 tabular-nums align-top">{fmtNum(h15)}</td>
                          <td className="px-2 py-3 text-right tabular-nums align-top border-r border-white/15">
                            {d15 !== null ? <span className="text-red-300">{fmtSigned(d15)}</span> : <span className="text-white/25">—</span>}
                          </td>

                          <td className="px-4 py-3 text-white/70 align-top break-words">
                            {row.notes ? <span className="text-lime-200/80 italic">“{row.notes}”</span> : <span className="text-white/25">—</span>}
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
              {jigRowsNewestFirst.map((row, idx) => {
                const base = rollingBaselineForIndex(jigRowsNewestFirst, idx);
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
                        {row.mechanic ? <div className={cx(UI.helper, "mt-1")}>By {row.mechanic}</div> : null}
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

      {/* Edit Modal (admin) */}
      {isAdmin && editing ? (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/70" onClick={() => (savingEdit ? null : setEditing(null))} />
          <div className={cx("absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 p-5", UI.card, "bg-black/80")}>
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
              <EditField label="SB (mm)" value={editVals.saddle_setback} onChange={(v) => setEditVals((s) => ({ ...s, saddle_setback: v }))} inputMode="decimal" />
              <EditField label="4cm (mm)" value={editVals.height_4cm} onChange={(v) => setEditVals((s) => ({ ...s, height_4cm: v }))} inputMode="decimal" />
              <EditField label="15cm (mm)" value={editVals.height_15cm} onChange={(v) => setEditVals((s) => ({ ...s, height_15cm: v }))} inputMode="decimal" />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <EditField label="Location" value={editVals.location} onChange={(v) => setEditVals((s) => ({ ...s, location: v }))} />
              <EditField label="Notes" value={editVals.notes} onChange={(v) => setEditVals((s) => ({ ...s, notes: v }))} />
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={saveEdit} disabled={savingEdit} className={cx(UI.btnPrimary, "flex-1 justify-center")} type="button">
                {savingEdit ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(null)} disabled={savingEdit} className={cx(UI.btnSecondary, "px-4 py-3")} type="button">
                Cancel
              </button>
            </div>

            <div className={cx(UI.helper, "mt-3")}>Admin edits require being online. Changes are applied immediately.</div>
          </div>
        </div>
      ) : null}

      {/* Warning modal */}
      {warnOpen && warnInfo ? (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/70" onClick={cancelWarn} />
          <div className={cx("absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 p-5", UI.card, "bg-black/80")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-2xl bg-red-500/15 border border-red-400/25 p-2">
                  <AlertTriangle className="text-red-200" size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-white">Significant change detected</div>
                  <div className={cx(UI.helper, "mt-1")}>
                    Compared to the last saved jig update
                    {warnInfo.prevWhen ? ` (${warnInfo.prevWhen.toLocaleString()})` : ""}. Threshold:{" "}
                    <span className="font-black text-white/80">{warnInfo.threshold}mm</span>.
                  </div>
                </div>
              </div>

              <button onClick={cancelWarn} className={UI.btnIcon} aria-label="Close" type="button">
                <X size={18} className="text-white/70" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-4">
              <div className="space-y-2 text-sm">
                {warnInfo.flagged.slice(0, 3).map((d) => (
                  <div key={d.key} className="flex items-center justify-between gap-3">
                    <div className="text-white/75">{d.label}</div>
                    <div className="text-right">
                      <span className="font-black text-white tabular-nums">{fmtNum(d.next)}mm</span>
                      <span className="text-white/40"> (base {fmtNum(d.prev)}mm)</span>
                      <span className="ml-2 font-black text-red-200 tabular-nums">{fmtSigned(d.diff)}mm</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-red-100/70 italic">
                If this is intentional, continue. If not, cancel and re-check the jig.
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-end">
              <button onClick={cancelWarn} className={UI.btnSecondary} type="button">
                Cancel
              </button>
              <button onClick={confirmSaveAnyway} className={cx(UI.btnPrimary, "justify-center")} type="button">
                <Save size={18} /> Save anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sticky save bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 z-30">
        <div className="rounded-3xl border border-white/12 bg-black/55 backdrop-blur-xl p-4 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              {offline ? (
                <div className="inline-flex items-center gap-2 text-xs text-white/70">
                  <WifiOff size={14} /> Offline — saves will queue
                </div>
              ) : snapshot ? (
                <div className="text-xs text-white/70">
                  <span className="text-white/85 font-black">Saved:</span>{" "}
                  <span className="font-black text-white/85 tabular-nums">
                    MTB • SB {fmt(snapshot.saddleSetback)} • 4cm {fmt(snapshot.height4cm)} • 15cm {fmt(snapshot.height15cm)}
                  </span>
                  <span className="text-white/40"> • {snapshot.at.toLocaleTimeString()}</span>
                  {snapshot.queued ? <span className="ml-2 text-yellow-200/80">• queued</span> : null}
                </div>
              ) : (
                <div className="text-xs text-white/50">Ready</div>
              )}

              {status.kind === "err" ? <div className="mt-1 text-xs text-red-200/90 truncate">{status.msg}</div> : null}
              {status.kind === "ok" ? <div className="mt-1 text-xs text-white/60 truncate">{status.msg}</div> : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={status.kind === "saving" || !canSave}
                onClick={onSave}
                className={cx(
                  "rounded-2xl px-5 py-3 font-black inline-flex items-center gap-2 transition active:scale-[0.99]",
                  status.kind === "saving" || !canSave
                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                    : "bg-lime-300 text-black hover:bg-lime-200"
                )}
                type="button"
              >
                <Save size={18} /> {status.kind === "saving" ? "Saving…" : offline ? "Save (Queue)" : "Save Jig Update"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function bikeTypeLabel(k) {
  return k === "road" ? "Road" : k === "cx" ? "CX" : "MTB";
}

function EditField({ label, value, onChange, inputMode }) {
  return (
    <label className="block">
      <div className={cx(UI.helper, "mb-2")}>{label}</div>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} inputMode={inputMode} className={INPUT} />
    </label>
  );
}

function Metric({ label, value, delta }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className={cx(UI.helper)}>{label}</div>
      <div className="mt-1 text-lime-200 font-black tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs tabular-nums">
        {delta !== null ? <span className="text-red-300">{fmtSigned(delta)}</span> : <span className="text-white/25">—</span>}
      </div>
    </div>
  );
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

function diff(v, b) {
  if (v === null || b === null) return null;
  return +(v - b).toFixed(1);
}

function bikeLabelFromType(t) {
  const x = String(t || "").toLowerCase();
  if (x === "quick_road") return "Road";
  if (x === "quick_cx") return "CX";
  return "MTB";
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

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mkDiff(label, key, prev, next) {
  if (prev === null || next === null) return null;
  const d = +(next - prev).toFixed(1);
  return { label, key, prev, next, diff: d };
}

function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
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
