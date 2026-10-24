// Checks that help an assessor spot reused or misleading photos, run on every upload:
//
// - Capture metadata (when, where, which camera) read from the file's EXIF. Browsers re-encode
//   large photos before upload, which drops EXIF, so the web app also sends what it read from
//   the original; the file's own data wins when both exist. Either can be faked, so these are
//   signals for a person to weigh, never automatic decisions.
// - A perceptual fingerprint (dHash) that survives resizing and re-compression, to find the
//   same picture reused across claims, accounts or a vehicle's own verification photos.
// - EXIF is then removed from the stored copy, so the stored image carries no location data
//   beyond what we record on purpose.
import exifr from "exifr";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

export interface CaptureMetadata {
  capturedAt?: Date;
  lat?: number;
  lon?: number;
  camera?: string;
}

export interface Inspection {
  bytes: Uint8Array; // what to store: the image with EXIF removed where that is safe
  metadata: CaptureMetadata;
  metadataSource: "file" | "device" | null;
  phash: string | null;
}

/// Reads capture metadata, fingerprints the image and strips EXIF. Never throws: an image we
/// can't parse is stored as it came, without a fingerprint.
export async function inspectImage(bytes: Uint8Array, contentType: string, reported?: CaptureMetadata): Promise<Inspection> {
  const fromFile = await readExif(bytes);
  const hasFileData = Boolean(fromFile.metadata.capturedAt || fromFile.metadata.lat !== undefined || fromFile.metadata.camera);
  const hasReported = Boolean(reported && (reported.capturedAt || reported.lat !== undefined || reported.camera));
  return {
    // Removing EXIF also removes its orientation flag, which would turn a sideways photo; such
    // files are kept whole (the web app bakes orientation in, so this is rare).
    bytes: contentType === "image/jpeg" && fromFile.orientation <= 1 ? stripJpegMetadata(bytes) : bytes,
    metadata: hasFileData ? fromFile.metadata : hasReported ? reported! : {},
    metadataSource: hasFileData ? "file" : hasReported ? "device" : null,
    phash: fingerprint(bytes, contentType),
  };
}

async function readExif(bytes: Uint8Array): Promise<{ metadata: CaptureMetadata; orientation: number }> {
  try {
    const tags = await exifr.parse(Buffer.from(bytes), { tiff: true, exif: true, gps: true, xmp: false, icc: false });
    if (!tags) return { metadata: {}, orientation: 1 };
    const when = tags.DateTimeOriginal ?? tags.CreateDate ?? tags.ModifyDate;
    const camera = [tags.Make, tags.Model].filter((part) => typeof part === "string" && part.trim()).join(" ").trim();
    return {
      metadata: {
        capturedAt: when instanceof Date && !Number.isNaN(when.getTime()) ? when : undefined,
        lat: Number.isFinite(tags.latitude) ? tags.latitude : undefined,
        lon: Number.isFinite(tags.longitude) ? tags.longitude : undefined,
        camera: camera ? camera.slice(0, 80) : undefined,
      },
      orientation: typeof tags.Orientation === "number" ? tags.Orientation : 1,
    };
  } catch {
    return { metadata: {}, orientation: 1 };
  }
}

/// Drops APP1 (EXIF, XMP) and APP13 (IPTC) segments from a JPEG. Returns the input unchanged if
/// the segment structure isn't what we expect.
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const kept: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return bytes;
    const marker = bytes[offset + 1];
    // Start of scan: the rest is image data.
    if (marker === 0xda) {
      kept.push(bytes.subarray(offset));
      return Buffer.concat(kept);
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return bytes;
    if (marker !== 0xe1 && marker !== 0xed) kept.push(bytes.subarray(offset, offset + 2 + length));
    offset += 2 + length;
  }
  return bytes;
}

/// 64-bit difference hash as 16 hex characters: the image shrunk to 9×8 greyscale, one bit per
/// "is this pixel brighter than its right-hand neighbour". Similar pictures differ in few bits.
export function fingerprint(bytes: Uint8Array, contentType: string): string | null {
  try {
    const image = decode(bytes, contentType);
    if (!image || image.width < 9 || image.height < 8) return null;
    const cells = shrink(image, 9, 8);
    let hash = 0n;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) hash = (hash << 1n) | (cells[y * 9 + x] > cells[y * 9 + x + 1] ? 1n : 0n);
    }
    return hash.toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}

/// How many of the 64 bits differ. Up to about 10 means "very likely the same picture".
export function hammingDistance(a: string, b: string): number {
  let diff = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (diff) {
    count += Number(diff & 1n);
    diff >>= 1n;
  }
  return count;
}

export const SIMILAR_BITS = 10;

type Rgba = { width: number; height: number; data: Uint8Array };

function decode(bytes: Uint8Array, contentType: string): Rgba | null {
  if (contentType === "image/jpeg") {
    return jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 50, maxMemoryUsageInMB: 512 });
  }
  if (contentType === "image/png") return PNG.sync.read(Buffer.from(bytes));
  return null; // WebP and HEIC: no decoder here, so no fingerprint
}

/// Box-averages the image's luminance into a cols × rows grid.
function shrink({ width, height, data }: Rgba, cols: number, rows: number): Float64Array {
  const sums = new Float64Array(cols * rows);
  const counts = new Float64Array(cols * rows);
  // Sampling every few pixels is plenty for a 72-cell grid and keeps big photos fast.
  const step = Math.max(1, Math.floor(Math.min(width, height) / 256));
  for (let y = 0; y < height; y += step) {
    const row = Math.min(rows - 1, Math.floor((y * rows) / height));
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const cell = row * cols + Math.min(cols - 1, Math.floor((x * cols) / width));
      sums[cell] += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      counts[cell]++;
    }
  }
  return sums.map((sum, i) => sum / Math.max(1, counts[i]));
}
