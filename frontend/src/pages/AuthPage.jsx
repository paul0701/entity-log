import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, errorText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const digits = (n) => (v) => v.replace(/\D/g, "").slice(0, n);
const TITLES = { login: "Enter the Fog", register: "Join the Trial", forgot: "Forgot PIN", reset: "Set a new PIN" };
const CTA = { login: "Sign in", register: "Create account", forgot: "Send reset code", reset: "Update PIN" };

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useAuth();
  const nav = useNavigate();

  const go = (m) => { setMode(m); setError(""); };
  const run = async (fn) => {
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  const submit = (e) => {
    e.preventDefault();
    if (mode === "forgot") return run(async () => {
      const r = await api.post("/auth/forgot-pin", { email });
      toast.success(r.data.message); setPin(""); setCode(""); setMode("reset");
    });
    if (mode === "reset") return run(async () => {
      const r = await api.post("/auth/reset-pin", { email, code, new_pin: pin });
      setUser(r.data); toast.success("PIN updated"); nav("/log");
    });
    return run(async () => {
      const r = await api.post(mode === "login" ? "/auth/login" : "/auth/register", { email, pin });
      setUser(r.data); nav("/log");
    });
  };

  return (
    <div data-testid="auth-page" className="px-5 pt-10">
      <p className="eyebrow fade-up">Entity Ledger</p>
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-stone-100 title-glow fade-up">{TITLES[mode]}</h1>
      <p className="mt-2 text-sm text-stone-400 fade-up">
        {mode === "forgot" ? "We'll email you a 6-digit reset code."
          : mode === "reset" ? `If ${email} has an account, a code is on its way. It expires in 15 minutes.`
          : "Email + a 4-6 digit PIN. Log trials in ten seconds flat."}
      </p>

      {(mode === "login" || mode === "register") && (
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-[#0F111A] p-1">
          {["login", "register"].map((m) => (
            <button key={m} type="button" data-testid={`auth-mode-${m}`} onClick={() => go(m)}
              className={`rounded-lg py-2.5 text-sm font-bold uppercase tracking-wider transition-colors ${mode === m ? "bg-red-700 text-white" : "text-stone-500"}`}>
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4 fade-up">
        <Field label="Email">
          <input data-testid="auth-email-input" type="email" required autoComplete="email" value={email}
            disabled={mode === "reset"} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@fog.net" />
        </Field>
        {mode === "reset" && (
          <Field label="6-digit code">
            <input data-testid="auth-reset-code-input" inputMode="numeric" autoComplete="one-time-code" required pattern="\d{6}"
              value={code} onChange={(e) => setCode(digits(6)(e.target.value))} className="field font-mono text-xl tracking-[0.6em]" placeholder="000000" />
          </Field>
        )}
        {mode !== "forgot" && (
          <Field label={mode === "reset" ? "New PIN (4-6 digits)" : "PIN (4-6 digits)"}>
            <input data-testid="auth-pin-input" type="password" inputMode="numeric" pattern="\d{4,6}" required
              autoComplete={mode === "login" ? "current-password" : "new-password"} value={pin}
              onChange={(e) => setPin(digits(6)(e.target.value))} className="field font-mono tracking-[0.5em]" placeholder="••••" />
          </Field>
        )}
        {error && <p data-testid="auth-error" className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button data-testid="auth-submit-btn" disabled={busy} className="primary-btn w-full">{busy ? "..." : CTA[mode]}</button>
      </form>

      <div className="mt-5 text-center text-sm">
        {mode === "login" && <button data-testid="forgot-pin-btn" onClick={() => go("forgot")} className="text-stone-400 hover:text-red-400">Forgot your PIN?</button>}
        {(mode === "forgot" || mode === "reset") && <button data-testid="back-to-login-btn" onClick={() => go("login")} className="text-stone-400 hover:text-red-400">Back to sign in</button>}
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="block">
    <span className="eyebrow">{label}</span>
    {children}
  </label>
);
