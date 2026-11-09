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

/** Nur Tipps, die wirklich zum Namen passen (max. 4) – leer, wenn nichts passt */
export function matchedTipsForLocation(name: string, description?: string | null): Tip[] {
  const text = normalize(`${name} ${description ?? ""}`);
  const found: Tip[] = [];
  for (const g of TIP_GROUPS) {
    if (g.keywords.some((k) => text.includes(normalize(k)))) found.push(...g.tips);
  }
  const unique = found.filter((t, i) => found.findIndex((x) => x.query === t.query) === i);
  return unique.slice(0, 4);
}

/** Passende Tipps für einen Ablageort (max. 4), Standard-Tipps wenn nichts passt */
export function tipsForLocation(name: string, description?: string | null): Tip[] {
  const matched = matchedTipsForLocation(name, description);
  return matched.length ? matched : DEFAULT_TIPS.slice(0, 4);
}


// ───────── Tipps für Gegenstände (beim Neuanlegen) ─────────
interface ItemTipGroup { keywords: string[]; tips: Tip[] }

const ITEM_TIP_GROUPS: ItemTipGroup[] = [
  { keywords: ["hammer", "schraub", "bohr", "zange", "saege", "werkzeug", "akku", "feile", "maulschluessel", "wasserwaage"],
    tips: [
      { emoji: "🧰", label: "Werkzeugkoffer", query: "Werkzeugkoffer leer Organizer" },
      { emoji: "🔩", label: "Sortimentskasten für Kleinteile", query: "Sortimentskasten Schrauben Kleinteile" },
      { emoji: "🔧", label: "Lochwand für Werkzeug", query: "Lochwand Werkzeug Wandhalterung" } ] },
  { keywords: ["pullover", "jacke", "mantel", "hose", "shirt", "kleid", "hemd", "kleidung", "jeans", "winter"],
    tips: [
      { emoji: "🧳", label: "Vakuumbeutel", query: "Vakuumbeutel Kleidung Aufbewahrung" },
      { emoji: "🪝", label: "Platzsparende Kleiderbügel", query: "Kleiderbügel platzsparend rutschfest" },
      { emoji: "📦", label: "Kleiderboxen", query: "Kleiderbox Aufbewahrung Stoff mit Deckel" } ] },
  { keywords: ["schuh", "stiefel", "sneaker", "sandale", "pantoffel"],
    tips: [
      { emoji: "👟", label: "Schuhregal", query: "Schuhregal platzsparend" },
      { emoji: "📦", label: "Schuhboxen", query: "Schuhbox stapelbar transparent" } ] },
  { keywords: ["weihnacht", "christbaum", "lichterkette", "deko", "adventskranz", "ostern", "kugel"],
    tips: [
      { emoji: "🎄", label: "Box für Weihnachtsdeko", query: "Weihnachtsdeko Aufbewahrungsbox Christbaumkugeln" },
      { emoji: "💡", label: "Lichterketten-Aufwickler", query: "Lichterkette Aufbewahrung Aufwickler" },
      { emoji: "📦", label: "Stapelbare Boxen", query: "Aufbewahrungsbox mit Deckel stapelbar" } ] },
  { keywords: ["ordner", "akte", "dokument", "rechnung", "beleg", "vertrag", "papier", "zeugnis", "urkunde", "pass"],
    tips: [
      { emoji: "📂", label: "Archivboxen", query: "Archivbox Ordner Dokumente Aufbewahrung" },
      { emoji: "🔒", label: "Feuerfeste Dokumentenbox", query: "feuerfeste Dokumentenbox abschließbar" },
      { emoji: "🗂️", label: "Dokumentenmappen", query: "Dokumentenmappe Sammelmappe A4" } ] },
  { keywords: ["kabel", "ladegeraet", "netzteil", "stecker", "batterie", "ladekabel", "adapter", "powerbank"],
    tips: [
      { emoji: "🔌", label: "Kabelbox", query: "Kabelbox Kabelmanagement" },
      { emoji: "🧵", label: "Kabelbinder & Klettband", query: "Klettband Kabelbinder wiederverwendbar" },
      { emoji: "🔋", label: "Batterie-Organizer", query: "Batterie Aufbewahrung Organizer" } ] },
  { keywords: ["spielzeug", "lego", "playmobil", "puppe", "kuscheltier", "bauklotz", "duplo", "puzzle"],
    tips: [
      { emoji: "🧸", label: "Spielzeugkiste", query: "Spielzeugkiste Aufbewahrung Kinderzimmer" },
      { emoji: "🧺", label: "Aufbewahrungskörbe", query: "Aufbewahrungskorb Kinderzimmer Stoff" },
      { emoji: "🏷️", label: "Etiketten", query: "Etiketten selbstklebend Beschriftung Aufbewahrung" } ] },
  { keywords: ["topf", "pfanne", "geschirr", "besteck", "gewuerz", "vorrat", "glaeser", "tasse", "teller", "backform"],
    tips: [
      { emoji: "🥫", label: "Vorratsdosen", query: "Vorratsdosen luftdicht Set Küche" },
      { emoji: "🗂️", label: "Schubladen-Organizer", query: "Schubladen Organizer Besteck Küche" },
      { emoji: "🧂", label: "Gewürzregal", query: "Gewürzregal Schrank Organizer" } ] },
  { keywords: ["fahrrad", "radhelm", "helm", "roller", "skateboard"],
    tips: [
      { emoji: "🚲", label: "Fahrrad-Wandhalterung", query: "Fahrrad Wandhalterung platzsparend" },
      { emoji: "🪝", label: "Haken für Helme & Zubehör", query: "Wandhaken Garage Helm Halter" } ] },
  { keywords: ["zelt", "schlafsack", "camping", "isomatte", "rucksack", "wander"],
    tips: [
      { emoji: "⛺", label: "Campingbox", query: "Campingbox Aufbewahrung Transportbox" },
      { emoji: "🎒", label: "Packsäcke", query: "Packsack wasserdicht Set" },
      { emoji: "🧳", label: "Vakuumbeutel", query: "Vakuumbeutel Kleidung Aufbewahrung" } ] },
  { keywords: ["spaten", "rechen", "harke", "gartenschlauch", "schlauch", "blumentopf", "schaufel", "gartenschere", "duenger"],
    tips: [
      { emoji: "🪝", label: "Gartengeräte-Halter", query: "Gartengeräte Halter Wand" },
      { emoji: "📦", label: "Gartenbox", query: "Gartenbox Auflagenbox wasserdicht" },
      { emoji: "💧", label: "Schlauchhalter", query: "Schlauchhalter Wand Gartenschlauch" } ] },
  { keywords: ["foto", "album", "erinnerung", "postkarte", "brief"],
    tips: [
      { emoji: "📸", label: "Fotoboxen", query: "Fotobox Aufbewahrung Archiv Fotos" },
      { emoji: "📚", label: "Fotoalben", query: "Fotoalbum zum Einkleben" } ] },
  { keywords: ["medikament", "tablette", "pflaster", "verbandskasten", "erste-hilfe", "salbe"],
    tips: [
      { emoji: "💊", label: "Medikamentenbox", query: "Medikamentenbox Aufbewahrung abschließbar" },
      { emoji: "🩹", label: "Erste-Hilfe-Set", query: "Erste Hilfe Set Haushalt" } ] },
  { keywords: ["schmuck", "ohrring", "halskette", "armband", "uhr", "manschetten"],
    tips: [
      { emoji: "💍", label: "Schmuckaufbewahrung", query: "Schmuckkästchen Organizer" },
      { emoji: "⌚", label: "Uhrenbox", query: "Uhrenbox Aufbewahrung" } ] },
  { keywords: ["buch", "buecher", "comic", "dvd", "cd", "schallplatte", "vinyl", "roman"],
    tips: [
      { emoji: "📚", label: "Bücherregal", query: "Bücherregal Wand Regal" },
      { emoji: "💿", label: "CD-/DVD-Aufbewahrung", query: "DVD CD Aufbewahrung Box" } ] },
];

/** Wortweise Prüfung: Begriff steht am Wortanfang oder -ende (Grundwort im Deutschen hinten) */
function itemTokens(name: string): string[] {
  return normalize(name).split(/[^a-z0-9-]+/).filter(Boolean);
}

/** Tipps für einen neuen Gegenstand (max. 3) – leer, wenn nichts passt */
export function matchedTipsForItem(name: string): Tip[] {
  const tokens = itemTokens(name);
  if (tokens.length === 0) return [];
  const found: Tip[] = [];
  for (const g of ITEM_TIP_GROUPS) {
    const hit = g.keywords.some((k) => {
      const kw = normalize(k);
      return tokens.some((t) => (kw.length <= 3 ? t === kw : t.startsWith(kw) || t.endsWith(kw)));
    });
    if (hit) found.push(...g.tips);
  }
  return found.filter((t, i) => found.findIndex((x) => x.query === t.query) === i).slice(0, 3);
}

export const AFFILIATE_DISCLOSURE = "Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.";
