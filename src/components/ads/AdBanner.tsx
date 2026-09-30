"use client";

/**
 * AdBanner – Google AdSense Banner Komponente
 * Wird nur angezeigt wenn AdSense genehmigt ist.
 * 
 * Verwendung:
 * <AdBanner slot="DEIN-SLOT-ID" />
 */

import { useEffect, useRef } from "react";

interface AdBannerProps {
  slot:   string;          // AdSense Anzeigenblock-ID
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  style?:  React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdBanner({ slot, format = "auto", style }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense error:", err);
    }
  }, []);

  return (
    <div
      className="w-full overflow-hidden rounded-xl"
      style={{ minHeight: "60px", ...style }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-8085473899262156"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
