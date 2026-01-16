import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WifiOff } from "lucide-react";
import { fetchRiders } from "../../measurements/api/measurementsApi";
import { useAuth } from "../../auth/AuthProvider.jsx";
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

export default function SettingsHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const { displayName } = useAuth();

  const [params, setParams] = useSearchParams();
  const riderParam = params.get("rider") || "";

  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(riderParam || "");

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

        // Preselect last rider for URL continuity (no UI highlight, still requires tap)
        if (!riderParam) {
          const last = getLastRider();
          if (last) setSelectedRider(last);
        }
      } catch (e) {
        toast.error(e?.message || "Failed to load riders");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goMtb(name) {
    if (!name) {
      toast.warning("Select a rider");
      return;
    }
    setLastRider(name);
    navigate(`/settings/mtb?rider=${encodeURIComponent(name)}`);
  }

  return (
    <div className="space-y-3 pb-10">
      <div className={cx(UI.card, "p-4")}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-white font-black">Choose rider</div>

          <div className="flex items-center gap-2">
            {offline ? (
              <div className={cx(UI.pillBase, UI.pillWarn)}>
                <span className="inline-flex items-center gap-2">
                  <WifiOff size={14} /> Offline
                </span>
              </div>
            ) : null}

            <div className="text-xs text-white/60 font-bold">
              {displayName ? `Mechanic: ${displayName}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Photo grid (2 cols iPhone, denser on bigger screens) */}
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
                goMtb(name);
              }}
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

                {/* Flag badge */}
                {r.flag ? (
                  <div className="absolute left-2 top-2 text-xs font-black px-2 py-1 rounded-2xl border border-white/10 bg-black/50 backdrop-blur">
                    {r.flag}
                  </div>
                ) : null}
              </div>

              <div className="p-3">
                <div className="text-white font-black truncate">{full}</div>
                <div className={cx(UI.helper, "mt-0.5 truncate")}>{name}</div>
              </div>
            </button>
          );
        })}
      </div>

      {riders.length === 0 ? <div className="text-white/60 py-6">No riders found.</div> : null}
    </div>
  );
}
