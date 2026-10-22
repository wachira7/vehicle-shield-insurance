// Where encrypted photos live. Filebase pins every object in an IPFS bucket and reports its
// CID; the local and in-memory stores stand in for development and tests.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface StoredObject {
  key: string;
  cid: string;
  uri: string; // what goes on-chain, e.g. ipfs://<cid>
}

export interface BlobStore {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<Uint8Array>;
}

type S3Like = Pick<S3Client, "send">;

export function filebaseStore(options: {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  client?: S3Like;
}): BlobStore {
  const client =
    options.client ??
    new S3Client({
      endpoint: "https://s3.filebase.com",
      region: "us-east-1",
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
      forcePathStyle: true,
    });
  const Bucket = options.bucket;

  return {
    async put(key, bytes, contentType) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: bytes, ContentType: contentType }));
      // Filebase reports the IPFS CID of the stored object in its metadata.
      const head = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
      const cid = head.Metadata?.cid;
      if (!cid) throw new Error(`Filebase returned no CID for ${key}; is "${Bucket}" an IPFS bucket?`);
      return { key, cid, uri: `ipfs://${cid}` };
    },
    async get(key) {
      const object = await client.send(new GetObjectCommand({ Bucket, Key: key }));
      if (!object.Body) throw new Error(`Filebase returned an empty body for ${key}`);
      return object.Body.transformToByteArray();
    },
  };
}

const fakeCid = (bytes: Uint8Array) => `local-${createHash("sha256").update(bytes).digest("hex")}`;

/// Files on disk; for running the API without a Filebase account.
export function localStore(dir: string): BlobStore {
  return {
    async put(key, bytes) {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, encodeURIComponent(key)), bytes);
      const cid = fakeCid(bytes);
      return { key, cid, uri: `local://${cid}` };
    },
    async get(key) {
      return new Uint8Array(await readFile(path.join(dir, encodeURIComponent(key))));
    },
  };
}

export function memoryStore(): BlobStore & { objects: Map<string, Uint8Array> } {
  const objects = new Map<string, Uint8Array>();
  return {
    objects,
    async put(key, bytes) {
      objects.set(key, bytes);
      const cid = fakeCid(bytes);
      return { key, cid, uri: `local://${cid}` };
    },
    async get(key) {
      const bytes = objects.get(key);
      if (!bytes) throw new Error(`No object ${key}`);
      return bytes;
    },
  };
}
