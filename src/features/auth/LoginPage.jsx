import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = useMemo(() => location.state?.from?.pathname || "/measurements", [location.state]);

  const [email, setEmail] = useState(localStorage.getItem("cfr_login_email") || "");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState("email"); // email | otp
  const [status, setStatus] = useState({ kind: "idle", msg: "" }); // idle|loading|ok|err

  async function sendOtp() {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setStatus({ kind: "err", msg: "Enter a valid email address." });
      return;
    }

    setStatus({ kind: "loading", msg: "Sending code…" });
    try {
      localStorage.setItem("cfr_login_email", clean);
      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;

      setPhase("otp");
      setStatus({ kind: "ok", msg: "Code sent. Check your email." });
    } catch (e) {
      setStatus({ kind: "err", msg: e?.message || "Failed to send code." });
    }
  }

  async function verifyOtp() {
    const clean = (localStorage.getItem("cfr_login_email") || email).trim().toLowerCase();
    const code = otp.trim();

    if (code.length < 4) {
      setStatus({ kind: "err", msg: "Enter the code from your email." });
      return;
    }

    setStatus({ kind: "loading", msg: "Signing in…" });
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: clean,
        token: code,
        type: "email",
      });
      if (error) throw error;

      setStatus({ kind: "ok", msg: "Signed in ✓" });
      navigate(from, { replace: true });
    } catch (e) {
      setStatus({ kind: "err", msg: e?.message || "Invalid code." });
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-xl px-4 py-10">
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
              Use your team email. We’ll send a one-time code.
            </div>

            <div className="mt-8 space-y-4">
              {phase === "email" ? (
                <>
                  <label className="block">
                    <div className="text-xs text-white/50 uppercase tracking-widest mb-2">Email</div>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@team.com"
                      className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
                    />
                  </label>

                  <button
                    onClick={sendOtp}
                    disabled={status.kind === "loading"}
                    className={`w-full rounded-2xl px-4 py-4 font-black transition ${
                      status.kind === "loading"
                        ? "bg-white/10 text-white/30 cursor-not-allowed"
                        : "bg-lime-300 text-black hover:bg-lime-200"
                    }`}
                  >
                    {status.kind === "loading" ? "Sending…" : "Send code"}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-xs text-white/60">
                    Code sent to:{" "}
                    <span className="font-black text-white/80">
                      {(localStorage.getItem("cfr_login_email") || email).trim().toLowerCase()}
                    </span>
                  </div>

                  <label className="block">
                    <div className="text-xs text-white/50 uppercase tracking-widest mb-2">One-time code</div>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      inputMode="numeric"
                      className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
                    />
                  </label>

                  <button
                    onClick={verifyOtp}
                    disabled={status.kind === "loading"}
                    className={`w-full rounded-2xl px-4 py-4 font-black transition ${
                      status.kind === "loading"
                        ? "bg-white/10 text-white/30 cursor-not-allowed"
                        : "bg-lime-300 text-black hover:bg-lime-200"
                    }`}
                  >
                    {status.kind === "loading" ? "Signing in…" : "Verify & continue"}
                  </button>

                  <button
                    onClick={() => {
                      setPhase("email");
                      setOtp("");
                      setStatus({ kind: "idle", msg: "" });
                    }}
                    className="w-full rounded-2xl px-4 py-3 font-bold bg-white/10 text-white hover:bg-white/15 border border-white/10"
                  >
                    Use a different email
                  </button>
                </>
              )}

              {status.kind === "err" && (
                <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-200 text-sm">
                  {status.msg}
                </div>
              )}
              {status.kind === "ok" && (
                <div className="rounded-2xl border border-lime-300/30 bg-lime-300/10 px-4 py-3 text-lime-200 text-sm">
                  {status.msg}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-white/35 mt-6">
          Internal team tool • CFR
        </div>
      </div>
    </div>
  );
}
