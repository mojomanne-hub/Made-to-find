/**
 * Icon-/Emoji-Vorschlag anhand des Gegenstandsnamens.
 *
 * Läuft komplett im Browser. Vorgeschlagen werden nur Symbole, die es in
 * ITEM_ICONS (Emojis) bzw. ITEM_ICON_OPTIONS (Icons) wirklich gibt.
 * Erweitern: einfach weitere Begriffe in die Listen unten eintragen.
 */

import { ITEM_ICONS, ITEM_ICON_OPTIONS } from "@/lib/constants";

// ── Zusatz-Begriffe je Emoji (Schlüssel = Bezeichnung in ITEM_ICONS) ──────────
const EMOJI_KEYWORDS: Record<string, string[]> = {
  Kuchenform:   ["kuchen", "backform", "springform", "torte", "backen", "gugelhupf"],
  Becher:       ["tasse", "trinkbecher", "thermobecher", "mug", "trinkflasche"],
  Pfanne:       ["topf", "toepfe", "kochtopf", "bratpfanne", "wok", "kochen"],
  Besteck:      ["gabel", "messer", "loeffel", "essbesteck"],
  Thermometer:  ["fieberthermometer"],
  Gläser:       ["glas", "weinglas", "sektglas", "wein", "sekt"],
  Vase:         ["krug", "amphore"],
  Laptop:       ["notebook", "computer", "pc", "macbook", "tablet"],
  Handy:        ["smartphone", "telefon", "iphone", "mobiltelefon"],
  Kamera:       ["fotoapparat", "camera", "objektiv", "gopro"],
  Kopfhörer:    ["headset", "airpods", "ohrhoerer"],
  Radio:        ["lautsprecher", "boombox", "musikbox"],
  Batterie:     ["batterien", "akku", "akkus", "powerbank"],
  Reifen:       ["rad", "raeder", "felge", "autoreifen", "winterreifen", "sommerreifen"],
  Werkzeug:     ["akkuschrauber", "schrauber", "bohrmaschine", "bohrer", "schraubendreher", "schraubenzieher",
                 "zange", "saege", "schraube", "schrauben", "naegel", "hammer", "werkzeugkasten", "maulschluessel"],
  Verlängerungskabel: ["kabel", "stecker", "steckdose", "mehrfachstecker", "netzteil", "ladekabel", "verlaengerung"],
  Glühbirnen:   ["gluehbirne", "lampe", "leuchte", "birne", "led", "leuchtmittel"],
  Blumentopf:   ["topfpflanze", "pflanze", "pflanzen", "uebertopf", "kuebel"],
  Blume:        ["blumen", "bluete", "rose", "tulpe", "strauss", "bouquet"],
  Besen:        ["kehrblech", "handfeger", "mop", "putzen", "kehrer"],
  Gartengeräte: ["spaten", "harke", "rechen", "schaufel", "gartenschere", "hacke", "gartenschlauch", "schlauch"],
  Stuhl:        ["hocker", "sessel", "gartenstuhl"],
  Regal:        ["buecherregal", "buch", "buecher"],
  Bett:         ["matratze", "bettwaesche", "kissen", "bettdecke", "decke"],
  Schrank:      ["kommode", "aktenschrank", "schublade"],
  Ordner:       ["akte", "akten", "dokumente", "unterlagen", "mappe", "papiere", "belege"],
  Shirt:        ["tshirt", "hemd", "pullover", "pulli", "hose", "jacke", "kleidung", "kleid"],
  Schuhe:       ["schuh", "stiefel", "sneaker", "turnschuhe", "sandalen"],
  Schmuck:      ["ring", "kette", "armband", "ohrringe"],
  Uhr:          ["armbanduhr", "wecker", "smartwatch"],
  Koffer:       ["reisetasche", "rucksack", "tasche", "trolley"],
  Kartenspiel:  ["karten", "skat", "poker", "uno"],
  Würfelspiel:  ["wuerfel", "brettspiel", "spiel", "gesellschaftsspiel", "puzzle"],
  Videospiel:   ["konsole", "playstation", "xbox", "nintendo", "controller", "gamepad"],
  Ball:         ["fussball", "handball", "basketball", "volleyball", "tennisball", "sportball"],
  Instrumente:  ["gitarre", "instrument", "klavier", "keyboard", "geige", "floete", "ukulele", "trommel"],
};

// ── Zusatz-Begriffe je Icon (Schlüssel = Lucide-Name in ITEM_ICON_OPTIONS) ─────
const ICON_KEYWORDS: Record<string, string[]> = {
  Wrench:      ["werkzeug", "schraubenschluessel", "maulschluessel", "ratsche", "schrauber", "akkuschrauber",
                "schraubendreher", "schraubenzieher", "zange", "saege", "bohrer", "bohrmaschine"],
  Hammer:      ["faeustel", "schlaghammer", "nagel", "naegel"],
  Package:     ["paket", "paeckchen", "lieferung", "versand", "sendung", "karton"],
  Box:         ["kiste", "kasten", "behaelter", "schachtel", "aufbewahrungsbox"],
  Archive:     ["archivbox", "ablage"],
  Laptop:      ["notebook", "computer", "pc", "macbook"],
  Smartphone:  ["smartphone", "telefon", "iphone", "mobiltelefon"],
  Camera:      ["fotoapparat", "objektiv", "gopro"],
  Headphones:  ["headset", "airpods", "ohrhoerer"],
  Battery:     ["batterien", "akku", "akkus", "powerbank"],
  Monitor:     ["bildschirm", "fernseher", "tv", "display"],
  ShoppingBag: ["tasche", "tuete", "einkauf", "beutel", "tragetasche"],
  Gift:        ["geschenke", "praesent", "weihnachtsgeschenk"],
  Home:        ["wohnung", "heim"],
  Car:         ["pkw", "wagen", "fahrzeug"],
  Bike:        ["rad", "bike", "ebike"],
  Dumbbell:    ["hanteln", "gewicht", "gewichte", "fitness", "kurzhantel"],
  Music:       ["cd", "schallplatte", "noten", "lied"],
  Book:        ["buecher", "roman", "lexikon", "heft"],
  Pen:         ["kugelschreiber", "kuli", "fueller", "bleistift", "filzstift", "marker"],
  Scissors:    ["bastelschere", "nagelschere"],
  Key:         ["schluesselbund", "autoschluessel", "schluessel"],
  Lock:        ["vorhaengeschloss", "zahlenschloss", "fahrradschloss"],
  Flashlight:  ["stirnlampe", "lampe", "leuchte"],
  Thermometer: ["fieberthermometer"],
  Clock:       ["wecker", "zeit", "armbanduhr"],
  Calendar:    ["terminkalender"],
  CakeSlice:   ["kuchen", "torte", "backform"],
  Flower2:     ["blume", "blumen", "pflanze", "pflanzen", "bluete", "rose", "topfpflanze"],
  Wine:        ["weinglas", "sekt", "glas", "glaeser"],
  Dices:       ["wuerfelspiel", "spiel", "brettspiel", "gesellschaftsspiel"],
};

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Kleinschreibung, Umlaute vereinfachen (ä/ae → a, ö/oe → o, ü/ue → u, ß → ss) */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss")
    .replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u");
}

function tokenize(text: string): string[] {
  return normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
}

function normKeyword(k: string): string {
  return normalize(k).replace(/[^a-z0-9]/g, "");
}

function buildKeywords(label: string, extra: string[] = []): string[] {
  return Array.from(new Set([label, ...extra].map(normKeyword).filter(Boolean)));
}

interface Candidate { value: string; keywords: string[] }

const EMOJI_CANDIDATES: Candidate[] = Object.values(ITEM_ICONS)
  .flat()
  .map((e) => ({ value: e.emoji, keywords: buildKeywords(e.label, EMOJI_KEYWORDS[e.label]) }));

const ICON_CANDIDATES: Candidate[] = ITEM_ICON_OPTIONS.map((i) => ({
  value: i.name,
  keywords: buildKeywords(i.label, ICON_KEYWORDS[i.name]),
}));

/**
 * Trefferstärke eines Begriffs:
 *  - ganzes Wort gleich       → stark   ("blume" = "blume")
 *  - Begriff steckt im Wort   → mittel  ("blumentopf" enthält "blume", nur ab 4 Zeichen; am Wortende stärker)
 *  - Wort ist Anfang des Begriffs → schwach, damit schon beim Tippen etwas passt ("hamm" → "hammer")
 */
function score(tokens: string[], keyword: string): number {
  let best = 0;
  for (const t of tokens) {
    if (t === keyword) best = Math.max(best, 300 + keyword.length);
    else if (keyword.length >= 4 && t.includes(keyword)) {
      // Im Deutschen steht das Grundwort hinten ("Blumen-vase" ist eine Vase): Treffer am Wortende bevorzugen
      best = Math.max(best, 200 + keyword.length + (t.endsWith(keyword) ? 50 : 0));
    }
    else if (t.length >= 4 && keyword.startsWith(t)) best = Math.max(best, 100 + t.length);
  }
  return best;
}

function pick(name: string, candidates: Candidate[]): string | null {
  const tokens = tokenize(name);
  if (tokens.length === 0) return null;
  let bestValue: string | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    for (const k of c.keywords) {
      const s = score(tokens, k);
      if (s > bestScore) { bestScore = s; bestValue = c.value; }
    }
  }
  return bestValue;
}

/** Passendes Emoji zum Namen oder null */
export function suggestEmoji(name: string): string | null {
  return pick(name, EMOJI_CANDIDATES);
}

/** Passender Lucide-Icon-Name zum Namen oder null */
export function suggestIcon(name: string): string | null {
  return pick(name, ICON_CANDIDATES);
}
