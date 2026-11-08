/**
 * Ratgeber-Artikel (öffentlich, ohne Login) – bringen Besucher aus Google zur App.
 * Neuen Artikel anlegen: einfach ein weiteres Objekt unten ergänzen, fertig (Seite + Übersicht entstehen automatisch).
 */

export interface Section { heading: string; paragraphs: string[]; list?: string[] }

export interface Article {
  slug: string;
  title: string;
  description: string;       // für Google (ca. 150 Zeichen)
  emoji: string;
  date: string;              // ISO, z. B. "2026-11-05"
  intro: string;
  sections: Section[];
  /** Suchbegriffe für die Amazon-Tipps am Ende (Überschrift + Suchanfrage) */
  products: { label: string; query: string }[];
}

export const ARTICLES: Article[] = [
  {
    slug: "keller-aufraeumen",
    title: "Keller aufräumen: In 6 Schritten zu dauerhafter Ordnung",
    description: "So räumst du deinen Keller in einem Wochenende auf: aussortieren, Kategorien bilden, Boxen beschriften und alles später wiederfinden.",
    emoji: "🏚️",
    date: "2026-11-05",
    intro:
      "Im Keller landet alles, was „irgendwann mal“ gebraucht wird – und genau deshalb findet man es nie. Mit einem klaren Ablauf schaffst du es an einem Wochenende, und mit einer einfachen Methode bleibt es auch danach ordentlich.",
    sections: [
      {
        heading: "1. Alles raus und ehrlich sortieren",
        paragraphs: [
          "Bring alles an einen Ort, an dem du Platz hast, zum Beispiel in die Garage oder auf den Flur. Bilde drei Stapel: behalten, verschenken oder verkaufen, entsorgen.",
          "Eine gute Faustregel: Was du seit zwei Jahren nicht benutzt hast und nicht aus emotionalen Gründen aufbewahrst, kann gehen.",
        ],
      },
      {
        heading: "2. Kategorien statt Zufall",
        paragraphs: ["Sortiere das, was bleibt, nach Kategorien – nicht nach Größe oder Fundort."],
        list: ["Werkzeug & Heimwerken", "Saisonales (Weihnachten, Camping, Garten)", "Haushalt & Vorräte", "Dokumente & Erinnerungen", "Sport & Freizeit"],
      },
      {
        heading: "3. Feste Plätze festlegen",
        paragraphs: [
          "Jede Kategorie bekommt einen festen Platz, am besten in einem eigenen Regalfach. Oft Gebrauchtes steht auf Augenhöhe, Selten-Gebrauchtes ganz oben oder unten.",
        ],
      },
      {
        heading: "4. Einheitliche Boxen und klare Beschriftung",
        paragraphs: [
          "Gleiche, stapelbare Boxen sparen Platz und sehen ruhig aus. Beschrifte jede Box von außen mit Inhalt und Datum – so musst du nie wieder fünf Kartons öffnen.",
        ],
      },
      {
        heading: "5. Ordnung festhalten, damit du alles wiederfindest",
        paragraphs: [
          "Der größte Fehler: Man räumt auf, aber nach drei Monaten weiß niemand mehr, was in welcher Kiste steckt. Schreib deshalb auf, was wo liegt – am einfachsten digital, mit Foto und Suchfunktion.",
          "Genau dafür gibt es „MaDe to find“: Du legst den Keller als Ablageort an, erfasst Kisten und Fächer und findest jeden Gegenstand später über die Suche.",
        ],
      },
      {
        heading: "6. Einmal im Jahr kurz prüfen",
        paragraphs: ["Plane einen festen Termin, zum Beispiel im Herbst, und sortiere nur kurz nach. So bleibt aus dem Wochenend-Projekt kein Großprojekt."],
      },
    ],
    products: [
      { label: "Stapelbare Aufbewahrungsboxen mit Deckel", query: "Aufbewahrungsbox mit Deckel stapelbar" },
      { label: "Steckregal für den Keller", query: "Kellerregal Steckregal belastbar" },
      { label: "Etiketten zum Beschriften", query: "Etiketten selbstklebend Beschriftung Aufbewahrung" },
    ],
  },
  {
    slug: "inventarliste-hausrat",
    title: "Inventarliste für die Hausratversicherung: So erstellst du sie richtig",
    description: "Warum eine Inventarliste im Schadensfall hilft und wie du sie mit Fotos, Belegen und Seriennummern Schritt für Schritt anlegst.",
    emoji: "🧾",
    date: "2026-11-05",
    intro:
      "Nach einem Einbruch, Brand oder Wasserschaden muss man oft belegen, was man besaß. Wer eine aktuelle Inventarliste hat, ist klar im Vorteil – und sie lässt sich mit etwas Struktur schnell anlegen.",
    sections: [
      {
        heading: "Warum sich eine Inventarliste lohnt",
        paragraphs: [
          "Im Schadensfall fragt die Versicherung nach Gegenständen und deren Wert. Ohne Liste vergisst man Dinge schnell – gerade Kleinteile, die zusammen viel Geld ausmachen. Welche Nachweise deine Versicherung konkret verlangt, steht in deinen Vertragsbedingungen oder erfährst du bei deinem Versicherer.",
        ],
      },
      {
        heading: "Was in die Liste gehört",
        paragraphs: ["Für jeden wichtigen Gegenstand lohnen sich diese Angaben:"],
        list: ["Bezeichnung und Anzahl", "Ablageort (Raum, Schrank, Fach)", "Foto", "Kaufdatum und Kaufpreis, wenn bekannt", "Seriennummer bei Elektronik", "Beleg oder Rechnung als Foto"],
      },
      {
        heading: "Raum für Raum vorgehen",
        paragraphs: [
          "Geh Zimmer für Zimmer durch und beginne mit den wertvollsten Bereichen: Wohnzimmer (Technik), Arbeitszimmer, Schlafzimmer (Schmuck, Kleidung), Keller und Garage (Werkzeug, Fahrräder).",
          "Fotografiere Schränke offen und geschlossen. Ein Foto pro Schrank mit sichtbarem Inhalt ist schon eine gute Grundlage.",
        ],
      },
      {
        heading: "Digital statt Zettelwirtschaft",
        paragraphs: [
          "Eine Liste auf Papier brennt mit der Wohnung ab. Digital ist sie jederzeit verfügbar – auf dem Handy und in der Cloud. In „MaDe to find“ legst du Ablageorte und Gegenstände mit Foto an, und alles bleibt durchsuchbar und von überall erreichbar.",
        ],
      },
      {
        heading: "Aktuell halten",
        paragraphs: ["Ergänze größere Neuanschaffungen gleich beim Kauf und prüfe die Liste einmal im Jahr. So bleibt sie ohne großen Aufwand aktuell."],
      },
    ],
    products: [
      { label: "Archivboxen für Belege und Dokumente", query: "Archivbox Ordner Dokumente Aufbewahrung" },
      { label: "Feuerfeste Dokumentenbox", query: "feuerfeste Dokumentenbox abschließbar" },
      { label: "Etikettendrucker", query: "Etikettendrucker Beschriftungsgerät" },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
