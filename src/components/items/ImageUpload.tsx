"use client";

/**
 * ImageUpload – Foto hochladen, vorschauen und löschen.
 *
 * - Drag & Drop + Klick zum Auswählen
 * - Bildvorschau sofort nach Auswahl
 * - Upload zu Supabase Storage (bucket: item-images)
 * - Dateigröße max. 5 MB, nur Bilder erlaubt
 * - Bestehendes Bild wird vor neuem Upload gelöscht
 */

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_SIZE_MB  = 5;
const MAX_SIZE_B   = MAX_SIZE_MB * 1024 * 1024;
const BUCKET       = "item-images";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ImageUploadProps {
  /** Aktuell gespeicherte Bild-URL (aus der Datenbank) */
  currentImageUrl?: string | null;
  /** User-ID – wird als Ordner im Bucket verwendet */
  userId: string;
  /** Item-ID – wird als Dateiname verwendet */
  itemId: string;
  /** Wird aufgerufen wenn ein Bild erfolgreich hochgeladen wurde */
  onUpload: (url: string) => void;
  /** Wird aufgerufen wenn das Bild gelöscht wurde */
  onDelete: () => void;
}

export function ImageUpload({
  currentImageUrl,
  userId,
  itemId,
  onUpload,
  onDelete,
}: ImageUploadProps) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting,  setIsDeleting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  // Lokale Vorschau (vor dem Upload)
  const [preview, setPreview] = useState<string | null>(null);

  // Angezeigtes Bild: lokale Vorschau hat Vorrang vor gespeicherter URL
  const displayImage = preview ?? currentImageUrl ?? null;

  async function handleFile(file: File) {
    setError(null);

    // Validierung
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Nur JPG, PNG, WebP und GIF sind erlaubt.");
      return;
    }
    if (file.size > MAX_SIZE_B) {
      setError(`Bild ist zu groß. Maximale Größe: ${MAX_SIZE_MB} MB.`);
      return;
    }

    // Lokale Vorschau sofort anzeigen
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setIsUploading(true);
    try {
      const supabase  = createBrowserClient();
      // Dateipfad: userId/itemId.ext  (pro Item immer gleicher Pfad → überschreibt altes Bild)
      const ext       = file.name.split(".").pop() ?? "jpg";
      const path      = `${userId}/${itemId}.${ext}`;

      // Altes Bild löschen (ignoriere Fehler falls keines vorhanden)
      await supabase.storage.from(BUCKET).remove([path]);

      // Neues Bild hochladen
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Öffentliche URL holen
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Cache-Buster damit der Browser das neue Bild lädt
      const urlWithCache = `${data.publicUrl}?t=${Date.now()}`;

      onUpload(urlWithCache);
    } catch {
      setError("Upload fehlgeschlagen. Bitte versuche es erneut.");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      const supabase = createBrowserClient();
      // Alle möglichen Erweiterungen versuchen zu löschen
      const paths = ["jpg", "jpeg", "png", "webp", "gif"].map(
        (ext) => `${userId}/${itemId}.${ext}`,
      );
      await supabase.storage.from(BUCKET).remove(paths);
      setPreview(null);
      onDelete();
    } catch {
      setError("Löschen fehlgeschlagen.");
    } finally {
      setIsDeleting(false);
    }
  }

  // Drag & Drop Handler
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, itemId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Input zurücksetzen damit dasselbe Bild nochmal gewählt werden kann
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-300">Foto</label>

      {/* Bild vorhanden → Vorschau anzeigen */}
      {displayImage ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-600 bg-slate-800">
          <div className="relative aspect-video w-full">
            <Image
              src={displayImage}
              alt="Foto des Gegenstands"
              fill
              className="object-cover"
              unoptimized // Supabase-URLs brauchen kein Next.js Image Optimization
            />
          </div>

          {/* Lade-Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}

          {/* Aktions-Buttons */}
          {!isUploading && (
            <div className="absolute top-2 right-2 flex gap-2">
              {/* Bild ersetzen */}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="h-8 px-3 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/70 transition-colors flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Ersetzen
              </button>
              {/* Bild löschen */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 w-8 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-danger-600/80 transition-colors flex items-center justify-center"
                aria-label="Foto löschen"
              >
                {isDeleting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <X className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Kein Bild → Upload-Zone */
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
            "text-slate-500 hover:text-slate-400",
            isDragging
              ? "border-brand-400 bg-brand-50 text-brand-600"
              : "border-slate-600 hover:border-slate-500 hover:bg-slate-800",
            isUploading && "opacity-60 cursor-not-allowed",
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <span className="text-sm font-medium text-brand-600">
                Wird hochgeladen…
              </span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8" />
              <div className="text-center">
                <span className="text-sm font-medium text-slate-400">
                  Foto hierher ziehen
                </span>
                <span className="text-sm text-slate-500"> oder </span>
                <span className="text-sm font-medium text-brand-600">
                  auswählen
                </span>
              </div>
              <p className="text-xs text-slate-500">
                JPG, PNG, WebP · max. {MAX_SIZE_MB} MB
              </p>
            </>
          )}
        </button>
      )}

      {/* Fehler */}
      {error && (
        <p className="text-xs text-danger-600">{error}</p>
      )}

      {/* Verstecktes File-Input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}
