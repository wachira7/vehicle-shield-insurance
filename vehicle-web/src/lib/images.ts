// Phone photos are often 3-12 MB. Before uploading, JPEG/PNG/WebP photos are scaled down to a
// sharp-enough size for an assessor and re-encoded, which keeps uploads quick on mobile data.
// Formats the browser can't draw (e.g. HEIC outside Safari) are sent as they are.

const MAX_EDGE = 2560;
const SKIP_BELOW_BYTES = 1_500_000;

export async function prepareImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < SKIP_BELOW_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export interface CaptureMetadata {
  capturedAt?: string;
  lat?: number;
  lon?: number;
  camera?: string;
}

/// When, where and with which camera a photo was taken, read from the original file before
/// prepareImage re-encodes it (which drops this data). Sent alongside the upload so the
/// assessor can see it; the API strips it from the stored image. Empty when unavailable.
export async function readCaptureMetadata(file: File): Promise<CaptureMetadata> {
  try {
    const { default: exifr } = await import("exifr");
    const tags = await exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: false, icc: false });
    if (!tags) return {};
    const when = tags.DateTimeOriginal ?? tags.CreateDate;
    const camera = [tags.Make, tags.Model].filter((part) => typeof part === "string" && part.trim()).join(" ").trim();
    return {
      capturedAt: when instanceof Date && !Number.isNaN(when.getTime()) ? when.toISOString() : undefined,
      lat: Number.isFinite(tags.latitude) ? tags.latitude : undefined,
      lon: Number.isFinite(tags.longitude) ? tags.longitude : undefined,
      camera: camera ? camera.slice(0, 80) : undefined,
    };
  } catch {
    return {};
  }
}
