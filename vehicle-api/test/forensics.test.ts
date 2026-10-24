import jpeg from "jpeg-js";
import { describe, expect, it } from "vitest";
import { fingerprint, hammingDistance, inspectImage, SIMILAR_BITS, stripJpegMetadata } from "../src/forensics";

/// A JPEG of a simple scene: `pattern` decides the brightness at each (x, y) in 0..1.
function picture(pattern: (x: number, y: number) => number, width = 320, height = 240, quality = 90) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = Math.round(255 * pattern(x / width, y / height));
      data.set([v, v, v, 255], (y * width + x) * 4);
    }
  }
  return new Uint8Array(jpeg.encode({ data, width, height }, quality).data);
}

const car = (x: number, y: number) => (y > 0.5 && x > 0.2 && x < 0.8 ? 0.2 : 0.4 + 0.5 * x * (1 - y));
const otherCar = (x: number, y: number) => (Math.sin(x * 12) * Math.cos(y * 9) + 1) / 2;

/// A minimal EXIF APP1 segment: camera make/model, DateTimeOriginal and a GPS position.
function exifSegment({ make, model, taken, lat, lon }: { make: string; model: string; taken: string; lat: number; lon: number }) {
  const entries: { tag: number; type: number; count: number; value: Buffer | number }[][] = [[], [], []];
  const ascii = (text: string) => Buffer.from(`${text}\0`, "ascii");
  const dms = (deg: number) => {
    const d = Math.floor(deg);
    const m = Math.floor((deg - d) * 60);
    const s = Math.round(((deg - d) * 60 - m) * 60 * 100);
    const out = Buffer.alloc(24);
    [d, 1, m, 1, s, 100].forEach((n, i) => out.writeUInt32LE(n, i * 4));
    return out;
  };
  entries[0].push({ tag: 0x010f, type: 2, count: make.length + 1, value: ascii(make) });
  entries[0].push({ tag: 0x0110, type: 2, count: model.length + 1, value: ascii(model) });
  entries[1].push({ tag: 0x9003, type: 2, count: 20, value: ascii(taken) });
  entries[2].push({ tag: 0x0001, type: 2, count: 2, value: ascii(lat < 0 ? "S" : "N") });
  entries[2].push({ tag: 0x0002, type: 5, count: 3, value: dms(Math.abs(lat)) });
  entries[2].push({ tag: 0x0003, type: 2, count: 2, value: ascii(lon < 0 ? "W" : "E") });
  entries[2].push({ tag: 0x0004, type: 5, count: 3, value: dms(Math.abs(lon)) });

  // Layout: header(8) | IFD0 | Exif IFD | GPS IFD | data area. Pointers are filled in below.
  const ifdSize = (n: number) => 2 + n * 12 + 4;
  const ifd0Size = ifdSize(entries[0].length + 2);
  const offsets = [8, 8 + ifd0Size, 8 + ifd0Size + ifdSize(entries[1].length)];
  let dataOffset = offsets[2] + ifdSize(entries[2].length);
  entries[0].push({ tag: 0x8769, type: 4, count: 1, value: offsets[1] }, { tag: 0x8825, type: 4, count: 1, value: offsets[2] });
  entries[0].sort((a, b) => a.tag - b.tag);

  const tiff = Buffer.alloc(4096);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  entries.forEach((list, i) => {
    let at = offsets[i];
    tiff.writeUInt16LE(list.length, at);
    at += 2;
    for (const entry of list) {
      tiff.writeUInt16LE(entry.tag, at);
      tiff.writeUInt16LE(entry.type, at + 2);
      tiff.writeUInt32LE(entry.count, at + 4);
      if (typeof entry.value === "number") tiff.writeUInt32LE(entry.value, at + 8);
      else if (entry.value.length <= 4) entry.value.copy(tiff, at + 8);
      else {
        tiff.writeUInt32LE(dataOffset, at + 8);
        entry.value.copy(tiff, dataOffset);
        dataOffset += entry.value.length + (entry.value.length % 2);
      }
      at += 12;
    }
    tiff.writeUInt32LE(0, at);
  });
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff.subarray(0, dataOffset)]);
  const header = Buffer.from([0xff, 0xe1, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
}

const withExif = (image: Uint8Array, segment: Buffer) => new Uint8Array(Buffer.concat([image.subarray(0, 2), segment, image.subarray(2)]));

describe("fingerprint", () => {
  it("matches the same picture after resizing and re-compression", () => {
    const original = fingerprint(picture(car), "image/jpeg")!;
    const smaller = fingerprint(picture(car, 160, 120, 60), "image/jpeg")!;
    expect(original).toMatch(/^[0-9a-f]{16}$/);
    expect(hammingDistance(original, smaller)).toBeLessThanOrEqual(SIMILAR_BITS);
  });

  it("tells different pictures apart", () => {
    const a = fingerprint(picture(car), "image/jpeg")!;
    const b = fingerprint(picture(otherCar), "image/jpeg")!;
    expect(hammingDistance(a, b)).toBeGreaterThan(SIMILAR_BITS);
  });

  it("returns null for what it can't decode", () => {
    expect(fingerprint(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), "image/jpeg")).toBeNull();
    expect(fingerprint(picture(car), "image/heic")).toBeNull();
  });

  it("counts differing bits", () => {
    expect(hammingDistance("0000000000000000", "0000000000000000")).toBe(0);
    expect(hammingDistance("000000000000000f", "0000000000000000")).toBe(4);
    expect(hammingDistance("ffffffffffffffff", "0000000000000000")).toBe(64);
  });
});

describe("inspectImage", () => {
  const segment = exifSegment({ make: "TECNO", model: "Spark 20", taken: "2024:03:01 10:20:30", lat: -1.2921, lon: 36.8219 });

  it("reads capture time, place and camera from the file, then strips EXIF from the stored copy", async () => {
    const image = withExif(picture(car), segment);
    const result = await inspectImage(image, "image/jpeg");
    expect(result.metadataSource).toBe("file");
    expect(result.metadata.camera).toBe("TECNO Spark 20");
    expect(result.metadata.capturedAt?.getUTCFullYear()).toBe(2024);
    expect(result.metadata.lat).toBeCloseTo(-1.2921, 3);
    expect(result.metadata.lon).toBeCloseTo(36.8219, 3);

    expect(result.bytes.length).toBeLessThan(image.length);
    expect(Buffer.from(result.bytes).includes(Buffer.from("TECNO"))).toBe(false);
    expect(jpeg.decode(result.bytes).width).toBe(320);
    expect(result.phash).toBe(fingerprint(picture(car), "image/jpeg"));
  });

  it("prefers the file's metadata but falls back to what the device reported", async () => {
    const reported = { capturedAt: new Date("2026-05-30T08:00:00Z"), camera: "Pixel 8" };
    expect((await inspectImage(withExif(picture(car), segment), "image/jpeg", reported)).metadata.camera).toBe("TECNO Spark 20");

    const fallback = await inspectImage(picture(car), "image/jpeg", reported);
    expect(fallback.metadataSource).toBe("device");
    expect(fallback.metadata).toEqual(reported);

    const none = await inspectImage(picture(car), "image/jpeg");
    expect(none.metadataSource).toBeNull();
    expect(none.metadata).toEqual({});
  });

  it("stores an unparseable file as it came", async () => {
    const junk = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 9, 9, 9]);
    const result = await inspectImage(junk, "image/jpeg");
    expect(result.bytes).toEqual(junk);
    expect(result.phash).toBeNull();
  });
});

describe("stripJpegMetadata", () => {
  it("leaves a JPEG without EXIF byte-for-byte the same", () => {
    const image = picture(car);
    expect(Buffer.from(stripJpegMetadata(image)).equals(Buffer.from(image))).toBe(true);
  });
});
