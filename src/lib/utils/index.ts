/**
 * Allgemeine Hilfsfunktionen.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ---- Tailwind ---------------------------------------------

/** Kombiniert Tailwind-Klassen sicher (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---- Datumsformatierung -----------------------------------

const DATE_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  day:   "2-digit",
  month: "2-digit",
  year:  "numeric",
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  day:    "2-digit",
  month:  "2-digit",
  year:   "numeric",
  hour:   "2-digit",
  minute: "2-digit",
});

export function formatDate(dateString: string): string {
  return DATE_FORMATTER.format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return DATETIME_FORMATTER.format(new Date(dateString));
}

/** Gibt ein relatives Datum zurück: "gerade eben", "vor 3 Min." etc. */
export function formatRelativeDate(dateString: string): string {
  const diffMs    = Date.now() - new Date(dateString).getTime();
  const diffMins  = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays  = Math.floor(diffHours / 24);

  if (diffMins  <  1)  return "gerade eben";
  if (diffMins  < 60)  return `vor ${diffMins} Min.`;
  if (diffHours < 24)  return `vor ${diffHours} Std.`;
  if (diffDays  <  7)  return `vor ${diffDays} Tag${diffDays !== 1 ? "en" : ""}`;
  return formatDate(dateString);
}

// ---- Text -------------------------------------------------

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "…";
}

/** Erzeugt Initialen aus Name oder E-Mail (für Avatar-Fallback). */
export function getInitials(nameOrEmail: string): string {
  const name = nameOrEmail.split("@")[0]; // E-Mail-Präfix abschneiden
  return name
    .split(/[\s._-]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ---- Auth-Fehlermeldungen ---------------------------------

/** Übersetzt Supabase-Fehlercodes in Deutsche Meldungen. */
export function getAuthError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials":
      "E-Mail oder Passwort ist falsch.",
    "Email not confirmed":
      "Bitte bestätige zuerst deine E-Mail-Adresse.",
    "User already registered":
      "Diese E-Mail-Adresse ist bereits registriert.",
    "Password should be at least 6 characters":
      "Das Passwort muss mindestens 8 Zeichen lang sein.",
    "Email rate limit exceeded":
      "Zu viele Versuche. Bitte warte einige Minuten.",
    "Invalid email":
      "Bitte gib eine gültige E-Mail-Adresse ein.",
    "Token has expired or is invalid":
      "Dieser Link ist abgelaufen. Bitte fordere einen neuen an.",
  };
  return map[message] ?? "Ein unbekannter Fehler ist aufgetreten.";
}

// ---- Farben -----------------------------------------------

/**
 * Gibt Schwarz (#000) oder Weiß (#fff) zurück –
 * je nachdem was auf dem gegebenen Hex-Hintergrund besser lesbar ist.
 */
export function getContrastColor(hex: string): "#000000" | "#ffffff" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // sRGB Luminanz
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}
