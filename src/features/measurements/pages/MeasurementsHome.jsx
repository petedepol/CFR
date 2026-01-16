import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Ruler, History, ArrowRight, WifiOff } from "lucide-react";
import { fetchRiders } from "../api/measurementsApi";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { UI } from "../../../ui/styles.js";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

const INPUT =
  "w-full rounded-2xl bg-white/[0.07] border border-white/15 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-lime-300/40 focus:border-white/25 transition";

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

function CardButton({ title, subtitle, icon: Icon, onClick, rightText, disabled, tone = "neutral" }) {
  const base =
    "w-full text-left rounded-3xl border p-5 transition active:scale-[0.995] hover:bg-white/[0.07]";

  const toneCls =
    tone === "primary"
      ? "border-lime-300/25 bg-lime-300/10 hover:bg-lime-300/15"
      : tone === "danger"
      ? "border-red-500/25 bg-red-500/10 hover:bg-red-500/15"
      : "border-white/12 bg-white/[0.05]";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(base, toneCls, disabled && "opacity-50 cursor-not-allowed")}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center shrink-0">
            <Icon size={18} className={tone === "primary" ? "text-lime-200" : "text-white/75"} />
          </div>
          <div className="min-w-0">
            <div className="text-white font-black text-lg leading-tight">{title}</div>
            <div className={cx(UI.helper, "mt-1")}>{subtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {rightText ? (
            <div className="text-xs font-black text-white/65 px-2 py-1 rounded-2xl border border-white/10 bg-white/5">
              {rightText}
            </div>
          ) : null}
          <ArrowRight size={18} className="text-white/35" />
        </div>
      </div>
    </button>
  );
}

export default function MeasurementsHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const { displayName } = useAuth();

  const [params, setParams] = useSearchParams();
  const riderParam = params.get("rider") || "";

  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(riderParam);

  const [mode, setMode] = useState("jig"); // jig | full
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  useEffect(() => {
    if (selectedRider) setParams({ rider: selectedRider }, { replace: true });
  }, [selectedRider, setParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetchRiders();
        if (!alive) return;
        setRiders(r);
      } catch (e) {
        toast.error(e?.message || "Failed to load riders");
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  const riderLabel = useMemo(() => {
    if (!selectedRider) return "Select rider";
    const r = riders.find((x) => x.name === selectedRider);
    if (!r) return selectedRider;
    return `${r.flag} ${r.fullName}`;
  }, [selectedRider, riders]);

  function go(path) {
    if (!selectedRider) {
      toast.warning("Select a rider first");
      return;
    }
    navigate(`${path}?rider=${encodeURIComponent(selectedRider)}`);
  }

  return (
    <div className="space-y-4 pb-20">
      <div className={cx(UI.card, "p-5")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-white/65 font-bold tracking-wide">Measurements</div>
            <div className="text-2xl font-black mt-1 text-white">{riderLabel}</div>
            <div className={cx(UI.helper, "mt-1")}>
              Mechanic: <span className="text-white/70 font-bold">{displayName || "—"}</span>
            </div>
          </div>

          {offline ? (
            <div className={cx(UI.pillBase, UI.pillWarn)}>
              <span className="inline-flex items-center gap-2">
                <WifiOff size={14} /> Offline
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className={cx(UI.label, "mb-2")}>Rider</div>
            <select value={selectedRider} onChange={(e) => setSelectedRider(e.target.value)} className={INPUT}>
              <option value="">-- Select Rider --</option>
              {riders.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.flag} {r.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <div className={cx(UI.label, "mb-2")}>Mode</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={mode === "jig"} onClick={() => setMode("jig")}>
                <Ruler size={14} /> Jig
              </Chip>
              <Chip active={mode === "full"} onClick={() => setMode("full")}>
                Full Spec
              </Chip>
            </div>
          </div>
        </div>
      </div>

      {mode === "jig" ? (
        <div className="space-y-3">
          <CardButton
            title="Jig Entry"
            subtitle="Fast update: SB, 4cm, 15cm + notes"
            icon={Ruler}
            onClick={() => go("/measurements/quick")}
            tone="primary"
            rightText={offline ? "queues" : ""}
            disabled={!selectedRider}
          />
          <CardButton
            title="History"
            subtitle="Track changes over time"
            icon={History}
            onClick={() => go("/measurements/history")}
            rightText={offline ? "view" : ""}
            disabled={!selectedRider}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <CardButton
            title="Full Spec"
            subtitle="Bike spec capture"
            icon={Ruler}
            onClick={() => go("/measurements/full")}
            tone="primary"
            rightText={offline ? "queues" : ""}
            disabled={!selectedRider}
          />
          <CardButton
            title="History"
            subtitle="Past saves"
            icon={History}
            onClick={() => go("/measurements/history")}
            disabled={!selectedRider}
          />
        </div>
      )}

      <div className={cx(UI.section, "p-4")}>
        <div className="text-white/70 font-bold">Tip</div>
        <div className={cx(UI.helper, "mt-1")}>Pick rider → open a module → save.</div>
      </div>
    </div>
  );
}
