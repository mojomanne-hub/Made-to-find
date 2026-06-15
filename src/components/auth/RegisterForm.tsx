"use client";

/**
 * RegisterForm – Registrierung mit E-Mail-Bestätigungsflow.
 *
 * Nach erfolgreicher Registrierung zeigt die Komponente einen
 * Bestätigungshinweis – der Benutzer muss erst seine E-Mail
 * bestätigen, bevor er sich einloggen kann.
 */

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, CheckCircle2 } from "lucide-react";
import { registerSchema } from "@/lib/validations";
import { getAuthError }   from "@/lib/utils";
import { createBrowserClient }  from "@/lib/supabase/client";
import { getPendingInviteToken }  from "@/lib/utils/invite-token";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input }  from "@/components/ui/Input";
import { Alert }  from "@/components/ui/Alert";
import { Card }   from "@/components/ui/Card";

type FormErrors = Partial<Record<"email" | "password" | "passwordConfirm" | "root", string>>;

export function RegisterForm() {
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPwd,         setShowPwd]         = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [errors,          setErrors]          = useState<FormErrors>({});
  const [confirmed,       setConfirmed]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

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
        },
      });

      if (error) {
        setErrors({ root: getAuthError(error.message) });
        return;
      }

      // Bestätigungshinweis anzeigen
      setConfirmed(true);
    } catch {
      setErrors({ root: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setIsLoading(false);
    }
  }

  // ---- Erfolgs-Zustand: E-Mail-Bestätigung ausstehend ------
  if (confirmed) {
    return (
      <Card className="text-center py-8 px-6">
        <div className="h-14 w-14 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7 text-success-600" />
        </div>
        <h2 className="text-base font-semibold text-neutral-900 mb-2">
          Fast geschafft!
        </h2>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Wir haben eine Bestätigungs-E-Mail an{" "}
          <strong className="text-neutral-700 font-medium">{email}</strong>{" "}
          gesendet. Klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
        </p>
        <p className="text-xs text-neutral-400 mt-4">
          Kein E-Mail erhalten? Überprüfe deinen Spam-Ordner.
        </p>
        {getPendingInviteToken() && (
          <p className="text-xs text-emerald-400 mt-2">
            ✓ Nach der Bestätigung wirst du automatisch der Gruppe beitreten.
          </p>
        )}
      </Card>
    );
  }

  // ---- Registrierungsformular ------------------------------
  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {errors.root && <Alert variant="error">{errors.root}</Alert>}

        {/* E-Mail */}
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

        <p className="text-xs text-neutral-400 text-center">
          Mit der Registrierung stimmst du der Verarbeitung deiner Daten zu.
        </p>
      </form>
    </Card>
  );
}
