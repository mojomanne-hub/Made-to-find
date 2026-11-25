/**
 * Offline-Kopie der eigenen Ablageorte und Gegenstände – damit man ohne Netz suchen kann.
 * Liegt nur auf diesem Gerät (localStorage), getrennt nach Nutzer.
 */
export interface OfflineLocation { id: string; name: string; icon: string | null; color: string | null; group_id: string | null }
export interface OfflineShelf    { id: string; name: string; location_id: string }
export interface OfflineItem {
  id: string; name: string; description: string | null; quantity: number | null;
  location_id: string; shelf_id: string | null; icon: string | null; image_url: string | null;
  barcode: string | null; expires_at: string | null; group_id: string | null;
}
export interface OfflineSnapshot {
  v: 1;
  userId: string;
  savedAt: string;
  groups: { id: string; name: string }[];
  locations: OfflineLocation[];
  shelves: OfflineShelf[];
  items: OfflineItem[];
}

const KEY = "mtf-offline-snapshot";

export function saveSnapshot(s: OfflineSnapshot): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

/** Nur die Kopie des angegebenen Nutzers – nie die eines anderen Kontos auf demselben Gerät */
export function loadSnapshot(userId: string): OfflineSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as OfflineSnapshot;
    return s && s.v === 1 && s.userId === userId ? s : null;
  } catch { return null; }
}

/** Beim Abmelden aufrufen */
export function clearOfflineData() {
  try { localStorage.removeItem(KEY); } catch { /* ignorieren */ }
  // Zwischengespeicherte Seiten und Fotos gehören auch zum Konto – beim Abmelden mit entfernen
  try {
    if (typeof caches !== "undefined") {
      caches.delete("made-to-find-v1");
      caches.delete("made-to-find-images-v1");
    }
  } catch { /* ignorieren */ }
}

/** Für die Suche: klein, ohne Umlaute/Akzente */
export function normalize(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
}
