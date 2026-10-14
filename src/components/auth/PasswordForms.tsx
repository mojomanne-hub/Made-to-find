"use client";

/**
 * ForgotPasswordForm – sendet Reset-Link per E-Mail.
 * ResetPasswordForm  – setzt das Passwort nach Klick auf den Link.
 */

import { useState, useEffect } from "react";
import { useRouter }   from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Check, Inbox, MousePointerClick, KeyRound, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations";
import { getAuthError } from "@/lib/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input }  from "@/components/ui/Input";
import { Alert }  from "@/components/ui/Alert";
import { Card }   from "@/components/ui/Card";

// ============================================================
// ForgotPasswordForm
// ============================================================

export function ForgotPasswordForm() {
  const [email,     setEmail]     = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [sent,      setSent]      = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const [cooldown,    setCooldown]    = useState(0);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Sperre für „Erneut senden“ herunterzählen
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendResetMail(address: string) {
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}${ROUTES.resetPassword}`,
    });
    // Kein Fehler nach außen bei nicht-existenter E-Mail (verhindert User-Enumeration)
    if (error && error.message !== "User not found") {
      throw new Error(getAuthError(error.message));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      await sendResetMail(result.data.email);
      setSentEmail(result.data.email);
      setCooldown(60);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resendState === "sending") return;
    setResendState("sending");
    try {
      await sendResetMail(sentEmail);
      setResendState("sent");
    } catch {
      setResendState("error");
    } finally {
      setCooldown(60);
    }
  }

  function handleOtherAddress() {
    setSent(false);
    setResendState("idle");
    setCooldown(0);
    setEmail("");
  }

  if (sent) {
    const steps = [
      { icon: Inbox,             text: "Öffne dein E-Mail-Postfach" },
      { icon: MousePointerClick, text: "Klicke in der Mail auf „Neues Passwort festlegen“" },
      { icon: KeyRound,          text: "Vergib ein neues Passwort und leg wieder los" },
    ];

    return (
      <div
        className="rounded-2xl px-6 py-8 text-center"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}
      >
        {/* Icon */}
        <div className="relative mx-auto mb-5 h-20 w-20">
          <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: "rgba(59,130,246,0.15)" }} />
          <div
            className="relative h-20 w-20 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#3b82f6,#1e3a6e)", boxShadow: "0 8px 30px rgba(59,130,246,0.35)" }}
          >
            <Mail className="h-9 w-9 text-white" />
          </div>
          <span
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#10b981", border: "3px solid #1a2535" }}
          >
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </span>
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: "#f1f5f9" }}>Mail ist unterwegs!</h2>
        <p className="text-sm mb-3" style={{ color: "#94a3b8" }}>
          Falls ein Konto existiert, haben wir einen Link zum Zurücksetzen gesendet an
        </p>
        <div
          className="inline-block max-w-full truncate rounded-full px-4 py-1.5 text-sm font-medium mb-6"
          style={{ backgroundColor: "#0f1729", border: "1px solid #2d3f55", color: "#60a5fa" }}
        >
          {sentEmail}
        </div>

        {/* Schritte */}
        <ol className="mb-5 space-y-2.5 text-left">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex items-center gap-3">
              <span
                className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: "rgba(59,130,246,0.12)" }}
              >
                <Icon className="h-4 w-4" style={{ color: "#60a5fa" }} />
              </span>
              <span className="text-sm" style={{ color: "#cbd5e1" }}>
                <span className="font-semibold" style={{ color: "#60a5fa" }}>{i + 1}.</span> {text}
              </span>
            </li>
          ))}
        </ol>

        {/* Spam-Hinweis */}
        <div
          className="mb-5 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-left"
          style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#fcd34d" }}>
            Nichts angekommen? Schau auch im <strong>Spam-Ordner</strong> nach und markiere die Mail dort als „Kein Spam“. Der Link ist 1 Stunde gültig.
          </p>
        </div>

        {/* Erneut senden */}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resendState === "sending"}
          className="w-full h-11 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-transparent transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          {resendState === "sending"
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          {cooldown > 0 ? `Erneut senden in ${cooldown} s` : "Mail erneut senden"}
        </button>
        {resendState === "sent" && (
          <p className="text-xs mt-2" style={{ color: "#34d399" }}>Die Mail wurde erneut gesendet.</p>
        )}
        {resendState === "error" && (
          <p className="text-xs mt-2 text-red-300">Das hat leider nicht geklappt. Bitte versuche es gleich noch einmal.</p>
        )}

        <div className="mt-5 flex items-center justify-center gap-5 text-sm">
          <button type="button" onClick={handleOtherAddress} className="transition-colors hover:text-slate-200" style={{ color: "#94a3b8" }}>
            Andere Adresse
          </button>
          <Link href={ROUTES.login} className="font-medium transition-colors hover:text-blue-300" style={{ color: "#60a5fa" }}>
            Zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          type="email"
          name="email"
          label="E-Mail"
          placeholder="name@beispiel.de"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <Button type="submit" fullWidth isLoading={isLoading}>
          Reset-Link senden
        </Button>
      </form>
    </Card>
  );
}

// ============================================================
// ResetPasswordForm
// ============================================================

export function ResetPasswordForm() {
  const router = useRouter();

  const [password,        setPassword]        = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPwd,         setShowPwd]         = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"password" | "passwordConfirm" | "root", string>>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = resetPasswordSchema.safeParse({ password, passwordConfirm });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const err of result.error.errors) {
        const field = err.path[0] as keyof typeof errors;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: result.data.password,
      });

      if (error) {
        setErrors({ root: getAuthError(error.message) });
        return;
      }

      // Nach Reset direkt zum Dashboard
      router.push(ROUTES.dashboard);
      router.refresh();
    } catch {
      setErrors({ root: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setIsLoading(false);
    }
  }

  const eyeButton = (
    <button
      type="button"
      onClick={() => setShowPwd((v) => !v)}
      className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors rounded-lg"
      aria-label={showPwd ? "Passwort verbergen" : "Passwort anzeigen"}
    >
      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errors.root && <Alert variant="error">{errors.root}</Alert>}

        <Input
          type={showPwd ? "text" : "password"}
          name="password"
          label="Neues Passwort"
          placeholder="Mindestens 8 Zeichen"
          autoComplete="new-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          leftIcon={<Lock className="h-4 w-4" />}
          rightSlot={eyeButton}
        />

        <Input
          type={showPwd ? "text" : "password"}
          name="passwordConfirm"
          label="Passwort bestätigen"
          placeholder="Passwort wiederholen"
          autoComplete="new-password"
          required
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          error={errors.passwordConfirm}
          leftIcon={<Lock className="h-4 w-4" />}
        />

        <Button type="submit" fullWidth isLoading={isLoading}>
          Passwort speichern
        </Button>
      </form>
    </Card>
  );
}
