import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung · MaDe to find",
};

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: "#111827", minHeight: "100vh" }}>
      <div style={{
        maxWidth: "720px", margin: "0 auto", padding: "48px 24px",
        fontFamily: "system-ui, sans-serif", color: "#e2e8f0", lineHeight: "1.7"
      }}>
        <a href="/" style={{ color: "#60a5fa", textDecoration: "none", fontSize: "14px", display: "inline-block", marginBottom: "32px" }}>
          ← Zurück zur App
        </a>

        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px", color: "#fff" }}>
          Datenschutzerklärung
        </h1>
        <p style={{ color: "#64748b", marginBottom: "40px" }}>
          Letzte Aktualisierung: November 2026
        </p>

        {[
          {
            title: "1. Verantwortlicher",
            content: (
              <p style={{ color: "#94a3b8" }}>
                Diese App wird privat betrieben. Bei Fragen zum Datenschutz:<br /><br />
                <strong style={{ color: "#e2e8f0" }}>MaDe to find</strong><br />
                E-Mail: <a href="mailto:madetofind@web.de" style={{ color: "#60a5fa" }}>madetofind@web.de</a>
              </p>
            )
          },
          {
            title: "2. Welche Daten wir erheben",
            content: (
              <>
                <p style={{ color: "#94a3b8", marginBottom: "12px" }}>Zur Nutzung der App ist eine Registrierung erforderlich. Dabei erheben wir:</p>
                <ul style={{ color: "#94a3b8", paddingLeft: "20px" }}>
                  <li>E-Mail-Adresse (für Anmeldung und Einladungen)</li>
                  <li>Optionaler Anzeigename</li>
                  <li>Von Ihnen eingegebene Inhalte (Ablageorte, Gegenstände)</li>
                  <li>Gruppe und Mitgliedschaften</li>
                </ul>
              </>
            )
          },
          {
            title: "3. Zweck der Datenverarbeitung",
            content: (
              <>
                <p style={{ color: "#94a3b8", marginBottom: "8px" }}>Die erhobenen Daten werden ausschließlich zur Bereitstellung der App-Funktionen verwendet:</p>
                <ul style={{ color: "#94a3b8", paddingLeft: "20px" }}>
                  <li>Verwaltung von Ablageorten und Gegenständen</li>
                  <li>Geteilter Zugriff innerhalb von Gruppen</li>
                  <li>Benachrichtigungen über Gruppenaktivitäten</li>
                </ul>
              </>
            )
          },
          {
            title: "4. Datenspeicherung",
            content: (
              <p style={{ color: "#94a3b8" }}>
                Alle Daten werden sicher bei <strong style={{ color: "#e2e8f0" }}>Supabase</strong> (EU-Server) gespeichert.
                Die App wird über <strong style={{ color: "#e2e8f0" }}>Vercel</strong> bereitgestellt.
              </p>
            )
          },
          {
            title: "5. Weitergabe an Dritte",
            content: (
              <p style={{ color: "#94a3b8" }}>
                Ihre Daten werden nicht an Dritte verkauft oder zu Werbezwecken verwendet.
                Eine Weitergabe erfolgt nur an die genutzten Infrastruktur-Dienstleister (Supabase, Vercel).
              </p>
            )
          },
          {
            title: "6. Ihre Rechte",
            content: (
              <p style={{ color: "#94a3b8" }}>
                Sie haben das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten.
                Zur Löschung Ihres Kontos wenden Sie sich bitte per E-Mail an uns.
              </p>
            )
          },
          {
            title: "7. Cookies",
            content: (
              <p style={{ color: "#94a3b8" }}>
                Die App verwendet technisch notwendige Cookies für die Anmeldung und den aktiven Gruppenkontext.
                Auf unseren eigenen Seiten werden keine Tracking- oder Werbe-Cookies eingesetzt und keine Skripte von Werbenetzwerken geladen.
              </p>
            )
          },
          {
            title: "8. Amazon-Partnerprogramm",
            content: (
              <p style={{ color: "#94a3b8" }}>
                Wir nehmen am Partnerprogramm von Amazon EU teil. In der App und im Ratgeber findest du mit „Anzeige“
                gekennzeichnete Links zu amazon.de. Wenn du über einen solchen Link bei Amazon einkaufst, erhalten wir eine
                Provision; für dich ändert sich der Preis nicht. Beim Klick auf einen solchen Link wird eine Verbindung zu
                Amazon hergestellt, und Amazon kann Cookies setzen, um den Kauf unserer Seite zuzuordnen. Auf unseren eigenen
                Seiten werden dafür keine Skripte von Amazon geladen und keine Daten von dir an Amazon übermittelt, bevor du
                den Link anklickst. Informationen zur Datenverarbeitung durch Amazon findest du in der Datenschutzerklärung
                von Amazon.
                <br /><br />
                <em>Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.</em>
              </p>
            )
          },
          {
            title: "9. Push-Benachrichtigungen",
            content: (
              <p style={{ color: "#94a3b8" }}>
                Wenn du in den Einstellungen Benachrichtigungen einschaltest, speichern wir für dein Gerät eine technische
                Zustelladresse (Push-Abonnement) zusammen mit deinem Konto. Die Meldungen werden über den Push-Dienst deines
                Browsers bzw. Betriebssystems zugestellt (z. B. Google, Apple oder Mozilla). Du kannst die Benachrichtigungen
                jederzeit in den Einstellungen der App oder deines Geräts wieder ausschalten; das Abonnement wird dann gelöscht.
              </p>
            )
          },
          {
            title: "10. Kontakt",
            content: (
              <p style={{ color: "#94a3b8" }}>
                Bei Fragen zum Datenschutz:{" "}
                <a href="mailto:madetofind@web.de" style={{ color: "#60a5fa" }}>madetofind@web.de</a>
              </p>
            )
          },
        ].map(({ title, content }) => (
          <section key={title} style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#fff", marginBottom: "12px" }}>
              {title}
            </h2>
            {content}
          </section>
        ))}
      </div>
    </div>
  );
}
