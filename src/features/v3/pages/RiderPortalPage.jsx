// RiderPortalPage.jsx - Dedicated read-only portal for riders
// Shows own data across all sections: Setup, Jig, Spec, Neo, Service

import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  LogOut,
  Gauge,
  Ruler,
  FileText,
  Zap,
  Wrench,
  ChevronDown,
  ChevronRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { fetchLatestMtbSettings, fetchMtbSettingsHistory } from "../../settings/api/settingsApi.js";
import { fetchLatestQuick, fetchLatestFull } from "../../measurements/api/measurementsApi.js";
import { fetchNeoSettingsByRider } from "../api/neoSettingsApi.js";
import { fetchServiceHistory } from "../../service/api/serviceApi.js";
import { supabase } from "../../../lib/supabaseClient.js";

// Rider photo lookup
const RIDER_PHOTOS = {
  Ana: "/riders/ana.png",
  Charlie: "/riders/charlie.png",
  Cole: "/riders/cole.png",
  Luca: "/riders/luca.png",
  Jolanda: "/riders/jolanda.png",
};

const BIKE_TYPES = [
  { id: "race", label: "Race" },
  { id: "training", label: "Training" },
  { id: "ebike", label: "E-Bike" },
  { id: "road", label: "Road" },
  { id: "cx", label: "CX" },
];

const TABS = [
  { id: "setup", label: "Setup", icon: Gauge },
  { id: "jig", label: "Jig", icon: Ruler },
  { id: "spec", label: "Spec", icon: FileText },
  { id: "neo", label: "Neo", icon: Zap },
  { id: "service", label: "Service", icon: Wrench },
];

const spring = { type: "spring", stiffness: 400, damping: 30 };

// ─── Utility ────────────────────────────────────────────────────────────────

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function labelize(key) {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Section Components ─────────────────────────────────────────────────────

function CollapsibleCard({ title, icon: Icon, defaultOpen = false, children, count }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl overflow-hidden border border-glass-border ring-1 ring-glass-border/40 shadow-[0_8px_24px_rgba(0,0,0,0.30)]"
      style={{
        background: "rgba(24,44,41,0.72)",
        backdropFilter: "blur(12px) saturate(150%)",
        WebkitBackdropFilter: "blur(12px) saturate(150%)",
        borderLeft: open ? "3px solid var(--brand-orange)" : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 active:bg-overlay-hover"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-brand-orange" />}
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-brand-orange">
            {title}
          </span>
          {count != null && (
            <span className="text-[10px] font-medium text-text-muted bg-overlay-hover px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={spring}>
          <ChevronDown size={14} className={open ? "text-brand-orange" : "text-text-muted"} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-0.5">
              <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.05)]">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DataRow({ label, value }) {
  const display = value != null && String(value).trim() !== "" ? String(value) : "—";
  return (
    <div className="flex items-baseline justify-between py-1 border-b border-glass-border/20 last:border-0">
      <span className="text-[11px] text-text-muted font-medium">{label}</span>
      <span className="text-[13px] text-text-primary font-semibold tabular-nums">{display}</span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="py-8 flex justify-center">
      <div className="w-6 h-6 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
    </div>
  );
}

// ─── Setup Tab ──────────────────────────────────────────────────────────────

function SetupTab({ rider }) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState(new Set());

  const toggleHistoryExpand = (id) => {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchLatestMtbSettings(rider),
      fetchMtbSettingsHistory(rider, 10),
    ])
      .then(([lat, hist]) => {
        if (!alive) return;
        setLatest(lat);
        setHistory(hist);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [rider]);

  if (loading) return <LoadingSpinner />;
  if (!latest) return <EmptyState message="No setup data yet" />;

  const spec = latest.full_spec || {};
  const setup = spec.setup || {};
  const eventCtx = spec.event_context || "";

  const SETUP_FIELDS = [
    ["front_tyre", "Front Tyre"],
    ["rear_tyre", "Rear Tyre"],
    ["front_pressure", "Front Pressure"],
    ["rear_pressure", "Rear Pressure"],
    ["fork_pressure", "Fork Pressure"],
    ["shock_pressure", "Shock Pressure"],
    ["fork_rebound", "Fork Rebound"],
    ["shock_rebound", "Shock Rebound"],
    ["front_insert", "Front Insert"],
    ["rear_insert", "Rear Insert"],
    ["fork_spacers", "Fork Spacers"],
    ["shock_spacers", "Shock Spacers"],
    ["fork_compression", "Fork Compression"],
    ["shock_compression", "Shock Compression"],
    ["chainring", "Chainring"],
    ["cassette", "Cassette"],
    ["wheelset", "Wheelset"],
  ];

  // Pressure fields shown in collapsed summary tiles
  const PRESSURE_FIELDS = [
    ["front_pressure", "F Press"],
    ["rear_pressure", "R Press"],
    ["fork_pressure", "Fork"],
    ["shock_pressure", "Shock"],
  ];

  // Extra fields revealed on expand (everything except pressures)
  const EXPANDED_FIELDS = SETUP_FIELDS.filter(
    ([key]) => !["front_pressure", "rear_pressure", "fork_pressure", "shock_pressure"].includes(key)
  );

  // Filter to only show fields that have values
  const filledFields = SETUP_FIELDS.filter(([key]) => {
    const val = setup[key];
    return val != null && String(val).trim() !== "";
  });

  return (
    <div className="space-y-4">
      {/* Current Setup */}
      <CollapsibleCard title="Current Setup" icon={Gauge} defaultOpen>
        {eventCtx && (
          <div className="pb-2 mb-2 border-b border-glass-border/30">
            <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted">Event</span>
            <p className="text-sm text-brand-orange font-semibold mt-0.5">{eventCtx}</p>
          </div>
        )}
        {filledFields.length > 0 ? (
          filledFields.map(([key, label]) => (
            <DataRow key={key} label={label} value={setup[key]} />
          ))
        ) : (
          <p className="text-sm text-text-muted py-2">No setup values recorded</p>
        )}
        {setup.notes && (
          <div className="mt-3 pt-2 border-t border-glass-border/30">
            <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted">Notes</span>
            <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{setup.notes}</p>
          </div>
        )}
        <div className="mt-3 pt-2 border-t border-glass-border/30">
          <span className="text-[10px] text-text-muted">
            Last updated {formatTimestamp(latest.timestamp)} by {latest.mechanic || "—"}
          </span>
        </div>
      </CollapsibleCard>

      {/* Recent History — expandable entries */}
      {history.length > 1 && (
        <CollapsibleCard title="Recent History" count={history.length - 1}>
          <div className="space-y-2.5">
            {history.slice(1, 6).map((entry) => {
              const s = entry.full_spec?.setup || {};
              const ctx = entry.full_spec?.event_context || "";
              const isRace = entry.full_spec?.is_race;
              const isExpanded = expandedHistoryIds.has(entry.id);

              // Pressure tiles with values
              const pressureTiles = PRESSURE_FIELDS.filter(([key]) => {
                const val = s[key];
                return val != null && String(val).trim() !== "";
              });

              // Expanded fields with values
              const expandedFields = EXPANDED_FIELDS.filter(([key]) => {
                const val = s[key];
                return val != null && String(val).trim() !== "";
              });

              return (
                <div key={entry.id} className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-glass-border/15 overflow-hidden">
                  {/* Collapsed header — always visible, tappable */}
                  <button
                    type="button"
                    onClick={() => toggleHistoryExpand(entry.id)}
                    className="w-full text-left py-2.5 px-3 flex items-start gap-2 active:bg-overlay-hover"
                  >
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={spring}
                      className="mt-0.5 flex-shrink-0"
                    >
                      <ChevronRight size={14} className={isExpanded ? "text-brand-orange" : "text-text-muted"} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-text-primary font-medium">{formatTimestamp(entry.timestamp)}</span>
                        {isRace && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">
                            Race
                          </span>
                        )}
                        {ctx && (
                          <span className="text-[9px] font-medium text-text-secondary bg-overlay-hover px-1.5 py-0.5 rounded truncate">
                            {ctx}
                          </span>
                        )}
                      </div>
                      {/* 2x2 pressure summary tiles */}
                      {pressureTiles.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {pressureTiles.map(([key, label]) => (
                            <div key={key} className="bg-[rgba(255,255,255,0.05)] rounded-md px-2 py-1.5 border border-glass-border/10">
                              <span className="text-[9px] text-text-muted block">{label}</span>
                              <span className="text-sm text-text-primary font-semibold tabular-nums">{s[key]}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={spring}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 ml-5 border-t border-glass-border/15">
                          {/* Remaining setup fields as tiles */}
                          {expandedFields.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5 mt-2 mb-2">
                              {expandedFields.map(([key, label]) => (
                                <div key={key} className="bg-[rgba(255,255,255,0.05)] rounded-md px-2 py-1.5 border border-glass-border/10">
                                  <span className="text-[9px] text-text-muted block">{label}</span>
                                  <span className="text-sm text-text-primary font-semibold tabular-nums">{s[key]}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {s.notes && (
                            <div className="mb-2">
                              <span className="text-[9px] uppercase tracking-[0.15em] text-text-muted">Notes</span>
                              <p className="text-xs text-text-secondary mt-0.5 whitespace-pre-wrap">{s.notes}</p>
                            </div>
                          )}
                          <span className="text-[10px] text-text-muted">
                            by {entry.mechanic || "—"}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </CollapsibleCard>
      )}
    </div>
  );
}

// ─── Jig Tab ────────────────────────────────────────────────────────────────

function JigTab({ rider }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const bikeTypes = ["race", "training", "ebike", "road", "cx"];
    Promise.all(bikeTypes.map((bt) => fetchLatestQuick(rider, bt).then((d) => [bt, d])))
      .then((results) => {
        if (!alive) return;
        const map = {};
        for (const [bt, d] of results) {
          if (d) map[bt] = d;
        }
        setData(map);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [rider]);

  if (loading) return <LoadingSpinner />;

  const bikes = Object.entries(data);
  if (bikes.length === 0) return <EmptyState message="No jig measurements yet" />;

  return (
    <div className="space-y-4">
      {bikes.map(([bikeType, entry]) => {
        const bikeLabel = BIKE_TYPES.find((b) => b.id === bikeType)?.label || bikeType;
        return (
          <CollapsibleCard key={bikeType} title={bikeLabel} icon={Ruler} defaultOpen={bikeType === "race"}>
            <DataRow label="Saddle Setback" value={entry.saddle_setback != null ? `${entry.saddle_setback} mm` : null} />
            <DataRow label="Height @4cm" value={entry.height_4cm != null ? `${entry.height_4cm} mm` : null} />
            <DataRow label="Height @15cm" value={entry.height_15cm != null ? `${entry.height_15cm} mm` : null} />
            {entry.location && <DataRow label="Location" value={entry.location} />}
            {entry.notes && (
              <div className="mt-2 pt-2 border-t border-glass-border/30">
                <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted">Notes</span>
                <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{entry.notes}</p>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-glass-border/30">
              <span className="text-[10px] text-text-muted">
                {formatTimestamp(entry.timestamp)} by {entry.mechanic || "—"}
              </span>
            </div>
          </CollapsibleCard>
        );
      })}
    </div>
  );
}

// ─── Spec Tab ───────────────────────────────────────────────────────────────

const SPEC_SECTION_LABELS = {
  frame: "Frame",
  cockpit: "Cockpit",
  drivetrain: "Drivetrain",
  brakes: "Brakes",
  suspension: "Suspension",
  other: "Other",
};

const SPEC_FIELD_LABELS = {
  size: "Size",
  link: "Link",
  chain_guard: "Chain guard",
  notes: "Notes",
  saddle: "Saddle",
  stem: "Stem",
  spacers_under: "Spacers under",
  bars: "Bars",
  grips: "Grips",
  dropper: "Dropper",
  dropper_lever: "Dropper lever",
  lockout_lever: "Lockout lever",
  distance_to_brake_lever: "Brake lever dist.",
  distance_to_dropper_lever: "Dropper lever dist.",
  i_spec_adapter_hole: "I-Spec hole",
  garmin_mount: "Garmin mount",
  crank_set: "Crank-set",
  pedals: "Pedals",
  pedal_clicks: "Pedal clicks",
  levers: "Levers",
  calipers: "Calipers",
  pads: "Pads",
  shock_and_tune: "Shock + tune",
  fork_and_tune: "Fork + tune",
  bottle_cage: "Bottle cage",
  other_info: "Other info",
};

function SpecTab({ rider }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const bikeTypes = ["race", "training", "ebike", "road", "cx"];
    Promise.all(bikeTypes.map((bt) => fetchLatestFull(rider, bt).then((d) => [bt, d])))
      .then((results) => {
        if (!alive) return;
        const map = {};
        for (const [bt, d] of results) {
          if (d) map[bt] = d;
        }
        setData(map);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [rider]);

  if (loading) return <LoadingSpinner />;

  const bikes = Object.entries(data);
  if (bikes.length === 0) return <EmptyState message="No bike specs yet" />;

  return (
    <div className="space-y-4">
      {bikes.map(([bikeType, entry]) => {
        const bikeLabel = BIKE_TYPES.find((b) => b.id === bikeType)?.label || bikeType;
        // Normalize the spec - it may be nested under .mtb or direct
        let spec = entry.full_spec;
        if (spec?.mtb && typeof spec.mtb === "object") spec = spec.mtb;

        if (!spec || typeof spec !== "object") return null;

        // Collect all sections that have at least one non-empty field
        const sections = Object.entries(SPEC_SECTION_LABELS)
          .map(([sectionKey, sectionLabel]) => {
            const sectionData = spec[sectionKey];
            if (!sectionData || typeof sectionData !== "object") return null;

            const fields = Object.entries(sectionData).filter(
              ([, val]) => val != null && String(val).trim() !== ""
            );
            if (fields.length === 0) return null;

            return { sectionKey, sectionLabel, fields };
          })
          .filter(Boolean);

        if (sections.length === 0) return null;

        return (
          <CollapsibleCard key={bikeType} title={bikeLabel} icon={FileText} defaultOpen={bikeType === "race"}>
            <div className="space-y-3">
              {sections.map(({ sectionKey, sectionLabel, fields }) => (
                <div key={sectionKey}>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-brand-orange font-semibold mb-1.5">
                    {sectionLabel}
                  </p>
                  {fields.map(([fieldKey, val]) => (
                    <DataRow
                      key={fieldKey}
                      label={SPEC_FIELD_LABELS[fieldKey] || labelize(fieldKey)}
                      value={val}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-glass-border/30">
              <span className="text-[10px] text-text-muted">
                {formatTimestamp(entry.timestamp)} by {entry.mechanic || "—"}
              </span>
            </div>
          </CollapsibleCard>
        );
      })}
    </div>
  );
}

// ─── Neo Tab ────────────────────────────────────────────────────────────────

function NeoTab({ rider }) {
  const [tunes, setTunes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchNeoSettingsByRider(rider)
      .then((data) => alive && setTunes(data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [rider]);

  if (loading) return <LoadingSpinner />;
  if (tunes.length === 0) return <EmptyState message="No Neo tunes yet" />;

  return (
    <div className="space-y-4">
      {tunes.map((tune) => {
        const spec = tune.full_spec || {};
        return (
          <CollapsibleCard
            key={tune.id}
            title={spec.tune_name || "Unnamed Tune"}
            icon={Zap}
            defaultOpen={tunes.indexOf(tune) === 0}
          >
            {spec.bike_type && <DataRow label="Bike" value={spec.bike_type} />}
            {spec.notes && (
              <div className="mt-2">
                <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted">Notes</span>
                <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{spec.notes}</p>
              </div>
            )}
            {spec.image_url && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setExpandedImage(spec.image_url)}
                  className="w-full rounded-xl overflow-hidden border border-glass-border/30"
                >
                  <img
                    src={spec.image_url}
                    alt={spec.tune_name || "Neo tune"}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </button>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-glass-border/30">
              <span className="text-[10px] text-text-muted">
                {formatTimestamp(tune.timestamp)} by {tune.mechanic || "—"}
              </span>
            </div>
          </CollapsibleCard>
        );
      })}

      {/* Fullscreen image overlay */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={expandedImage}
              alt="Neo tune fullscreen"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Service Tab ────────────────────────────────────────────────────────────

function ServiceTab({ rider }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchServiceHistory(rider, { limit: 20 })
      .then((hist) => alive && setHistory(hist))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [rider]);

  if (loading) return <LoadingSpinner />;
  if (history.length === 0) return <EmptyState message="No service records yet" />;

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Recent Service" icon={Wrench} count={history.length} defaultOpen>
        <div className="space-y-3">
          {history.map((entry) => (
            <div key={entry.id} className="pb-3 border-b border-glass-border/20 last:border-0 last:pb-0">
              <span className="text-xs font-semibold text-text-primary">{entry.item}</span>
              <div className="flex items-center gap-2 text-[10px] text-text-muted mt-0.5">
                <span>{entry.category}</span>
                <span>&middot;</span>
                <span>{entry.bike_type}</span>
                <span>&middot;</span>
                <span>{formatTimestamp(entry.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ─── Main Portal Page ───────────────────────────────────────────────────────

export default function RiderPortalPage() {
  const navigate = useNavigate();
  const { isDark } = useOutletContext();
  const { riderName, displayName, email, isRider } = useAuth();

  const rider = riderName || displayName || "";
  const riderPhoto = RIDER_PHOTOS[rider] || null;

  const [activeTab, setActiveTab] = useState("setup");
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  // Redirect non-riders away
  useEffect(() => {
    if (!isRider) {
      navigate("/v3", { replace: true });
    }
  }, [isRider, navigate]);

  if (!rider) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--bg-app)" }}>
        <p className="text-text-muted text-sm">No rider profile found for your account.</p>
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const pageBackground = "radial-gradient(ellipse at 50% 30%, var(--bg-app) 0%, #0d0d0d 70%)";

  return (
    <div className="min-h-dvh font-sans selection:bg-brand-orange/30" style={{ background: pageBackground }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-app-surface/80 border-b border-glass-border">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center gap-3">
          {/* Rider photo */}
          <div className="relative w-11 h-11 rounded-full overflow-hidden ring-1 ring-brand-orange/30 flex-shrink-0 bg-app-surface">
            {riderPhoto ? (
              <img src={riderPhoto} alt={rider} className="w-full h-full object-cover object-[center_35%]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-orange/20">
                <span className="text-base font-bold text-brand-orange">{rider[0]}</span>
              </div>
            )}
            {/* Online indicator */}
            <div
              className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-app-surface ${
                online ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-text-primary truncate">{rider}</h1>
            <p className="text-[10px] text-text-muted truncate uppercase tracking-[0.1em]">Cannondale Factory Racing</p>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-overlay-hover transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="sticky top-[65px] z-30 backdrop-blur-xl bg-app-surface/60 border-b border-glass-border">
        <div className="max-w-lg mx-auto px-2 flex">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors
                  ${isActive ? "text-brand-orange" : "text-text-muted"}
                `}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[9px] font-semibold uppercase tracking-wider">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="rider-tab-pill"
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-brand-orange"
                    transition={spring}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-5 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "setup" && <SetupTab rider={rider} />}
            {activeTab === "jig" && <JigTab rider={rider} />}
            {activeTab === "spec" && <SpecTab rider={rider} />}
            {activeTab === "neo" && <NeoTab rider={rider} />}
            {activeTab === "service" && <ServiceTab rider={rider} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
