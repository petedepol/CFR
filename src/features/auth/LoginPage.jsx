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
    if (!f) return "/v3";
    if (typeof f === "string") return f;
    return (f.pathname || "/v3") + (f.search || "");
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

      // Scroll to top before navigating (fixes mobile scroll position)
      window.scrollTo(0, 0);

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
    <div
      className="min-h-dvh w-full text-white flex flex-col items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #1a1a1a 0%, #0d0d0d 70%)" }}
    >
      {/* Logo */}
      <img
        src="/logos/cfr-logo-light.png"
        alt="Cannondale Factory Racing"
        className="h-12 w-auto brightness-0 invert mb-8 opacity-90"
      />

      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#1e1e1e] p-8">
          <div className="relative">
            <div className="text-[#ff6b2c] text-xs font-semibold uppercase tracking-widest">CFR Workshop</div>
            <div className="text-2xl font-bold mt-2 tracking-tight text-white">Sign in</div>
            <div className="text-[#888888] mt-2 text-sm">
              {phase === "email"
                ? "Enter your email to receive a login code."
                : "Enter the code we sent to your email."}
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block">
                <div className="text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">Email</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-xl bg-[#252525] border border-[#333333] px-4 py-3 text-white placeholder:text-[#555555] focus:outline-none focus:border-[#ff6b2c] transition-colors"
                  style={{ fontSize: "16px" }}
                  placeholder="you@team.com"
                  disabled={isLoading || phase === "otp"}
                />
              </label>

              {phase === "otp" && (
                <label className="block">
                  <div className="text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">Code</div>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full rounded-xl bg-[#252525] border border-[#333333] px-4 py-3 text-white font-mono placeholder:text-[#555555] focus:outline-none focus:border-[#ff6b2c] transition-colors"
                    style={{ fontSize: "16px" }}
                    placeholder="123456"
                    disabled={isLoading}
                  />
                </label>
              )}

              {status.kind !== "idle" && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm border ${
                    status.kind === "err"
                      ? "border-[#4a3030] bg-[#2a2020] text-[#ff6b6b]"
                      : status.kind === "ok"
                      ? "border-[#3a4a30] bg-[#202a20] text-[#6bff6b]"
                      : "border-[#333333] bg-[#252525] text-[#888888]"
                  }`}
                >
                  {status.msg}
                </div>
              )}

              <div className="flex gap-3">
                {phase === "otp" && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("email");
                      setOtp("");
                      setStatus({ kind: "idle", msg: "" });
                    }}
                    className="flex-1 rounded-xl px-4 py-3 font-semibold border border-[#333333] bg-[#252525] hover:bg-[#2a2a2a] text-white transition-colors"
                    disabled={isLoading}
                  >
                    Back
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 rounded-xl px-4 py-3 font-bold bg-[#ff6b2c] text-white hover:bg-[#ff8a50] disabled:opacity-50 transition-colors shadow-[0_4px_12px_rgba(255,107,44,0.3)]"
                  disabled={isLoading}
                >
                  {phase === "email" ? (isLoading ? "Sending…" : "Send code") : isLoading ? "Verifying…" : "Sign in"}
                </button>
              </div>

              {phase === "otp" && (
                <button
                  type="button"
                  onClick={sendOtp}
                  className="w-full rounded-xl px-4 py-3 font-semibold border border-[#333333] bg-[#252525] hover:bg-[#2a2a2a] text-[#888888] transition-colors"
                  disabled={isLoading}
                >
                  Resend code
                </button>
              )}
            </form>

            <div className="mt-6 text-xs text-[#555555] text-center">
              Internal tool • CFR
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
