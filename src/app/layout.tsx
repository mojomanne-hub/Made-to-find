/**
 * Root Layout
 * Lädt Schriftarten, setzt Metadaten und Viewport.
 * Kein visuelles Markup – das übernehmen die Route-Group-Layouts.
 */

import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default:  "MaDe to find",
    template: "%s · MaDe to find",
  },
  description:
    "Verwalte deine Ablageorte und Artikel. Finde alles sofort wieder.",
  icons: { icon: "/icons/favicon.ico" },
};

export const viewport: Viewport = {
  width:         "device-width",
  initialScale:  1,
  maximumScale:  1,
  viewportFit:   "cover", // iOS Safe Area
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
