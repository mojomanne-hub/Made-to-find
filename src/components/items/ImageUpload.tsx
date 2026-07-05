"use client";

/**
 * ImageUpload – Foto auswählen → zuschneiden → hochladen.
 * Nach Bildauswahl öffnet sich der Cropper als Vollbild-Modal.
 */

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { createBrowserClient }  from "@/lib/supabase/client";
import { compressImage }        from "@/lib/utils/compress-image";
import { ImageCropper }         from "@/components/ui/ImageCropper";
import { cn }                   from "@/lib/utils";

const MAX_SIZE_B    = 2 * 1024 * 1024; // 2 MB vor Komprimierung
const BUCKET        = "item-images";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ImageUploadProps {
  currentImageUrl?: string | null;
  userId:           string;
  itemId:           string;
  onUpload:         (url: string) => void;
  onDelete:         () => void;
}

export function ImageUpload({ currentImageUrl, userId, itemId, onUpload, onDelete }: ImageUploadProps) {
  const inputRef                    = useRef<HTMLInputElement>(null);
  const [isDragging,  setIsDragging]  = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  // Crop-State
  const [cropSrc,     setCropSrc]     = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const displayImage = preview ?? currentImageUrl ?? null;

  // Datei ausgewählt → Cropper öffnen
  function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Nur JPG, PNG, WebP und GIF sind erlaubt.");
      return;
    }
    if (file.size > MAX_SIZE_B * 5) { // 10 MB Hardlimit vor Crop
      setError(`Bild ist zu groß. Maximale Größe: 10 MB.`);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPendingFile(file);
    setCropSrc(objectUrl);
  }

  // Nach Crop: komprimieren + hochladen
  async function handleCropDone(blob: Blob) {
    if (!cropSrc) return;
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);

    // Blob → File
    const file = new File([blob], pendingFile?.name ?? "image.jpg", { type: "image/jpeg" });
    setPendingFile(null);

    // Vorschau sofort
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setIsUploading(true);
    try {
      const supabase    = createBrowserClient();
      const compressed  = await compressImage(file);
      const ext         = "jpg";
      const path        = `${userId}/${itemId}.${ext}`;

      await supabase.storage.from(BUCKET).remove([path]);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onUpload(`${data.publicUrl}?t=${Date.now()}`);
    } catch {
      setError("Upload fehlgeschlagen.");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      const supabase = createBrowserClient();
      const paths = ["jpg", "jpeg", "png", "webp", "gif"].map(
        (ext) => `${userId}/${itemId}.${ext}`
      );
      await supabase.storage.from(BUCKET).remove(paths);
      setPreview(null);
      onDelete();
    } catch { setError("Löschen fehlgeschlagen."); }
    finally   { setIsDeleting(false); }
  }

  const handleDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, itemId]);

  return (
    <>
      {/* Cropper Modal */}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
          aspect={4 / 3}
        />
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-300">Foto</label>

        {displayImage ? (
          <div className="relative rounded-2xl overflow-hidden border border-slate-600">
            <div className="relative aspect-video w-full">
              <Image src={displayImage} alt="Foto" fill className="object-cover" unoptimized />
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
            {!isUploading && (
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="h-8 px-3 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/70 transition-colors flex items-center gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" /> Ersetzen
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 w-8 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-danger-600/80 transition-colors flex items-center justify-center"
                >
                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            disabled={isUploading}
            className={cn(
              "relative w-full rounded-2xl border-2 border-dashed transition-all duration-150",
              "flex flex-col items-center justify-center gap-2 py-10 px-4",
              isDragging ? "border-brand-400 bg-brand-900/20 text-brand-400" : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30 text-slate-400",
              isUploading && "opacity-60 cursor-not-allowed"
            )}
          >
            {isUploading ? (
              <><Loader2 className="h-8 w-8 animate-spin text-brand-400" /><span className="text-sm font-medium text-brand-400">Wird hochgeladen…</span></>
            ) : (
              <>
                <ImageIcon className="h-8 w-8" />
                <div className="text-center">
                  <span className="text-sm font-medium text-slate-300">Foto hierher ziehen</span>
                  <span className="text-sm text-slate-500"> oder </span>
                  <span className="text-sm font-medium text-brand-400">auswählen</span>
                </div>
                <p className="text-xs text-slate-600">JPG, PNG, WebP · dann zuschneiden</p>
              </>
            )}
          </button>
        )}

        {error && <p className="text-xs text-danger-400">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          className="hidden"
        />
      </div>
    </>
  );
}
