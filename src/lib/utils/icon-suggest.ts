/**
 * Icon-/Emoji-Vorschlag anhand des Namens (Gegenstände und Ablageorte).
 *
 * Läuft komplett im Browser. Vorgeschlagen werden nur Symbole, die es in den Listen
 * in @/lib/constants wirklich gibt – und bei Icons nur solche, die in der installierten
 * Lucide-Version vorhanden sind.
 *
 * Erweitern: einfach weitere Begriffe in die Listen unten eintragen
 * (Umlaute dürfen als ä/ö/ü oder ae/oe/ue geschrieben werden, Groß-/Kleinschreibung egal).
 */

import * as LucideIcons from "lucide-react";
import {
  ITEM_ICONS, ITEM_ICON_OPTIONS,
  LOCATION_EMOJIS, LOCATION_ICONS,
} from "@/lib/constants";

// ═════════════════════ GEGENSTÄNDE ═════════════════════════════════════════

// Zusatz-Begriffe je Emoji (Schlüssel = Bezeichnung in ITEM_ICONS)
const ITEM_EMOJI_KEYWORDS: Record<string, string[]> = {
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
  Werkzeug:     ["akkuschrauber", "schrauber", "bohrmaschine", "bohrer",
                 "zange", "naegel", "maulschluessel"],
  Verlängerungskabel: ["kabel", "stecker", "steckdose", "mehrfachstecker", "netzteil", "ladekabel", "verlaengerung"],
  Glühbirnen:   ["gluehbirne", "lampe", "leuchte", "birne", "led", "leuchtmittel"],
  Blumentopf:   ["topfpflanze", "pflanze", "pflanzen", "uebertopf", "kuebel"],
  Blume:        ["blumen", "bluete", "strauss", "bouquet"],
  Besen:        ["kehrblech", "handfeger", "mop", "putzen", "kehrer"],
  Gartengeräte: ["spaten", "harke", "rechen", "schaufel", "gartenschere", "hacke", "gartenschlauch", "schlauch"],
  Stuhl:        ["hocker", "sessel", "gartenstuhl"],
  Regal:        ["buecherregal"],
  Bett:         ["matratze", "bettwaesche", "bettdecke"],
  Schrank:      ["kommode", "aktenschrank", "schublade"],
  Ordner:       ["akte", "akten", "dokumente", "unterlagen", "papiere"],
  Shirt:        ["tshirt", "pullover", "pulli", "kleidung", "trikot"],
  Schuhe:       ["schuh", "sneaker", "turnschuhe", "hausschuhe"],
  Schmuck:      ["ring", "kette", "armband", "ohrringe"],
  Uhr:          ["armbanduhr", "smartwatch"],
  Koffer:       ["reisetasche", "trolley", "gepaeck"],
  Kartenspiel:  ["karten", "skat", "poker", "uno"],
  Würfelspiel:  ["wuerfel", "brettspiel", "spiel", "gesellschaftsspiel"],
  Videospiel:   ["konsole", "playstation", "xbox", "nintendo", "controller", "gamepad"],
  Ball:         ["fussball", "handball", "tennisball", "sportball"],
  Instrumente:  ["gitarre", "instrument", "floete", "ukulele", "trommel"],
};

// Zusatz-Begriffe je Icon (Schlüssel = Lucide-Name in ITEM_ICON_OPTIONS)
const ITEM_ICON_KEYWORDS: Record<string, string[]> = {
  Wrench:      ["werkzeug", "schraubenschluessel", "maulschluessel", "ratsche", "schrauber", "akkuschrauber",
                "schraubendreher", "schraubenzieher", "zange", "saege"],
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
  Flashlight:  ["stirnlampe", "taschenlampe"],
  Thermometer: ["fieberthermometer"],
  Clock:       ["wecker", "zeit", "armbanduhr"],
  Calendar:    ["terminkalender"],
  CakeSlice:   ["kuchen", "torte", "backform"],
  Flower2:     ["blume", "blumen", "bluete", "rose", "topfpflanze"],
  Wine:        ["weinglas", "sekt", "glas", "glaeser"],
  Dices:       ["wuerfelspiel", "spiel", "brettspiel", "gesellschaftsspiel"],
  // ── neue Icons ──
  Volleyball:  ["fussball", "handball", "basketball", "volleyball", "tennisball", "sportball"],
  Trophy:      ["trophaee", "medaille", "preis", "auszeichnung"],
  Shirt:       ["shirt", "tshirt", "hemd", "pullover", "pulli", "hose", "jacke", "kleid", "trikot"],
  Footprints:  ["schuh", "stiefel", "sneaker", "turnschuhe", "sandalen", "fussballschuhe", "hausschuhe"],
  Glasses:     ["sonnenbrille", "lesebrille"],
  Gem:         ["ring", "kette", "armband", "edelstein", "ohrringe"],
  Backpack:    ["schulranzen", "ranzen", "wanderrucksack"],
  Briefcase:   ["arbeitstasche", "laptoptasche", "geschaeftlich"],
  Luggage:     ["reisetasche", "trolley", "gepaeck"],
  Umbrella:    ["schirm", "sonnenschirm"],
  Wallet:      ["portemonnaie", "geldboerse", "brieftasche"],
  Coffee:      ["tasse", "becher", "kaffeemaschine", "teekanne", "tee"],
  Utensils:    ["gabel", "messer", "loeffel", "geschirr", "teller"],
  Lamp:        ["leuchte", "stehlampe", "nachttischlampe", "gluehbirne", "leuchtmittel"],
  Plug:        ["steckdose", "mehrfachstecker", "netzteil", "ladegeraet"],
  Cable:       ["verlaengerungskabel", "ladekabel", "hdmi"],
  Speaker:     ["boombox", "soundbar", "radio", "musikbox"],
  Printer:     ["scanner", "toner", "patronen"],
  Shovel:      ["spaten", "harke", "gartengeraete", "rechen"],
  Drill:       ["bohrmaschine", "schlagbohrer", "bohrhammer"],
  Leaf:        ["blatt", "kraut", "kraeuter", "saat", "samen", "laub"],
  TreePine:    ["tanne", "weihnachtsbaum", "christbaum"],
  Trash2:      ["abfall", "muelleimer", "tonne", "muellsack"],
  Gamepad2:    ["videospiel", "konsole", "playstation", "xbox", "nintendo", "controller", "gamepad", "zocken"],
  Guitar:      ["ukulele", "instrument", "instrumente", "bass"],
  Puzzle:      ["raetsel"],
  Paintbrush:  ["farbe", "farben", "malen", "lack", "wandfarbe"],
  Tent:        ["camping", "schlafsack", "isomatte"],
  Pill:        ["medikament", "tabletten", "apotheke", "verbandskasten", "pflaster"],
  Baby:        ["windel", "windeln", "kinderwagen", "schnuller", "kuscheltier"],
  Dog:         ["hund", "hundeleine", "napf", "leine"],
  Plane:       ["urlaub", "flug", "flugticket", "reisepass", "pass"],
  Ruler:       ["massband", "zollstock", "meterstab", "geodreieck"],
  Axe:         ["beil", "spalthammer", "holz"],
  Sparkles:    ["dekoration", "weihnachtsdeko", "lichterkette"],
  Flame:       ["feuer", "grill", "feuerzeug", "kamin"],
};

// ═════════════════════ ABLAGEORTE ══════════════════════════════════════════

// Zusatz-Begriffe je Emoji (Schlüssel = Bezeichnung in LOCATION_EMOJIS)
const LOCATION_EMOJI_KEYWORDS: Record<string, string[]> = {
  Schlafzimmer:           ["schlafen", "gaestezimmer", "bett"],
  Wohnzimmer:             ["stube", "wohnstube", "couch", "sofa"],
  Küche:                  ["speisekammer", "vorratskammer", "kochen"],
  Badezimmer:             ["bad", "dusche"],
  "Büro/Arbeitszimmer":   ["buero", "arbeitszimmer", "arbeitsplatz", "schreibtisch", "homeoffice"],
  "Flur/Diele":           ["flur", "diele", "eingang", "windfang", "vorraum", "hausflur"],
  Treppe:                 ["treppenhaus", "stiege", "leiter"],
  Keller:                 ["kellerraum"],
  Garage:                 ["carport"],
  Dachboden:              ["speicher", "dachgeschoss", "estrich", "spitzboden"],
  Schuppen:               [],
  Lagerraum:              ["lager", "abstellraum", "abstellkammer", "vorratsraum", "lagerhalle"],
  "Kiste/Box":            ["kiste", "box", "karton", "kasten", "truhe", "schachtel", "behaelter"],
  Regal:                  ["regale", "buecherregal", "bibliothek"],
  Schrank:                ["kommode", "spind", "wandschrank", "aktenschrank"],
  Garten:                 ["gemuesegarten", "beet", "wiese", "rasen"],
  Terrasse:               ["veranda", "loggia", "sitzplatz"],
  Hof:                    ["innenhof", "einfahrt"],
  Parkplatz:              ["stellplatz", "tiefgarage"],
  "Schuppen/Geräteschuppen": ["geraeteschuppen", "gartenschuppen"],
  Gartenhaus:             ["gartenlaube", "laube", "pavillon"],
  "Pool/Jacuzzi":         ["pool", "schwimmbad", "whirlpool", "jacuzzi", "schwimmbecken"],
  Werkstatt:              ["werkbank", "bastelraum", "schreinerei", "hobbywerkstatt"],
  Hobbyraum:              ["bastelzimmer", "bastelkeller", "hobbykeller"],
  Fitnessraum:            ["fitness", "sportraum", "trainingsraum", "kraftraum", "gym"],
  Spielzimmer:            ["spielkeller"],
  Musikzimmer:            ["musikraum", "proberaum", "studio"],
  Atelie:                 ["atelier", "malzimmer", "malraum"],
  "Kino/Medienraum":      ["kino", "medienraum", "heimkino", "fernsehzimmer", "tvzimmer"],
  Lounge:                 ["cafe", "aufenthaltsraum"],
};

// Zusatz-Begriffe je Icon (Schlüssel = Lucide-Name in LOCATION_ICONS)
const LOCATION_ICON_KEYWORDS: Record<string, string[]> = {
  House:           ["wohnung", "heim", "wohnhaus", "dachboden", "speicher"],
  Warehouse:       ["lager", "lagerhalle", "halle", "schuppen", "carport", "lagerraum"],
  Archive:         ["kiste", "archiv", "ablage"],
  Box:             ["box", "karton", "kasten", "schachtel"],
  Folder:          ["akten", "dokumente", "unterlagen"],
  Sofa:            ["couch", "wohnzimmer", "lounge"],
  Car:             ["fahrzeug", "kofferraum", "pkw"],
  Bike:            ["radkeller", "fahrradkeller", "bike"],
  Wrench:          ["werkstatt", "werkbank", "hobbywerkstatt", "bastelkeller"],
  UtensilsCrossed: ["kueche", "speisekammer", "vorratskammer", "vorrat"],
  Shirt:           ["kleiderschrank", "kleiderkammer", "garderobe", "waesche"],
  BookOpen:        ["buecher", "bibliothek", "buecherregal", "lesezimmer"],
  Armchair:        ["lesesessel"],
  BedDouble:       ["schlafzimmer", "bett", "gaestezimmer"],
  FileBox:         ["archivschrank", "buero", "arbeitszimmer", "schreibtisch"],
  Store:           ["geschaeft", "shop", "kiosk"],
  FlaskConical:    ["chemie"],
  Layers:          ["regal", "regale", "ebene"],
  ShoppingBag:     ["einkaufstasche"],
  Building2:       ["kellerraum", "abstellraum"],
  CakeSlice:       ["backen", "backzimmer"],
  Wine:            ["wein", "bar"],
  Dices:           ["spiele", "spielekeller", "kinderzimmer"],
  Flower2:         ["blume", "blumen", "pflanze", "pflanzen", "gewaechshaus", "wintergarten"],
};

// ═════════════════════ KERN ════════════════════════════════════════════════

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

/** Bezeichnung kann mehrere Wörter enthalten ("Büro/Arbeitszimmer") → jedes Teilwort ist ein Begriff */
function buildKeywords(label: string, extra: string[] = []): string[] {
  const parts = label.split(/[\/,]/);
  return Array.from(new Set([label, ...parts, ...extra].map(normKeyword).filter(Boolean)));
}

interface Candidate { value: string; keywords: string[] }

function emojiCandidates(
  groups: Record<string, { label: string; emoji: string }[]>,
  extra: Record<string, string[]>
): Candidate[] {
  return Object.values(groups).flat().map((e) => ({
    value: e.emoji,
    keywords: buildKeywords(e.label, extra[e.label]),
  }));
}

function iconCandidates(
  options: { label: string; name: string }[],
  extra: Record<string, string[]>
): Candidate[] {
  return options
    // nur Icons, die es in der installierten Lucide-Version wirklich gibt
    .filter((i) => i.name in LucideIcons)
    .map((i) => ({ value: i.name, keywords: buildKeywords(i.label, extra[i.name]) }));
}

const ITEM_EMOJI_CANDIDATES      = emojiCandidates(ITEM_ICONS, ITEM_EMOJI_KEYWORDS);
const ITEM_ICON_CANDIDATES       = iconCandidates(ITEM_ICON_OPTIONS, ITEM_ICON_KEYWORDS);
const LOCATION_EMOJI_CANDIDATES  = emojiCandidates(LOCATION_EMOJIS, LOCATION_EMOJI_KEYWORDS);
const LOCATION_ICON_CANDIDATES   = iconCandidates(LOCATION_ICONS, LOCATION_ICON_KEYWORDS);

/**
 * Trefferstärke eines Begriffs:
 *  - ganzes Wort gleich       → stark   ("blume" = "blume")
 *  - Begriff steckt im Wort   → mittel  ("blumentopf" enthält "blume", nur ab 4 Zeichen;
 *                                         am Wortende stärker: im Deutschen steht das Grundwort hinten)
 *  - Wort ist Anfang des Begriffs → schwach, damit schon beim Tippen etwas passt ("hamm" → "hammer")
 */
function score(tokens: string[], keyword: string): number {
  let best = 0;
  for (const t of tokens) {
    if (t === keyword) best = Math.max(best, 300 + keyword.length);
    else if (keyword.length >= 4 && t.includes(keyword)) {
      best = Math.max(best, 200 + keyword.length + (t.endsWith(keyword) ? 50 : 0));
    } else if (t.length >= 4 && keyword.startsWith(t)) best = Math.max(best, 100 + t.length);
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

// ═════════════════════ ÖFFENTLICHE FUNKTIONEN ══════════════════════════════

/** Gegenstand: passendes Emoji zum Namen oder null */
export function suggestEmoji(name: string): string | null {
  return pick(name, ITEM_EMOJI_CANDIDATES);
}

/** Gegenstand: passender Lucide-Icon-Name zum Namen oder null */
export function suggestIcon(name: string): string | null {
  return pick(name, ITEM_ICON_CANDIDATES);
}

/** Ablageort: passendes Emoji zum Namen oder null */
export function suggestLocationEmoji(name: string): string | null {
  return pick(name, LOCATION_EMOJI_CANDIDATES);
}

/** Ablageort: passender Lucide-Icon-Name zum Namen oder null */
export function suggestLocationIcon(name: string): string | null {
  return pick(name, LOCATION_ICON_CANDIDATES);
}

/** Nur Icons, die in der installierten Lucide-Version existieren (für die Auswahl im Formular) */
export function availableIcons<T extends { name: string }>(options: T[]): T[] {
  return options.filter((o) => o.name in LucideIcons);
}
