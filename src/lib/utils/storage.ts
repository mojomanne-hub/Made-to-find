import { createBrowserClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createBrowserClient>;

/**
 * Ermittelt den Dateipfad im Bucket aus einer öffentlichen Storage-URL.
 * z.B. https://xyz.supabase.co/storage/v1/object/public/item-images/USER/ID.jpg?t=123
 *   → "USER/ID.jpg"
 */
export function storagePathFromUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = url.slice(i + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/** Löscht ein Bild anhand seiner URL aus dem Storage. Fehler werden nur geloggt. */
export async function removeStorageImage(
  supabase: Supabase,
  bucket: string,
  url: string | null | undefined
): Promise<void> {
  await removeStorageImages(supabase, bucket, [url]);
}

/**
 * Löscht mehrere Bilder anhand ihrer URLs (z.B. alle Fotos eines Ablageorts).
 *
 * Das Löschen läuft über /api/storage/cleanup auf dem Server. Der Server entfernt eine Datei nur,
 * wenn sie von keinem Gegenstand / Ablageort mehr verwendet wird – so klappt es auch bei Fotos,
 * die ein anderes Gruppenmitglied hochgeladen hat.
 * Fällt die Route aus, wird ersatzweise direkt im Storage gelöscht (nur eigene Dateien möglich).
 */
export async function removeStorageImages(
  supabase: Supabase,
  bucket: string,
  urls: (string | null | undefined)[]
): Promise<void> {
  const paths = Array.from(
    new Set(urls.map((u) => storagePathFromUrl(u, bucket)).filter((p): p is string => !!p))
  );
  if (paths.length === 0) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/storage/cleanup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ bucket, paths }),
    });
    if (res.ok) return;
    console.error("Storage-Aufräumen (Server) fehlgeschlagen:", res.status);
  } catch (err) {
    console.error("Storage-Aufräumen (Server) nicht erreichbar:", err);
  }

  // Ersatzweg: direkt löschen (funktioniert nur für eigene Dateien)
  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) console.error("Storage-Löschen fehlgeschlagen:", error.message);
  } catch (err) {
    console.error("Storage-Löschen fehlgeschlagen:", err);
  }
}
