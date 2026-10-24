import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";
import { describeTxError, insuranceCore } from "./contracts";

/// A contract rejection as viem reports it: revert data decoded against the ABI, wrapped in an outer error.
const revert = (errorName: "QuoteAlreadyUsed" | "QuoteExpired" | "VehicleAlreadyInsured") =>
  new BaseError("The contract function reverted.", {
    cause: new ContractFunctionRevertedError({
      abi: insuranceCore.abi,
      functionName: "buyPolicyWithPermit",
      data:
        errorName === "VehicleAlreadyInsured"
          ? encodeErrorResult({ abi: insuranceCore.abi, errorName, args: [1n] })
          : encodeErrorResult({ abi: insuranceCore.abi, errorName }),
    }),
  });

describe("describeTxError", () => {
  it("explains contract rejections in plain words", () => {
    expect(describeTxError(revert("QuoteAlreadyUsed"))).toMatch(/already used/);
    expect(describeTxError(revert("QuoteExpired"))).toMatch(/expired/);
    expect(describeTxError(revert("VehicleAlreadyInsured"))).toMatch(/already has active cover/);
  });

  it("recognises a cancelled wallet prompt, however it is wrapped", () => {
    expect(describeTxError(new UserRejectedRequestError(new Error("User rejected")))).toMatch(/cancelled/);
    expect(describeTxError({ name: "Error", message: "wrapped", cause: { code: 4001 } })).toMatch(/cancelled/);
  });

  it("matches by name, so errors from another copy of viem still read well", () => {
    const foreign = { name: "ContractFunctionExecutionError", cause: { name: "ContractFunctionRevertedError", data: { errorName: "QuoteExpired" } } };
    expect(describeTxError(foreign)).toMatch(/expired/);
  });

  it("spots a missing network fee and falls back to a safe message", () => {
    expect(describeTxError(new Error("insufficient funds for gas * price + value"))).toMatch(/Sepolia ETH/);
    expect(describeTxError(new Error("something odd"))).toMatch(/Nothing was charged/);
  });
});
