/**
 * Amazon-Partner-Links (Affiliate) + passende Ordnungs-Tipps je Ablageort.
 *
 * - Die Partner-ID (Tag) kommt aus NEXT_PUBLIC_AMAZON_TAG, z. B. "deinname-21".
 *   Ist sie nicht gesetzt, wird nichts angezeigt (so ist der Code schon vor der Freigabe gefahrlos live).
 * - Es werden Such-Links auf amazon.de erzeugt, keine festen Produkte und KEINE Preise.
 *   So kann nichts veralten und die Preisanzeige-Regeln von Amazon werden nicht berührt.
 */

export const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG ?? "";

export function amazonSearchUrl(query: string): string {
  const params = new URLSearchParams({ k: query });
  if (AMAZON_TAG) params.set("tag", AMAZON_TAG);
  return `https://www.amazon.de/s?${params.toString()}`;
}

export interface Tip { emoji: string; label: string; query: string }

interface TipGroup { keywords: string[]; tips: Tip[] }

const TIP_GROUPS: TipGroup[] = [
  {
    keywords: ["keller", "lager", "abstell", "dachboden", "speicher", "garage", "schuppen", "carport", "vorrat"],
    tips: [
      { emoji: "📦", label: "Aufbewahrungsboxen mit Deckel", query: "Aufbewahrungsbox mit Deckel stapelbar" },
      { emoji: "🗄️", label: "Regalsystem für Keller & Garage", query: "Kellerregal Steckregal belastbar" },
      { emoji: "🏷️", label: "Etiketten zum Beschriften", query: "Etiketten selbstklebend Beschriftung Aufbewahrung" },
      { emoji: "🧳", label: "Vakuumbeutel", query: "Vakuumbeutel Kleidung Aufbewahrung" },
    ],
  },
  {
    keywords: ["werkstatt", "werkzeug", "werkbank", "hobbykeller", "bastel"],
    tips: [
      { emoji: "🔧", label: "Lochwand für Werkzeug", query: "Lochwand Werkzeug Wandhalterung" },
      { emoji: "🔩", label: "Sortimentskasten für Kleinteile", query: "Sortimentskasten Schrauben Kleinteile" },
      { emoji: "🧰", label: "Werkzeugkoffer", query: "Werkzeugkoffer leer Organizer" },
      { emoji: "🪝", label: "Wandhaken & Halter", query: "Wandhaken Halter Werkzeug Garage" },
    ],
  },
  {
    keywords: ["kueche", "küche", "speisekammer", "vorratskammer"],
    tips: [
      { emoji: "🥫", label: "Vorratsdosen", query: "Vorratsdosen luftdicht Set Küche" },
      { emoji: "🧂", label: "Gewürzregal", query: "Gewürzregal Schrank Organizer" },
      { emoji: "🗂️", label: "Schubladen-Organizer", query: "Schubladen Organizer Besteck Küche" },
      { emoji: "🏷️", label: "Etiketten für Dosen", query: "Etiketten Vorratsdosen beschriftbar" },
    ],
  },
  {
    keywords: ["kleider", "schlafzimmer", "ankleide", "garderobe", "schrank", "waesche", "wäsche"],
    tips: [
      { emoji: "👕", label: "Kleiderschrank-Organizer", query: "Kleiderschrank Organizer Fächer hängend" },
      { emoji: "🧺", label: "Aufbewahrungskörbe", query: "Aufbewahrungskorb Stoff Regal" },
      { emoji: "🧳", label: "Vakuumbeutel", query: "Vakuumbeutel Kleidung Aufbewahrung" },
      { emoji: "🪝", label: "Platzsparende Kleiderbügel", query: "Kleiderbügel platzsparend rutschfest" },
    ],
  },
  {
    keywords: ["buero", "büro", "arbeitszimmer", "schreibtisch", "akten", "dokument", "papier"],
    tips: [
      { emoji: "📂", label: "Ordner & Archivboxen", query: "Archivbox Ordner Dokumente Aufbewahrung" },
      { emoji: "🔌", label: "Kabelmanagement", query: "Kabelbox Kabelmanagement Schreibtisch" },
      { emoji: "🗂️", label: "Schreibtisch-Organizer", query: "Schreibtisch Organizer Ablage" },
      { emoji: "🏷️", label: "Etikettendrucker", query: "Etikettendrucker Beschriftungsgerät" },
    ],
  },
  {
    keywords: ["bad", "dusche", "wc", "toilette"],
    tips: [
      { emoji: "🧴", label: "Bad-Organizer", query: "Badezimmer Organizer Regal ohne Bohren" },
      { emoji: "🧺", label: "Körbe fürs Bad", query: "Aufbewahrungskorb Bad Handtücher" },
      { emoji: "🪥", label: "Schubladen-Einsätze", query: "Schubladen Organizer Kosmetik" },
    ],
  },
  {
    keywords: ["kinder", "spiel", "baby", "spielzeug"],
    tips: [
      { emoji: "🧸", label: "Spielzeugkisten", query: "Spielzeugkiste Aufbewahrung Kinderzimmer" },
      { emoji: "🧺", label: "Aufbewahrungskörbe", query: "Aufbewahrungskorb Kinderzimmer Stoff" },
      { emoji: "📚", label: "Bücherregal fürs Kinderzimmer", query: "Kinder Bücherregal Wand" },
      { emoji: "🏷️", label: "Etiketten & Bildkarten", query: "Etiketten Kinderzimmer Aufbewahrung Bilder" },
    ],
  },
  {
    keywords: ["garten", "terrasse", "balkon", "hof", "gartenhaus", "gewaechshaus"],
    tips: [
      { emoji: "📦", label: "Gartenbox", query: "Gartenbox Auflagenbox wasserdicht" },
      { emoji: "🪝", label: "Geräte-Halter", query: "Gartengeräte Halter Wand" },
      { emoji: "🧰", label: "Gartenwerkzeug-Set", query: "Gartenwerkzeug Set Aufbewahrung" },
    ],
  },
];

const DEFAULT_TIPS: Tip[] = [
  { emoji: "📦", label: "Aufbewahrungsboxen", query: "Aufbewahrungsbox mit Deckel stapelbar" },
  { emoji: "🏷️", label: "Etiketten zum Beschriften", query: "Etiketten selbstklebend Beschriftung Aufbewahrung" },
  { emoji: "🗄️", label: "Regale", query: "Regal Steckregal Aufbewahrung" },
];

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/** Passende Tipps für einen Ablageort (max. 4), Standard-Tipps wenn nichts passt */
export function tipsForLocation(name: string, description?: string | null): Tip[] {
  const text = normalize(`${name} ${description ?? ""}`);
  const found: Tip[] = [];
  for (const g of TIP_GROUPS) {
    if (g.keywords.some((k) => text.includes(normalize(k)))) found.push(...g.tips);
  }
  const unique = found.filter((t, i) => found.findIndex((x) => x.query === t.query) === i);
  return (unique.length ? unique : DEFAULT_TIPS).slice(0, 4);
}

export const AFFILIATE_DISCLOSURE = "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.";
