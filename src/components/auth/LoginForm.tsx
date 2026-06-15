"use client";

/**
 * LoginForm – E-Mail + Passwort, Zod-Validierung, Supabase Auth.
 *
 * LoginFormInner liest useSearchParams() – muss daher in Suspense
 * eingebettet sein (Next.js 15 Requirement für statisches Rendering).
 * Der Export `LoginForm` liefert die bereits gewrappte Version.
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { createBrowserClient }  from "@/lib/supabase/client";
import { joinPendingGroup }       from "@/lib/utils/invite-token";
import { loginSchema } from "@/lib/validations";
import { getAuthError } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { Button }    from "@/components/ui/Button";
import { Input }     from "@/components/ui/Input";
import { Alert }     from "@/components/ui/Alert";
import { Card }      from "@/components/ui/Card";
import { Spinner }   from "@/components/ui/Badge";

type FormErrors = Partial<Record<"email" | "password" | "root", string>>;

// ---- Innere Komponente (liest searchParams) ----------------

function LoginFormInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirect") ?? ROUTES.dashboard;

  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors,    setErrors]    = useState<FormErrors>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
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
      const { error } = await supabase.auth.signInWithPassword({
        email:    result.data.email,
        password: result.data.password,
      });

      if (error) {
        setErrors({ root: getAuthError(error.message) });
        return;
      }

      // Ausstehende Gruppeneinladung annehmen
      const supabaseForJoin = createBrowserClient();
      const groupId = await joinPendingGroup(supabaseForJoin);
      if (groupId) {
        document.cookie = `active-group=${groupId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setErrors({ root: "Ein unerwarteter Fehler ist aufgetreten." });
    } finally {
      setIsLoading(false);
    }
  }

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
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-password"
              className="text-sm font-medium text-neutral-700"
            >
              Passwort
            </label>
            <Link
              href={ROUTES.forgotPassword}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              tabIndex={-1}
            >
              Vergessen?
            </Link>
          </div>
          <Input
            type={showPwd ? "text" : "password"}
            name="password"
            id="input-password"
            placeholder="••••••••"
            autoComplete="current-password"
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
                {showPwd
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye    className="h-4 w-4" />}
              </button>
            }
          />
        </div>

        <Button type="submit" fullWidth isLoading={isLoading} className="mt-2">
          Anmelden
        </Button>
      </form>
    </Card>
  );
}

// ---- Öffentlicher Export (mit Suspense-Wrapper) ------------

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <Card className="flex items-center justify-center py-10">
          <Spinner />
        </Card>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
