"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";

export function IOSInstallButton() {
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    setIsIOS(isIOSDevice && !isStandalone);
  }, []);

  if (!isIOS) return null;

  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0"
        title="App installieren"
      >
        <Download className="h-5 w-5" />
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowGuide(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #2d3f55" }}>
              <h2 className="text-sm font-semibold text-slate-100">App installieren</h2>
              <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-400">
                Auf iPhone/iPad kannst du MaDe to find als App zu deinem Home-Bildschirm hinzufügen:
              </p>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-brand-900/50 flex items-center justify-center flex-shrink-0 text-brand-400 text-sm font-bold">
                  1
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-sm text-slate-300">Tippe unten auf</span>
                  <span className="h-7 w-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <Share className="h-4 w-4 text-slate-200" />
                  </span>
                  <span className="text-sm text-slate-300">(Teilen)</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-brand-900/50 flex items-center justify-center flex-shrink-0 text-brand-400 text-sm font-bold">
                  2
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-sm text-slate-300">Wähle</span>
                  <span className="h-7 w-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <PlusSquare className="h-4 w-4 text-slate-200" />
                  </span>
                  <span className="text-sm text-slate-300">„Zum Home-Bildschirm"</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 pt-2">
                Danach findest du MaDe to find wie eine normale App auf deinem Home-Bildschirm.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
