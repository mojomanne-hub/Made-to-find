/**
 * App-Konstanten – alle Magic Numbers an einem Ort.
 * Importiere immer von hier, nie hardcoden.
 */

// ---- Suche ------------------------------------------------
export const SEARCH_MIN_LENGTH    = 2;   // Mindestlänge für Suchanfragen
export const SEARCH_DEBOUNCE_MS   = 300; // Debounce-Verzögerung in ms
export const SEARCH_MAX_ITEMS     = 20;  // Max. Artikel-Ergebnisse
export const SEARCH_MAX_LOCATIONS = 10;  // Max. Ablageort-Ergebnisse

// ---- Pagination -------------------------------------------
export const ITEMS_PER_PAGE     = 30; // Artikel pro Seite / Infinite-Scroll-Batch
export const LOCATIONS_PER_PAGE = 50; // Ablageorte pro Seite (selten > 50)

// ---- Validierung ------------------------------------------
export const LOCATION_NAME_MAX     = 100;
export const LOCATION_DESC_MAX     = 500;
export const ITEM_NAME_MAX         = 200;
export const ITEM_DESC_MAX         = 1000;
export const ITEM_QUANTITY_MAX     = 9999;
export const DISPLAY_NAME_MAX      = 50;
export const PASSWORD_MIN_LENGTH   = 8;

// ---- Farben für Ablageorte (Auswahl-Palette in der UI) ----
export const LOCATION_COLORS: { label: string; value: string }[] = [
  { label: "Blau",    value: "#3b82f6" },
  { label: "Grün",    value: "#22c55e" },
  { label: "Rot",     value: "#ef4444" },
  { label: "Orange",  value: "#f97316" },
  { label: "Lila",    value: "#a855f7" },
  { label: "Pink",    value: "#ec4899" },
  { label: "Gelb",    value: "#eab308" },
  { label: "Grau",    value: "#6b7280" },
  { label: "Schwarz", value: "#171717" },
];

// ---- Routen -----------------------------------------------
export const ROUTES = {
  home:              "/",
  login:             "/login",
  register:          "/register",
  forgotPassword:    "/forgot-password",
  resetPassword:     "/reset-password",
  dashboard:         "/dashboard",
  locations:         "/locations",
  locationNew:       "/locations/new",
  locationDetail:    (id: string) => `/locations/${id}`,
  locationEdit:      (id: string) => `/locations/${id}/edit`,
  items:             "/items",
  itemNew:           "/items/new",
  itemNewAtLocation: (locationId: string) => `/items/new?location=${locationId}`,
  itemDetail:        (id: string) => `/items/${id}`,
  itemEdit:          (id: string) => `/items/${id}/edit`,
  search:            "/search",
  settings:          "/settings",
  groups:            "/groups",
  groupJoin:         (token: string) => `/join/${token}`,
} as const;

// ---- Icons für Ablageorte (Lucide Icons) --------------------
export const LOCATION_ICONS: { label: string; name: string }[] = [
  { label: "Haus",         name: "House" },
  { label: "Garage",       name: "Warehouse" },
  { label: "Kiste",        name: "Archive" },
  { label: "Box",          name: "Box" },
  { label: "Ordner",       name: "Folder" },
  { label: "Sofa",         name: "Sofa" },
  { label: "Auto",         name: "Car" },
  { label: "Fahrrad",      name: "Bike" },
  { label: "Werkzeug",     name: "Wrench" },
  { label: "Küche",        name: "UtensilsCrossed" },
  { label: "Kleidung",     name: "Shirt" },
  { label: "Buch",         name: "BookOpen" },
  { label: "Sessel",       name: "Armchair" },
  { label: "Bett",         name: "BedDouble" },
  { label: "Aktenschrank", name: "FileBox" },
  { label: "Laden",        name: "Store" },
  { label: "Labor",        name: "FlaskConical" },
  { label: "Stapel",       name: "Layers" },
  { label: "Einkauf",      name: "ShoppingBag" },
  { label: "Keller",       name: "Building2" },
  { label: "Kuchenform",   name: "CakeSlice" },
  { label: "Weinkeller",   name: "Wine" },
  { label: "Spielzimmer",  name: "Dices" },
];

// ---- Emojis für Ablageorte (nach Kategorien) ----
export const LOCATION_EMOJIS = {
  zimmer: [
    { label: "Schlafzimmer", emoji: "🛏️" },
    { label: "Wohnzimmer", emoji: "🛋️" },
    { label: "Küche", emoji: "🍳" },
    { label: "Badezimmer", emoji: "🚿" },
    { label: "Büro/Arbeitszimmer", emoji: "🖥️" },
    { label: "Flur/Diele", emoji: "🚪" },
    { label: "Treppe", emoji: "🪜" },
  ],
  lagerung: [
    { label: "Keller", emoji: "🏚️" },
    { label: "Garage", emoji: "🚗" },
    { label: "Dachboden", emoji: "🏠" },
    { label: "Schuppen", emoji: "🏗️" },
    { label: "Lagerraum", emoji: "📦" },
    { label: "Kiste/Box", emoji: "📮" },
    { label: "Regal", emoji: "📚" },
    { label: "Schrank", emoji: "🗄️" },
  ],
  außen: [
    { label: "Garten", emoji: "🌳" },
    { label: "Terrasse", emoji: "🪑" },
    { label: "Balkon", emoji: "🌿" },
    { label: "Hof", emoji: "🏡" },
    { label: "Parkplatz", emoji: "🅿️" },
    { label: "Schuppen/Geräteschuppen", emoji: "⚒️" },
    { label: "Gartenhaus", emoji: "🏘️" },
    { label: "Pool/Jacuzzi", emoji: "🏊" },
  ],
  hobby: [
    { label: "Werkstatt", emoji: "🔧" },
    { label: "Hobbyraum", emoji: "🎨" },
    { label: "Fitnessraum", emoji: "💪" },
    { label: "Spielzimmer", emoji: "🎮" },
    { label: "Musikzimmer", emoji: "🎵" },
    { label: "Atelie", emoji: "🖌️" },
    { label: "Kino/Medienraum", emoji: "🎬" },
    { label: "Lounge", emoji: "☕" },
  ],
};

// ---- Icons für Gegenstände --------------------------------
export const ITEM_ICONS = {
  kueche: [
    { label: "Kuchenform", emoji: "🍰" },
    { label: "Glas/Krug", emoji: "🥤" },
    { label: "Topf", emoji: "🍳" },
    { label: "Besteck", emoji: "🍴" },
    { label: "Thermometer", emoji: "🌡️" },
    { label: "Wein", emoji: "🍷" },
  ],
  elektronik: [
    { label: "Laptop", emoji: "💻" },
    { label: "Handy", emoji: "📱" },
    { label: "Kamera", emoji: "📷" },
    { label: "Kopfhörer", emoji: "🎧" },
    { label: "Radio", emoji: "📻" },
    { label: "Batterie", emoji: "🔋" },
  ],
  werkzeug: [
    { label: "Reifen", emoji: "🛞" },
    { label: "Werkzeug", emoji: "🔧" },
    { label: "Verlängerungskabel", emoji: "🔌" },
    { label: "Glühbirnen", emoji: "💡" },

  ],
  wohnen: [
    { label: "Stuhl", emoji: "🪑" },
    { label: "Regal", emoji: "📚" },
    { label: "Bett", emoji: "🛏️" },
    { label: "Schrank", emoji: "🗄️" },
    { label: "Ordner", emoji: "📂" },
  ],
  kleidung: [
    { label: "Shirt", emoji: "👕" },
    { label: "Schuhe", emoji: "👟" },
    { label: "Schmuck", emoji: "💍" },
    { label: "Uhr", emoji: "⌚" },
    { label: "Koffer", emoji: "🧳" },
  ],
  "spiele/hobby": [
    { label: "Kartenspiel", emoji: "🃏" },
    { label: "Würfelspiel", emoji: "🎲" },
    { label: "Videospiel", emoji: "🎮" },
    { label: "Ball", emoji: "⚽" },
    { label: "Instrumente", emoji: "🎸" },
  ],
};

// ============ HELPER FUNCTIONS ============
export function getLocationEmojisByCategory(category: string) {
  return LOCATION_EMOJIS[category as keyof typeof LOCATION_EMOJIS] || [];
}

export function getItemsByCategory(category: string) {
  return ITEM_ICONS[category as keyof typeof ITEM_ICONS] || [];
}

export function getAllLocationEmojis() {
  return Object.values(LOCATION_EMOJIS).flat();
}

export function getAllIcons() {
  return Object.values(ITEM_ICONS).flat();
}
