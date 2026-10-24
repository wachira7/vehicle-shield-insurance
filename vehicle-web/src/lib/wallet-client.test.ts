import { describe, expect, it } from "vitest";
import type { EIP1193Provider } from "viem";
import { normalizeChainId, walletClientFor } from "./wallet-client";

describe("normalizeChainId", () => {
  it("turns a CAIP-2 chain id into the standard hex quantity", () => {
    expect(normalizeChainId("eip155:11155111")).toBe("0xaa36a7");
    expect(normalizeChainId("eip155:1")).toBe("0x1");
  });

  it("accepts numbers and leaves standard answers alone", () => {
    expect(normalizeChainId(11155111)).toBe("0xaa36a7");
    expect(normalizeChainId("0xaa36a7")).toBe("0xaa36a7");
    expect(normalizeChainId("solana:abc")).toBe("solana:abc");
  });
});

describe("walletClientFor", () => {
  it("works with a wallet that reports its chain as eip155:11155111 (Reown embedded wallet)", async () => {
    const calls: string[] = [];
    const reownLike = {
      request: async ({ method }: { method: string }) => {
        calls.push(method);
        if (method === "eth_chainId") return "eip155:11155111";
        throw new Error(`unexpected ${method}`);
      },
    } as unknown as EIP1193Provider;
    const client = walletClientFor(reownLike, "0xDFF51B6Dbb1b6b99419D4d3A4C739837EF7a4945");
    expect(await client.getChainId()).toBe(11155111);
    expect(calls).toEqual(["eth_chainId"]);
  });
});
