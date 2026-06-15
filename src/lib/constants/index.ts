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

// ---- Icons für Ablageorte (bereinigt) --------------------
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
];

// ---- Icons für Gegenstände --------------------------------
export const ITEM_ICONS: { label: string; name: string }[] = [
  // Werkzeug & Haushalt
  { label: "Werkzeug",      name: "Wrench" },
  { label: "Hammer",        name: "Hammer" },
  { label: "Schrauber",     name: "Drill" },
  { label: "Schere",        name: "Scissors" },
  { label: "Glühbirne",     name: "Lightbulb" },
  { label: "Stecker",       name: "Plug" },
  // Küche
  { label: "Kuchenform",    name: "Utensils" },
  { label: "Töpfe",         name: "ChefHat" },
  { label: "Messer",        name: "UtensilsCrossed" },
  { label: "Thermometer",   name: "Thermometer" },
  // Kleidung & Accessoires
  { label: "Kleidung",      name: "Shirt" },
  { label: "Schuhe",        name: "Footprints" },
  { label: "Uhr",           name: "Watch" },
  { label: "Koffer",        name: "Luggage" },
  // Elektronik
  { label: "Laptop",        name: "Laptop" },
  { label: "Handy",         name: "Smartphone" },
  { label: "Kamera",        name: "Camera" },
  { label: "Kopfhörer",     name: "Headphones" },
  { label: "Kabel",         name: "Cable" },
  { label: "Batterie",      name: "Battery" },
  // Dokumente & Büro
  { label: "Dokument",      name: "FileText" },
  { label: "Schlüssel",     name: "KeyRound" },
  { label: "Buch",          name: "BookOpen" },
  { label: "Ordner",        name: "Folder" },
  // Sport & Freizeit
  { label: "Sport",         name: "Dumbbell" },
  { label: "Fahrrad",       name: "Bike" },
  { label: "Ball",          name: "CircleDot" },
  // Sonstiges
  { label: "Medizin",       name: "Pill" },
  { label: "Geschenk",      name: "Gift" },
  { label: "Box",           name: "Box" },
];
