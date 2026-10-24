import { describe, expect, it } from "vitest";
import { walletProblem } from "./wallet-status";

const me = "0xDFF51B6Dbb1b6b99419D4d3A4C739837EF7a4945";
const base = { status: "connected" as const, address: me, chainId: 11155111, expectedAddress: me, expectedChainId: 11155111 };

describe("walletProblem", () => {
  it("is ready when the signed-in account is connected on the right network", () => {
    expect(walletProblem(base)).toBeNull();
    expect(walletProblem({ ...base, address: me.toLowerCase() })).toBeNull();
  });

  it("reports a wallet that is still restoring its connection", () => {
    expect(walletProblem({ ...base, status: "reconnecting" })).toBe("reconnecting");
    expect(walletProblem({ ...base, status: "connecting" })).toBe("reconnecting");
  });

  it("reports a disconnected wallet even though the session is valid", () => {
    expect(walletProblem({ ...base, status: "disconnected", address: undefined })).toBe("disconnected");
  });

  it("reports another account before the network", () => {
    expect(walletProblem({ ...base, address: "0x44b638E43c1EC2134E3103A2aa7ed74E473130AC", chainId: 1 })).toBe("wrong-account");
  });

  it("reports the wrong network", () => {
    expect(walletProblem({ ...base, chainId: 1 })).toBe("wrong-network");
  });
});
