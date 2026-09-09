/**
 * SNAP-03: Multi-Photo Batch Compression via OffscreenCanvas Worker
 * Optimizes mobile client photo memory footprint with bounded concurrency,
 * automated thumbnail generation, and aspect ratio preservation for on-site property photos.
 */

export interface CompressPhotoRequest {
  file: File | Blob;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface BatchCompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  thumbMaxWidth?: number;
  thumbMaxHeight?: number;
  thumbQuality?: number;
  concurrency?: number;
  generateThumbnail?: boolean;
}

export interface BatchCompressResult {
  id: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  dataUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  timestamp: string;
}

export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = srcWidth;
  let height = srcHeight;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

export function estimateBase64SizeBytes(base64DataUrl: string): number {
  const base64Index = base64DataUrl.indexOf(",");
  const base64String = base64Index !== -1 ? base64DataUrl.substring(base64Index + 1) : base64DataUrl;
  return Math.round((base64String.length * 3) / 4);
}

export async function compressInspectionPhotoAsync({
  file,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.82,
}: CompressPhotoRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = calculateAspectRatioFit(img.width, img.height, maxWidth, maxHeight);

        if (typeof OffscreenCanvas !== "undefined") {
          try {
            const offscreen = new OffscreenCanvas(width, height);
            const ctx = offscreen.getContext("2d");
            if (!ctx) {
              resolve(img.src);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            offscreen
              .convertToBlob({ type: "image/jpeg", quality })
              .then((blob) => {
                const base64Reader = new FileReader();
                base64Reader.onloadend = () => resolve(base64Reader.result as string);
                base64Reader.readAsDataURL(blob);
              })
              .catch(() => resolve(img.src));
            return;
          } catch {
            // fallback to HTMLCanvasElement
          }
        }

        if (typeof document !== "undefined") {
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(img.src);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(img.src);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Batch-compresses a set of field photos with bounded concurrency to prevent mobile browser OOM.
 */
export async function batchCompressInspectionPhotos(
  files: (File | Blob)[],
  options: BatchCompressOptions = {}
): Promise<BatchCompressResult[]> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.82,
    thumbMaxWidth = 320,
    thumbMaxHeight = 240,
    thumbQuality = 0.70,
    concurrency = 3,
    generateThumbnail = true,
  } = options;

  const results: BatchCompressResult[] = [];
  const queue = [...files];

  async function worker(index: number) {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const id = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const originalSize = file.size || 500000;

      const compressedUrl = await compressInspectionPhotoAsync({
        file,
        maxWidth,
        maxHeight,
        quality,
      });

      let thumbnailUrl: string | undefined;
      if (generateThumbnail) {
        thumbnailUrl = await compressInspectionPhotoAsync({
          file,
          maxWidth: thumbMaxWidth,
          maxHeight: thumbMaxHeight,
          quality: thumbQuality,
        });
      }

      const compressedSize = estimateBase64SizeBytes(compressedUrl);
      const ratio = originalSize > 0 ? Number((compressedSize / originalSize).toFixed(3)) : 1.0;

      results.push({
        id,
        originalSizeBytes: originalSize,
        compressedSizeBytes: compressedSize,
        compressionRatio: ratio,
        dataUrl: compressedUrl,
        thumbnailUrl,
        width: maxWidth,
        height: maxHeight,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const workerPool = Array.from({ length: Math.min(concurrency, files.length) }, (_, i) => worker(i));
  await Promise.all(workerPool);

  return results;
}
