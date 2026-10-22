// Envelope encryption for photos (AES-256-GCM). Each file gets a fresh data key, which is
// itself encrypted with the master key; the result is one self-contained blob:
//
//   "VSE1" | key IV (12) | encrypted data key (32) | key tag (16) | data IV (12) | data tag (16) | ciphertext
//
// `context` (the photo's id) is bound in as additional authenticated data, so a blob only
// decrypts for the record it was made for and can't be swapped onto another.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("VSE1");
const IV_BYTES = 12;
const KEY_BYTES = 32;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + IV_BYTES + KEY_BYTES + TAG_BYTES + IV_BYTES + TAG_BYTES;

export function parseMasterKey(hex: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error("PHOTO_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  return Buffer.from(hex, "hex");
}

function seal(key: Buffer, plaintext: Buffer, aad: Buffer) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, ciphertext, tag: cipher.getAuthTag() };
}

function open(key: Buffer, iv: Buffer, ciphertext: Buffer, tag: Buffer, aad: Buffer) {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptBlob(masterKey: Buffer, plaintext: Uint8Array, context: string): Buffer {
  const aad = Buffer.from(context, "utf8");
  const dataKey = randomBytes(KEY_BYTES);
  const wrapped = seal(masterKey, dataKey, aad);
  const body = seal(dataKey, Buffer.from(plaintext), aad);
  return Buffer.concat([MAGIC, wrapped.iv, wrapped.ciphertext, wrapped.tag, body.iv, body.tag, body.ciphertext]);
}

/// Throws if the blob was altered, belongs to another context, or the key is wrong.
export function decryptBlob(masterKey: Buffer, blob: Uint8Array, context: string): Buffer {
  const data = Buffer.from(blob);
  if (data.length < HEADER_BYTES || !data.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Not an encrypted photo");
  }
  const aad = Buffer.from(context, "utf8");
  let offset = MAGIC.length;
  const take = (n: number) => data.subarray(offset, (offset += n));
  const keyIv = take(IV_BYTES);
  const wrappedKey = take(KEY_BYTES);
  const keyTag = take(TAG_BYTES);
  const dataIv = take(IV_BYTES);
  const dataTag = take(TAG_BYTES);
  const ciphertext = data.subarray(offset);

  const dataKey = open(masterKey, keyIv, wrappedKey, keyTag, aad);
  return open(dataKey, dataIv, ciphertext, dataTag, aad);
}
