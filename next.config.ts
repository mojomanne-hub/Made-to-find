import type { NextConfig } from "next";

/** Sicherheits-Header für alle Seiten */
const securityHeaders = [
  // Seite darf nicht in fremde Seiten eingebettet werden (Schutz vor Klick-Täuschung)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Browser soll Dateitypen nicht raten
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Beim Klick auf fremde Links nur die Domain weitergeben, nicht die ganze Adresse
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Kamera nur für die eigene Seite (Scanner), Mikrofon und Standort gar nicht
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        // Supabase Storage – alle Projekte erlauben
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
