/**
 * Druckbares Schild mit dem Gäste-QR-Code (z. B. für Kühlschrank oder Eingangsbereich).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getPublicInventory } from "@/lib/utils/public-inventory";
import { PrintButton } from "@/components/public/PrintButton";

export const dynamic = "force-dynamic";

// Live immer die eigene Domain (unabhängig von der Vercel-Einstellung), lokal die Dev-Adresse
const APP_URL = process.env.NODE_ENV === "production"
  ? "https://app.madetofind.de"
  : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

interface Props { params: Promise<{ token: string }> }

export const metadata: Metadata = {
  title:  "QR-Schild drucken",
  robots: { index: false, follow: false },
};

export default async function GuestSignPage({ params }: Props) {
  const { token } = await params;
  const data = await getPublicInventory(token);
  if (!data) notFound();

  const svg = await QRCode.toString(`${APP_URL}/g/${token}`, {
    type: "svg", margin: 0, errorCorrectionLevel: "M",
  });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white flex flex-col items-center gap-6 py-8 print:py-0">
      <style>{`@page { size: A5 portrait; margin: 12mm; }`}</style>

      <PrintButton />

      <div className="w-[148mm] max-w-full bg-white rounded-2xl shadow-lg print:shadow-none print:rounded-none p-10 flex flex-col items-center text-center text-slate-900">
        <p className="text-sm font-semibold tracking-wide uppercase text-blue-600">Willkommen!</p>
        <h1 className="text-3xl font-bold mt-2 leading-tight">Wo ist eigentlich …?</h1>
        <p className="text-base text-slate-600 mt-3 max-w-[100mm]">
          Scanne den Code mit deiner Handy-Kamera und sieh sofort, wo in <strong>{data.group_name}</strong> alles liegt.
        </p>

        <div className="w-[75mm] h-[75mm] mt-8 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: svg }} />

        <p className="text-xs text-slate-500 mt-6">Keine App, keine Anmeldung nötig.</p>

        <div className="flex items-center gap-2 mt-8 pt-5 border-t border-slate-200 w-full justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192x192.png" alt="" className="h-6 w-6 rounded-md" />
          <span className="text-xs text-slate-500">Erstellt mit <strong className="text-slate-700">MaDe to find</strong> · madetofind.de</span>
        </div>
      </div>
    </div>
  );
}
