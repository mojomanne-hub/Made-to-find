/**
 * compressImage – Bild komprimieren vor dem Upload.
 *
 * - Max. 1200px Breite/Höhe (behält Seitenverhältnis)
 * - 80% JPEG-Qualität
 * - Reduziert 4 MB → ~200-400 KB
 */

export async function compressImage(
  file: File,
  options: {
    maxWidth?:  number;
    maxHeight?: number;
    quality?:   number;
  } = {}
): Promise<File> {
  const {
    maxWidth  = 1200,
    maxHeight = 1200,
    quality   = 0.8,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Neue Dimensionen berechnen (Seitenverhältnis beibehalten)
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      // Canvas zum Rendern
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      // Weißer Hintergrund für transparente PNGs
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Nur komprimieren wenn kleiner als Original
          if (blob.size >= file.size) { resolve(file); return; }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          console.log(
            `Komprimiert: ${(file.size / 1024).toFixed(0)} KB → ${(compressed.size / 1024).toFixed(0)} KB`
          );
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
