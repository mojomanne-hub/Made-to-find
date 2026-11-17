"use client";

import { useEffect, useRef, useState } from "react";
import { X, Keyboard } from "lucide-react";

interface BarcodeScannerProps {
  /** Wird einmal aufgerufen, sobald ein Code erkannt (oder von Hand eingegeben) wurde */
  onDetected: (code: string) => void;
  onClose: () => void;
  title?: string;
}

type Decoder = (video: HTMLVideoElement) => Promise<string | null>;

const NATIVE_FORMATS = ["qr_code", "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "data_matrix"];

/**
 * Erkennung in jeder Lage (waagrecht, senkrecht, auf dem Kopf):
 * 1. Wenn das Handy eine eingebaute Barcode-Erkennung hat (Chrome auf Android): die nehmen –
 *    sie ist schnell und erkennt Codes in jeder Ausrichtung.
 * 2. Sonst die Bibliothek ZXing. Sie liest Strichcodes nur waagrecht, deshalb wird jedes Bild
 *    zusätzlich um 90° gedreht geprüft.
 */
async function createDecoder(): Promise<Decoder> {
  type NativeDetector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
  const BD = (window as unknown as {
    BarcodeDetector?: { new (o: { formats: string[] }): NativeDetector; getSupportedFormats?: () => Promise<string[]> };
  }).BarcodeDetector;
  if (BD) {
    try {
      const supported = (await BD.getSupportedFormats?.()) ?? [];
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
      if (formats.includes("ean_13") && formats.includes("qr_code")) {
        const detector = new BD({ formats });
        return async (video) => {
          const codes = await detector.detect(video);
          return codes.find((c) => c.rawValue)?.rawValue ?? null;
        };
      }
    } catch { /* weiter mit ZXing */ }
  }

  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF, BarcodeFormat.DATA_MATRIX,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new BrowserMultiFormatReader(hints);

  const canvas  = document.createElement("canvas");
  const rotated = document.createElement("canvas");
  const MAX = 960;   // kleiner rechnen = schneller, reicht für die Erkennung

  const tryCanvas = (c: HTMLCanvasElement) => {
    try { return reader.decodeFromCanvas(c).getText(); } catch { return null; }
  };

  return async (video) => {
    const scale = Math.min(1, MAX / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);

    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const straight = tryCanvas(canvas);
    if (straight) return straight;

    // Um 90° gedreht – für senkrecht gehaltene Strichcodes
    rotated.width = h; rotated.height = w;
    const rctx = rotated.getContext("2d", { willReadFrequently: true });
    if (!rctx) return null;
    rctx.setTransform(0, 1, -1, 0, h, 0);
    rctx.drawImage(canvas, 0, 0);
    rctx.setTransform(1, 0, 0, 1, 0, 0);
    return tryCanvas(rotated);
  };
}

/**
 * Vollbild-Scanner für QR-Codes und Barcodes (EAN/UPC/Code128 …).
 * Die Scanner-Bibliothek wird erst beim Öffnen geladen, die restliche App bleibt klein.
 * Fallback: Code von Hand eingeben (falls Kamera fehlt oder nicht erlaubt ist).
 */
export function BarcodeScanner({ onDetected, onClose, title = "Code scannen" }: BarcodeScannerProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const doneRef   = useRef(false);
  const cbRef     = useRef(onDetected);
  cbRef.current   = onDetected;

  const [error,  setError]  = useState<string | null>(null);
  const [ready,  setReady]  = useState(false);
  const [manual, setManual] = useState("");

  function finish(code: string) {
    const clean = code.trim();
    if (!clean || doneRef.current) return;
    doneRef.current = true;
    try { navigator.vibrate?.(60); } catch { /* ignorieren */ }
    cbRef.current(clean);
  }

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | null = null;

    async function start() {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          setError("Dieser Browser kann die Kamera nicht nutzen. Du kannst den Code unten von Hand eingeben.");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});

        const decode = await createDecoder();
        if (cancelled) return;
        setReady(true);

        // Etwa 6–7 Versuche pro Sekunde – schnell genug, ohne das Handy unnötig zu belasten
        const tick = async () => {
          if (cancelled || doneRef.current) return;
          if (video.readyState >= 2 && video.videoWidth > 0) {
            const text = await decode(video).catch(() => null);
            if (text) { finish(text); return; }
          }
          timer = window.setTimeout(tick, 150);
        };
        tick();
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setError("Kamerazugriff nicht erlaubt. Erlaube die Kamera in den Einstellungen deines Browsers bzw. der App, oder gib den Code unten von Hand ein.");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setError("Es wurde keine Kamera gefunden. Du kannst den Code unten von Hand eingeben.");
        } else if (name === "NotReadableError") {
          setError("Die Kamera wird gerade von einer anderen App verwendet.");
        } else {
          setError("Der Scanner konnte nicht gestartet werden. Du kannst den Code unten von Hand eingeben.");
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Escape schließt
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ backgroundColor: "#020617" }}>
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-300 hover:bg-slate-800"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
        {!error && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="aspect-square w-[70%] max-w-xs rounded-2xl border-2" style={{ borderColor: "#60a5fa", boxShadow: "0 0 0 9999px rgba(2,6,23,0.55)" }} />
            </div>
            <p className="absolute bottom-4 inset-x-0 text-center text-xs text-slate-300">
              {ready ? "Code in den Rahmen halten – waagrecht oder senkrecht" : "Kamera wird gestartet …"}
            </p>
          </>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="max-w-sm text-center text-sm text-slate-300">{error}</p>
          </div>
        )}
      </div>

      {/* Von Hand eingeben */}
      <div className="px-4 py-3 space-y-2" style={{ borderTop: "1px solid #1e293b" }}>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <Keyboard className="h-3.5 w-3.5" /> Oder Code von Hand eingeben
        </label>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); finish(manual); } }}
            placeholder="z. B. 4001234567890"
            maxLength={64}
            inputMode="text"
            className="input-base flex-1"
          />
          <button
            type="button"
            onClick={() => finish(manual)}
            disabled={!manual.trim()}
            className="rounded-xl px-4 text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: "#2563eb" }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
