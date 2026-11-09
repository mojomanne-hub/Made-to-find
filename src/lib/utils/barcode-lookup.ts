/**
 * Produktdaten zu einem Strichcode (EAN/UPC) aus offenen Datenbanken holen.
 * Reihenfolge: Open Food Facts → Open Products Facts → Open Beauty Facts.
 * Läuft nur serverseitig; Fehler/Timeouts liefern einfach null.
 */
export interface BarcodeProduct { name: string; description: string | null; source: string }

const SOURCES = [
  { host: "world.openfoodfacts.org",     label: "Open Food Facts" },
  { host: "world.openproductsfacts.org", label: "Open Products Facts" },
  { host: "world.openbeautyfacts.org",   label: "Open Beauty Facts" },
];

export async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  const clean = code.trim();
  if (!/^\d{8,14}$/.test(clean)) return null;   // nur echte Strichcode-Nummern

  for (const { host, label } of SOURCES) {
    try {
      const res = await fetch(
        `https://${host}/api/v2/product/${clean}.json?fields=product_name,product_name_de,generic_name_de,brands,quantity`,
        {
          headers: { "User-Agent": "MaDe-to-find/1.0 (madetofind.de)" },
          signal: AbortSignal.timeout(3500),
          next: { revalidate: 86400 },
        }
      );
      if (!res.ok) continue;
      const json = await res.json();
      if (json?.status !== 1 || !json.product) continue;
      const p = json.product;
      const title = (p.product_name_de || p.product_name || "").toString().trim();
      if (!title) continue;
      const brand = (p.brands ?? "").toString().split(",")[0].trim();
      const qty   = (p.quantity ?? "").toString().trim();
      const name  = brand && !title.toLowerCase().includes(brand.toLowerCase()) ? `${title} (${brand})` : title;
      const description = [qty, (p.generic_name_de ?? "").toString().trim()].filter(Boolean).join(" · ") || null;
      return { name: name.slice(0, 100), description, source: label };
    } catch {
      /* nächste Quelle probieren */
    }
  }
  return null;
}
