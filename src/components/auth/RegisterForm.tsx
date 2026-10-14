"use client";

/**
 * RegisterForm – Registrierung mit E-Mail-Bestätigungsflow.
 *
 * Nach erfolgreicher Registrierung zeigt die Komponente einen
 * Bestätigungshinweis – der Benutzer muss erst seine E-Mail
 * bestätigen, bevor er sich einloggen kann.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, Check, RefreshCw, ArrowLeft, Info, Users } from "lucide-react";
import { registerSchema } from "@/lib/validations";
import { getAuthError }   from "@/lib/utils";
import { createBrowserClient }  from "@/lib/supabase/client";
import { getPendingInviteToken }  from "@/lib/utils/invite-token";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input }  from "@/components/ui/Input";
import { Alert }  from "@/components/ui/Alert";
import { Card }   from "@/components/ui/Card";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

type FormErrors = Partial<Record<"email" | "password" | "passwordConfirm" | "displayName" | "root", string>>;

export function RegisterForm() {
  const [displayName,     setDisplayName]     = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPwd,         setShowPwd]         = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [errors,          setErrors]          = useState<FormErrors>({});
  const [confirmed,       setConfirmed]       = useState(false);
  const [sentEmail,       setSentEmail]       = useState("");
  const [cooldown,        setCooldown]        = useState(0);
  const [resendState,     setResendState]     = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Sekunden-Countdown für "Mail erneut senden"
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    if (cooldown > 0 || resendState === "sending") return;
    setResendState("sending");
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resend({
        type:  "signup",
        email: sentEmail,
        options: { emailRedirectTo: `${window.location.origin}${ROUTES.dashboard}` },
      });
      if (error) throw error;
      setResendState("sent");
    } catch {
      setResendState("error");
    } finally {
      setCooldown(60);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      setErrors({ displayName: "Bitte gib einen Anzeigenamen ein (mind. 2 Zeichen)." });
      return;
    }

    const result = registerSchema.safeParse({ email, password, passwordConfirm });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const err of result.error.errors) {
        const field = err.path[0] as keyof FormErrors;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signUp({
        email:    result.data.email,
        password: result.data.password,
        options: {
          // Redirect nach Bestätigung des E-Mail-Links
          emailRedirectTo: `${window.location.origin}${ROUTES.dashboard}`,
          data: {
            display_name: trimmedName,
          },
        },
      });

      if (error) {
        setErrors({ root: getAuthError(error.message) });
        return;
      }

      // Bestätigungshinweis anzeigen
      setSentEmail(result.data.email);
      setResendState("idle");
      setCooldown(60);
      setConfirmed(true);
    } catch {
      setErrors({ root: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setIsLoading(false);
    }
  }

  // ---- Erfolgs-Zustand: E-Mail-Bestätigung ausstehend ------
  if (confirmed) {
    const steps = [
      "Öffne dein E-Mail-Postfach",
      "Klicke in der Mail auf „E-Mail bestätigen“",
      "Melde dich an und leg los",
    ];

    return (
      <div
        className="rounded-2xl px-6 py-8 text-center"
        style={{
          backgroundColor: "#1a2535",
          border: "1px solid #2d3f55",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}
      >
        {/* Icon mit Glow und Haken */}
        <div className="relative mx-auto mb-5 h-20 w-20">
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: "rgba(59,130,246,0.15)" }}
          />
          <div
            className="relative h-20 w-20 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #1e3a6e, #2563eb)",
              boxShadow: "0 8px 30px rgba(37,99,235,0.35)",
            }}
          >
            <Mail className="h-9 w-9 text-white" />
          </div>
          <span
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#10b981", border: "3px solid #1a2535" }}
          >
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </span>
        </div>

        <h2 className="text-xl font-bold mb-2" style={{ color: "#f1f5f9" }}>
          Fast geschafft!
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
          Wir haben dir eine Bestätigungs-Mail geschickt an
        </p>
        <div className="mt-3 flex justify-center">
          <span
            className="inline-block max-w-full truncate rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: "#0f1729", border: "1px solid #2d3f55", color: "#e2e8f0" }}
          >
            {sentEmail}
          </span>
        </div>

        {/* Schritte */}
        <ol className="mt-6 space-y-3 text-left">
          {steps.map((text, i) => (
            <li key={text} className="flex items-center gap-3">
              <span
                className="h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
              >
                {i + 1}
              </span>
              <span className="text-sm" style={{ color: "#cbd5e1" }}>{text}</span>
            </li>
          ))}
        </ol>

        {/* Spam-Hinweis */}
        <div
          className="mt-6 flex items-start gap-3 rounded-xl px-4 py-3 text-left"
          style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
        >
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#fde68a" }}>
            Nichts angekommen? Schau im <strong>Spam-Ordner</strong> nach und markiere die Mail
            dort als „Kein Spam“. Die Zustellung kann ein bis zwei Minuten dauern.
          </p>
        </div>

        {/* Gruppen-Einladung */}
        {getPendingInviteToken() && (
          <div
            className="mt-3 flex items-start gap-3 rounded-xl px-4 py-3 text-left"
            style={{ backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}
          >
            <Users className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#34d399" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#a7f3d0" }}>
              Nach der Bestätigung trittst du automatisch der Gruppe bei.
            </p>
          </div>
        )}

        {/* Aktionen */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resendState === "sending"}
            className="w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#0f1729", border: "1px solid #2d3f55", color: "#e2e8f0" }}
          >
            <RefreshCw className={`h-4 w-4 ${resendState === "sending" ? "animate-spin" : ""}`} />
            {cooldown > 0 ? `Erneut senden in ${cooldown} s` : "Mail erneut senden"}
          </button>

          {resendState === "sent" && (
            <p className="text-xs" style={{ color: "#34d399" }}>
              Wir haben dir die Mail noch einmal geschickt.
            </p>
          )}
          {resendState === "error" && (
            <p className="text-xs" style={{ color: "#f87171" }}>
              Das hat leider nicht geklappt. Bitte versuche es in einer Minute erneut.
            </p>
          )}

          <div className="flex items-center justify-center gap-5 text-sm pt-1">
            <button
              type="button"
              onClick={() => { setConfirmed(false); setResendState("idle"); }}
              className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors"
              style={{ color: "#94a3b8" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Andere Adresse
            </button>
            <Link href={ROUTES.login} className="font-medium" style={{ color: "#60a5fa" }}>
              Zur Anmeldung
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- Registrierungsformular ------------------------------
  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errors.root && <Alert variant="error">{errors.root}</Alert>}

        {/* Anzeigename */}
        <Input
          type="text"
          name="displayName"
          label="Anzeigename"
          placeholder="z.B. Max Mustermann"
          autoComplete="name"
          autoFocus
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={errors.displayName}
          leftIcon={<User className="h-4 w-4" />}
          hint="Wird in Gruppen für andere Mitglieder sichtbar sein"
          maxLength={50}
        />

        {/* E-Mail */}
        <Input
          type="email"
          name="email"
          label="E-Mail"
          placeholder="name@beispiel.de"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
        />

        {/* Passwort */}
        <Input
          type={showPwd ? "text" : "password"}
          name="password"
          label="Passwort"
          placeholder="Mindestens 8 Zeichen"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          leftIcon={<Lock className="h-4 w-4" />}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors rounded-lg"
              aria-label={showPwd ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        {/* Passwort bestätigen */}
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

        <Button type="submit" fullWidth isLoading={isLoading} className="mt-2">
          Konto erstellen
        </Button>

        {/* Trenner */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px" style={{ backgroundColor: "#2d3f55" }} />
          <span className="text-xs" style={{ color: "#64748b" }}>oder</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#2d3f55" }} />
        </div>

        <GoogleSignInButton label="Mit Google registrieren" />

        <p className="text-xs text-center" style={{ color: "#64748b" }}>
          Mit der Registrierung stimmst du der Verarbeitung deiner Daten zu.
        </p>
      </form>
    </Card>
  );
}
