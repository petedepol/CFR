import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Robust "return to previous page" support.
  // RequireAuth currently sets: state={{ from: loc.pathname + loc.search }} (a string).
  // This also supports object-shape { pathname, search } just in case.
  const from = useMemo(() => {
    const f = location.state?.from;
    if (!f) return "/measurements";
    if (typeof f === "string") return f;
    return (f.pathname || "/measurements") + (f.search || "");
  }, [location.state]);

  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem("cfr_login_email") || "";
    } catch {
      return "";
    }
  });
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState("email"); // email | otp
  const [status, setStatus] = useState({ kind: "idle", msg: "" }); // idle|loading|ok|err

  async function sendOtp() {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      setStatus({ kind: "err", msg: "Enter your email." });
      return;
    }

    setStatus({ kind: "loading", msg: "Sending code…" });

    try {
      try {
        localStorage.setItem("cfr_login_email", clean);
      } catch {
        // ignore
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: {
          // You are using "email + code" flow, not magic-link redirect
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setPhase("otp");
      setStatus({ kind: "ok", msg: "Code sent. Check your email." });
    } catch (e) {
      setStatus({
        kind: "err",
        msg: e?.message || "Failed to send code.",
      });
    }
  }

  async function verifyOtp() {
    const clean = email.trim().toLowerCase();
    const code = otp.trim();

    if (!clean) {
      setStatus({ kind: "err", msg: "Enter your email." });
      return;
    }
    if (!code) {
      setStatus({ kind: "err", msg: "Enter the code from your email." });
      return;
    }

    setStatus({ kind: "loading", msg: "Verifying…" });

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: clean,
        token: code,
        type: "email",
      });

      if (error) throw error;

      setStatus({ kind: "ok", msg: "Signed in ✓" });

      // Go back to where user was trying to go
      navigate(from, { replace: true });
    } catch (e) {
      setStatus({
        kind: "err",
        msg: e?.message || "Invalid code. Try again.",
      });
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    if (phase === "email") sendOtp();
    else verifyOtp();
  }

  const isLoading = status.kind === "loading";

  return (
    <div className="min-h-screen w-full bg-[#070A0F] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8">
          {/* subtle watermark */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
            <div className="absolute -rotate-12 top-10 left-[-20%] text-[120px] font-black tracking-tight select-none">
              CANNONDALE
            </div>
            <div className="absolute rotate-6 bottom-6 right-[-10%] text-[90px] font-black tracking-tight select-none">
              CFR
            </div>
          </div>

          <div className="relative">
            <div className="text-sm text-white/60 uppercase tracking-widest">CFR Workshop</div>
            <div className="text-3xl font-black mt-2 tracking-tight">Sign in</div>
            <div className="text-white/50 mt-2">
              {phase === "email"
                ? "Enter your email to receive a login code."
                : "Enter the code we sent to your email."}
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <div className="text-xs text-white/60 uppercase tracking-widest mb-2">Email</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
                  placeholder="you@team.com"
                  disabled={isLoading || phase === "otp"}
                />
              </label>

              {phase === "otp" && (
                <label className="block">
                  <div className="text-xs text-white/60 uppercase tracking-widest mb-2">Code</div>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
                    placeholder="123456"
                    disabled={isLoading}
                  />
                </label>
              )}

              {status.kind !== "idle" && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm border ${
                    status.kind === "err"
                      ? "border-red-400/30 bg-red-400/10 text-red-200"
                      : status.kind === "ok"
                      ? "border-lime-300/30 bg-lime-300/10 text-lime-200"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {status.msg}
                </div>
              )}

              <div className="flex gap-2">
                {phase === "otp" && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("email");
                      setOtp("");
                      setStatus({ kind: "idle", msg: "" });
                    }}
                    className="flex-1 rounded-2xl px-4 py-3 font-black border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                    disabled={isLoading}
                  >
                    Back
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 rounded-2xl px-4 py-3 font-black bg-lime-300 text-black hover:bg-lime-200 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {phase === "email" ? (isLoading ? "Sending…" : "Send code") : isLoading ? "Verifying…" : "Sign in"}
                </button>
              </div>

              {phase === "otp" && (
                <button
                  type="button"
                  onClick={sendOtp}
                  className="w-full rounded-2xl px-4 py-3 font-black border border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  disabled={isLoading}
                >
                  Resend code
                </button>
              )}
            </form>

            <div className="mt-6 text-xs text-white/40">
              Internal tool • CFR
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
