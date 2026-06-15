"use client";

/**
 * ForgotPasswordForm – sendet Reset-Link per E-Mail.
 * ResetPasswordForm  – setzt das Passwort nach Klick auf den Link.
 */

import { useState }    from "react";
import { useRouter }   from "next/navigation";
import { Mail, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        result.data.email,
        { redirectTo: `${window.location.origin}${ROUTES.resetPassword}` },
      );

      // Kein Fehler nach außen bei nicht-existenter E-Mail
      // (verhindert User-Enumeration)
      if (error && error.message !== "User not found") {
        setError(getAuthError(error.message));
        return;
      }

      setSent(true);
    } catch {
      setError("Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="text-center py-8 px-6">
        <div className="h-14 w-14 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7 text-success-600" />
        </div>
        <h2 className="text-base font-semibold text-neutral-900 mb-2">
          E-Mail gesendet
        </h2>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Falls ein Konto mit{" "}
          <strong className="text-neutral-700 font-medium">{email}</strong>{" "}
          existiert, haben wir einen Reset-Link gesendet.
        </p>
        <p className="text-xs text-neutral-400 mt-4">
          Der Link ist 1 Stunde gültig. Überprüfe auch deinen Spam-Ordner.
        </p>
      </Card>
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
