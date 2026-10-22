import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptBlob, encryptBlob, parseMasterKey } from "../src/crypto";

const key = randomBytes(32);
const photo = randomBytes(50_000);

describe("photo encryption", () => {
  it("round-trips", () => {
    const blob = encryptBlob(key, photo, "photo-1");
    expect(decryptBlob(key, blob, "photo-1").equals(photo)).toBe(true);
  });

  it("never stores the plaintext and differs every time", () => {
    const a = encryptBlob(key, photo, "photo-1");
    const b = encryptBlob(key, photo, "photo-1");
    expect(a.includes(photo.subarray(0, 64))).toBe(false);
    expect(a.equals(b)).toBe(false);
  });

  it("detects any change to the blob", () => {
    const blob = encryptBlob(key, photo, "photo-1");
    for (const position of [5, 30, 70, 90, blob.length - 1]) {
      const tampered = Buffer.from(blob);
      tampered[position] ^= 0x01;
      expect(() => decryptBlob(key, tampered, "photo-1")).toThrow();
    }
  });

  it("only decrypts for the record it was made for", () => {
    const blob = encryptBlob(key, photo, "photo-1");
    expect(() => decryptBlob(key, blob, "photo-2")).toThrow();
  });

  it("fails with the wrong master key", () => {
    const blob = encryptBlob(key, photo, "photo-1");
    expect(() => decryptBlob(randomBytes(32), blob, "photo-1")).toThrow();
  });

  it("rejects data that isn't an encrypted photo", () => {
    expect(() => decryptBlob(key, Buffer.from("hello"), "photo-1")).toThrow(/Not an encrypted photo/);
  });

  it("validates the master key format", () => {
    expect(parseMasterKey("ab".repeat(32))).toHaveLength(32);
    expect(() => parseMasterKey("abc")).toThrow(/64 hex characters/);
  });
});
