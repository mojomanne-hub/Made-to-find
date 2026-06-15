"use client";

/**
 * LoginPageHint – zeigt kontextuelle Hinweise auf der Login-Seite.
 *
 * URL-Parameter:
 *   ?hint=registered   → nach erfolgreicher Registrierung
 *   ?hint=reset        → nach Passwort-Reset
 *   ?hint=expired      → nach abgelaufener Session
 *
 * Muss in Suspense eingebettet sein, weil useSearchParams()
 * in Next.js 15 beim statischen Rendering einen Bail-out auslöst.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/Alert";

const HINTS: Record<string, { variant: "success" | "info" | "warning"; text: string }> = {
  registered: {
    variant: "success",
    text:    "Konto bestätigt! Du kannst dich jetzt anmelden.",
  },
  reset: {
    variant: "success",
    text:    "Passwort erfolgreich geändert. Bitte melde dich an.",
  },
  expired: {
    variant: "warning",
    text:    "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
  },
  confirm: {
    variant: "info",
    text:    "Bitte bestätige zuerst deine E-Mail-Adresse, dann kannst du dich einloggen.",
  },
};

function HintInner() {
  const searchParams = useSearchParams();
  const hint = searchParams.get("hint");
  if (!hint || !(hint in HINTS)) return null;

  const { variant, text } = HINTS[hint];
  return <Alert variant={variant}>{text}</Alert>;
}

export function LoginPageHint() {
  return (
    <Suspense fallback={null}>
      <HintInner />
    </Suspense>
  );
}
