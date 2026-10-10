"use client";

import { useEffect, useRef } from "react";

interface AdBannerProps {
  /** Die data-ad-slot ID aus deinem AdSense-Dashboard */
  slot: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdBanner({ slot }: AdBannerProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    // Verhindert doppeltes Laden derselben Anzeige (z.B. bei React Strict Mode)
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense-Skript evtl. noch nicht geladen – kein Fehler werfen
    }
  }, []);

  return (
    <div className="w-full flex justify-center my-4">
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client="ca-pub-8085473899262156"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
