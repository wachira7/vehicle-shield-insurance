import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { afterAll, describe, expect, it } from "vitest";
import { filebaseStore, localStore } from "../src/storage";

/// Stands in for Filebase's S3 API: stores objects and reports a CID in their metadata.
function fakeFilebase({ reportCid = true } = {}) {
  const objects = new Map<string, { body: Uint8Array; contentType?: string }>();
  const calls: string[] = [];
  return {
    objects,
    calls,
    async send(command: unknown): Promise<any> {
      if (command instanceof PutObjectCommand) {
        calls.push(`put ${command.input.Bucket}/${command.input.Key}`);
        objects.set(command.input.Key!, {
          body: command.input.Body as Uint8Array,
          contentType: command.input.ContentType,
        });
        return {};
      }
      if (command instanceof HeadObjectCommand) {
        return { Metadata: reportCid ? { cid: `bafy-${command.input.Key}` } : {} };
      }
      if (command instanceof GetObjectCommand) {
        const object = objects.get(command.input.Key!);
        return { Body: { transformToByteArray: async () => object!.body } };
      }
      throw new Error("unexpected command");
    },
  };
}

describe("filebaseStore", () => {
  it("uploads to the bucket and returns the IPFS CID", async () => {
    const client = fakeFilebase();
    const store = filebaseStore({ accessKeyId: "k", secretAccessKey: "s", bucket: "photos", client: client as never });
    const bytes = new Uint8Array([1, 2, 3]);

    expect(await store.put("photos/abc", bytes, "application/octet-stream")).toEqual({
      key: "photos/abc",
      cid: "bafy-photos/abc",
      uri: "ipfs://bafy-photos/abc",
    });
    expect(client.calls).toEqual(["put photos/photos/abc"]);
    expect(client.objects.get("photos/abc")?.contentType).toBe("application/octet-stream");
    expect(await store.get("photos/abc")).toEqual(bytes);
  });

  it("explains a bucket that isn't on IPFS", async () => {
    const store = filebaseStore({
      accessKeyId: "k",
      secretAccessKey: "s",
      bucket: "plain",
      client: fakeFilebase({ reportCid: false }) as never,
    });
    await expect(store.put("x", new Uint8Array([1]), "application/octet-stream")).rejects.toThrow(/IPFS bucket/);
  });
});

describe("localStore", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "vehicle-api-blobs-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("stores files under a content-derived id", async () => {
    const store = localStore(path.join(dir, "nested"));
    const bytes = new Uint8Array([9, 9, 9]);
    const a = await store.put("photos/one", bytes, "application/octet-stream");
    const b = await store.put("photos/two", bytes, "application/octet-stream");
    expect(a.cid).toBe(b.cid);
    expect(a.uri).toMatch(/^local:\/\/local-[0-9a-f]{64}$/);
    expect(await store.get("photos/one")).toEqual(bytes);
  });
});
