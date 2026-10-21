"use client";

import { useState, useEffect, useRef } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Check, X, RotateCcw, RotateCw } from "lucide-react";

interface ImageCropperProps {
  imageSrc:  string;
  onCrop:    (blob: Blob) => void;
  onCancel:  () => void;
  aspect?:   number; // optional – ohne = freier Rahmen, der sich per Ziehen anpassen lässt
}

type Mode = "free" | "square" | "wide" | "tall";

const MODES: { id: Mode; label: string; aspect?: number }[] = [
  { id: "free",   label: "Frei" },
  { id: "square", label: "Quadrat",   aspect: 1 },
  { id: "wide",   label: "Breit 4:3", aspect: 4 / 3 },
  { id: "tall",   label: "Hoch 3:4",  aspect: 3 / 4 },
];

// Längste Seite des fertigen Bildes (hält Uploads klein, Qualität bleibt für die App mehr als ausreichend)
const MAX_OUTPUT_SIDE = 2000;

export function ImageCropper({ imageSrc, onCrop, onCancel, aspect: fixedAspect }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [rotation,   setRotation]   = useState(0);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [crop,       setCrop]       = useState<Crop>();
  const [mode,       setMode]       = useState<Mode>("free");
  const [isLoading,  setIsLoading]  = useState(false);

  const aspect: number | undefined =
    fixedAspect ?? MODES.find((m) => m.id === mode)?.aspect;

  // Bild nach Drehung neu aufbereiten (Drehung in 90°-Schritten)
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      if (rotation === 0) {
        setDisplaySrc(imageSrc);
        return;
      }
      setDisplaySrc(null);
      try {
        const bmp = await createImageBitmap(await fetch(imageSrc).then((r) => r.blob()));
        const swap = rotation === 90 || rotation === 270;
        const canvas = document.createElement("canvas");
        canvas.width  = swap ? bmp.height : bmp.width;
        canvas.height = swap ? bmp.width  : bmp.height;
        const ctx = canvas.getContext("2d")!;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setDisplaySrc(objectUrl);
      } catch (err) {
        console.error("Rotate error:", err);
        if (!cancelled) setDisplaySrc(imageSrc);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageSrc, rotation]);

  // Startrahmen setzen: frei = ganzes Bild, mit Seitenverhältnis = größtmöglicher Ausschnitt mittig
  function initCrop(img: HTMLImageElement, a: number | undefined) {
    const { width, height } = img;
    if (!a) {
      setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
      return;
    }
    // Breite so wählen, dass der Rahmen höchstens 90 % der Höhe belegt
    const maxWidthPct = ((height * 0.9 * a) / width) * 100;
    const widthPct = Math.min(90, maxWidthPct);
    setCrop(
      centerCrop(
        makeAspectCrop({ unit: "%", width: widthPct }, a, width, height),
        width,
        height
      )
    );
  }

  function changeMode(next: Mode) {
    setMode(next);
    const nextAspect = MODES.find((m) => m.id === next)?.aspect;
    if (imgRef.current) initCrop(imgRef.current, nextAspect);
  }

  function rotateLeft()  { setRotation((r) => (r - 90 + 360) % 360); }
  function rotateRight() { setRotation((r) => (r + 90) % 360); }

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !crop) return;
    setIsLoading(true);
    try {
      const nW = img.naturalWidth;
      const nH = img.naturalHeight;

      // Rahmen in Pixel des Originalbildes umrechnen
      const toNatX = (v: number) => (crop.unit === "%" ? (v / 100) * nW : v * (nW / img.width));
      const toNatY = (v: number) => (crop.unit === "%" ? (v / 100) * nH : v * (nH / img.height));

      const sx = Math.max(0, Math.round(toNatX(crop.x)));
      const sy = Math.max(0, Math.round(toNatY(crop.y)));
      const sw = Math.max(1, Math.min(nW - sx, Math.round(toNatX(crop.width))));
      const sh = Math.max(1, Math.min(nH - sy, Math.round(toNatY(crop.height))));

      const scale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(sw, sh));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff"; // für Bilder mit transparentem Hintergrund
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.85)
      );
      onCrop(blob);
    } catch (err) {
      console.error("Crop error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#000" }}>
      {/* Bildbereich */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-auto p-4">
        {displaySrc ? (
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            aspect={aspect}
            keepSelection
            ruleOfThirds
            minWidth={30}
            minHeight={30}
            style={{ maxWidth: "100%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={displaySrc}
              alt=""
              onLoad={(e) => initCrop(e.currentTarget, aspect)}
              style={{ maxWidth: "100%", maxHeight: "calc(100dvh - 290px)", display: "block" }}
            />
          </ReactCrop>
        ) : (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
        )}
      </div>

      {/* Steuerung */}
      <div style={{ backgroundColor: "#0f1729", borderTop: "1px solid #1e2d4a" }}>
        <p className="text-center text-[11px] pt-3 px-4" style={{ color: "#64748b" }}>
          Ziehe an den Ecken und Kanten, um den Ausschnitt anzupassen, oder verschiebe ihn mit dem Finger oder der Maus.
        </p>

        {/* Format */}
        {fixedAspect === undefined && (
          <div className="flex items-center justify-center gap-2 px-4 pt-3 flex-wrap">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => changeMode(m.id)}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
                  (mode === m.id
                    ? "bg-brand-600 border-brand-500 text-white"
                    : "border-slate-600 text-slate-300 hover:bg-slate-700")
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Drehen */}
        <div className="flex items-center justify-center gap-4 px-4 pt-3">
          <button
            onClick={rotateLeft}
            title="Nach links drehen"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-500">Drehen</span>
          <button
            onClick={rotateRight}
            title="Nach rechts drehen"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3 px-4 pt-3 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <X className="h-4 w-4" /> Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !crop}
            className="flex-1 h-11 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            {isLoading
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <><Check className="h-4 w-4" /> Zuschneiden</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
