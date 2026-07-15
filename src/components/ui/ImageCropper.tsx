"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { Check, X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropperProps {
  imageSrc:  string;
  onCrop:    (blob: Blob) => void;
  onCancel:  () => void;
  aspect?:   number; // optional – ohne = freies Zuschneiden
}

async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image  = await createImageBitmap(await fetch(imageSrc).then((r) => r.blob()));
  const canvas = document.createElement("canvas");
  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("toBlob failed")),
      "image/jpeg", 0.85
    );
  });
}

export function ImageCropper({ imageSrc, onCrop, onCancel, aspect }: ImageCropperProps) {
  const [crop,        setCrop]        = useState<Point>({ x: 0, y: 0 });
  const [zoom,        setZoom]        = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    setIsLoading(true);
    try {
      const blob = await getCroppedImage(imageSrc, croppedArea);
      onCrop(blob);
    } catch (err) {
      console.error("Crop error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#000" }}>
      {/* Cropper */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect ?? undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { backgroundColor: "#000" },
            cropAreaStyle:  { borderColor: "#3b82f6", borderWidth: 2 },
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ backgroundColor: "#0f1729", borderTop: "1px solid #1e2d4a" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setZoom(Math.max(1, zoom - 0.1))}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <input
            type="range"
            min={1} max={3} step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-brand-500"
          />
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3 px-4 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <X className="h-4 w-4" /> Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
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
