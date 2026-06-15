"use client";

/**
 * Globale Error Boundary.
 * Fängt unbehandelte Fehler im gesamten App-Baum ab.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Fehler könnte hier an einen Logging-Service gesendet werden
    console.error("Unbehandelter Fehler:", error);
  }, [error]);

  return (
    <html lang="de">
      <body className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">⚠️</p>
          <h1 className="text-lg font-bold text-neutral-900 mb-2">
            Etwas ist schiefgelaufen
          </h1>
          <p className="text-sm text-neutral-500 mb-6">
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
          </p>
          <Button onClick={reset}>Erneut versuchen</Button>
        </div>
      </body>
    </html>
  );
}
