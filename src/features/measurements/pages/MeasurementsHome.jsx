import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { fetchRiders } from "../api/measurementsApi";
import { useToast } from "../../../components/ToastProvider.jsx";
import { UI } from "../../../ui/styles.js";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

const LS_LAST_RIDER = "cfr_last_rider";

function getLastRider() {
  try {
    return localStorage.getItem(LS_LAST_RIDER) || "";
  } catch {
    return "";
  }
}
function setLastRider(name) {
  try {
    localStorage.setItem(LS_LAST_RIDER, name || "");
  } catch {
    // ignore
  }
}

function pickPhoto(r) {
  return (
    r?.photo ||
    r?.photoUrl ||
    r?.photo_url ||
    r?.image ||
    r?.img ||
    r?.avatar ||
    r?.avatarUrl ||
    r?.avatar_url ||
    ""
  );
}

function initials(fullName) {
  const s = String(fullName || "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export default function MeasurementsHome() {
  const navigate = useNavigate();
  const toast = useToast();

  const [params, setParams] = useSearchParams();
  const riderParam = params.get("rider") || "";

  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(riderParam || "");
  const [loadErr, setLoadErr] = useState("");

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  useEffect(() => {
    if (selectedRider) setParams({ rider: selectedRider }, { replace: true });
  }, [selectedRider, setParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchRiders();
        if (!alive) return;
        setRiders(list || []);
        setLoadErr("");

        if (!riderParam) {
          const last = getLastRider();
          if (last) setSelectedRider(last);
        }
      } catch (e) {
        const isOff = typeof navigator !== "undefined" && navigator.onLine === false;
        if (isOff) {
          setLoadErr("Offline — riders can’t load. Reconnect and reopen.");
          return;
        }
        toast.error(e?.message || "Failed to load riders");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goJig(name) {
    if (!name) return;
    if (offline) {
      toast.warning("Offline — reconnect to continue");
      return;
    }
    setLastRider(name);
    navigate(`/measurements/quick?rider=${encodeURIComponent(name)}`);
  }

  function goBike(name) {
    if (!name) return;
    if (offline) {
      toast.warning("Offline — reconnect to continue");
      return;
    }
    setLastRider(name);
    navigate(`/measurements/full?rider=${encodeURIComponent(name)}`);
  }

  return (
    <div className="pb-10">
      {/* Offline badge only (no header), matches Settings */}
      {offline ? (
        <div className="fixed top-16 right-4 z-20">
          <div className={cx(UI.pillBase, UI.pillWarn, "shadow-lg backdrop-blur")}>
            <span className="inline-flex items-center gap-2">
              <WifiOff size={14} /> Offline
            </span>
          </div>
        </div>
      ) : null}

      {/* Photo grid (same sizing as Settings) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {riders.map((r) => {
          const name = r.name;
          const full = r.fullName || r.name;
          const photo = pickPhoto(r);

          return (
            <button
              key={name}
              onClick={() => {
                setSelectedRider(name);
                goJig(name); // default action
              }}
              disabled={offline}
              className={cx(
                "rounded-3xl border overflow-hidden bg-white/[0.05] hover:bg-white/[0.08] transition active:scale-[0.99] text-left",
                "border-white/10 hover:border-white/20"
              )}
              type="button"
            >
              <div className="aspect-square w-full bg-black/30 relative">
                {photo ? (
                  <img src={photo} alt={full} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-16 w-16 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center">
                      <div className="text-white/80 font-black text-lg">{initials(full)}</div>
                    </div>
                  </div>
                )}

                {r.flag ? (
                  <div className="absolute left-2 top-2 text-xs font-black px-2 py-1 rounded-2xl border border-white/10 bg-black/50 backdrop-blur">
                    {r.flag}
                  </div>
                ) : null}

                {/* JIG / BIKE overlay (taller tap targets) */}
                <div className="absolute left-2 right-2 bottom-2">
                  <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/15 bg-black/55 backdrop-blur">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRider(name);
                        goJig(name);
                      }}
                      className="py-3 text-sm font-black text-white/90 hover:bg-white/10 transition"
                      disabled={offline}
                    >
                      JIG
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRider(name);
                        goBike(name);
                      }}
                      className="py-3 text-sm font-black text-white/90 hover:bg-white/10 transition border-l border-white/15"
                      disabled={offline}
                    >
                      BIKE
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <div className="text-white font-black truncate">{full}</div>
                <div className={cx(UI.helper, "mt-0.5 truncate")}>{name}</div>
              </div>
            </button>
          );
        })}
      </div>

      {loadErr ? <div className="text-yellow-200/80 py-6 text-sm font-bold">{loadErr}</div> : null}
      {!loadErr && riders.length === 0 ? <div className="text-white/60 py-6">No riders found.</div> : null}
    </div>
  );
}
