/** Kleiner Helfer: öffnet den globalen Scanner von überall in der App (Menü, untere Leiste, Seiten). */
export const OPEN_SCANNER_EVENT = "mtf:open-scanner";

export function openScanner(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_SCANNER_EVENT));
}
