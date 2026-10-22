// Shared EIP-712 quote definition. The pricing service signs these off-chain;
// InsuranceCore verifies the signature before selling a policy.
import { AbiCoder, keccak256, randomBytes, hexlify, toUtf8Bytes, type Signer, type TypedDataDomain } from "ethers";

export interface Quote {
  buyer: string;
  vehicleId: string; // bytes32
  coverage: bigint;
  premium: bigint;
  deductible: bigint;
  duration: bigint; // seconds
  deadline: bigint; // unix seconds
  nonce: string; // bytes32
}

export const QUOTE_TYPES = {
  Quote: [
    { name: "buyer", type: "address" },
    { name: "vehicleId", type: "bytes32" },
    { name: "coverage", type: "uint256" },
    { name: "premium", type: "uint256" },
    { name: "deductible", type: "uint256" },
    { name: "duration", type: "uint64" },
    { name: "deadline", type: "uint64" },
    { name: "nonce", type: "bytes32" },
  ],
};

export function quoteDomain(chainId: bigint | number, verifyingContract: string): TypedDataDomain {
  return { name: "VehicleShield", version: "1", chainId, verifyingContract };
}

export function signQuote(signer: Signer, domain: TypedDataDomain, quote: Quote): Promise<string> {
  return signer.signTypedData(domain, QUOTE_TYPES, quote);
}

export function randomNonce(): string {
  return hexlify(randomBytes(32));
}

/// Opaque on-chain id for a vehicle. The salt stays with the backend so plates
/// can't be recovered by hashing every possible registration number.
export function vehicleIdFor(plate: string, salt: string): string {
  const normalized = plate.replace(/\s+/g, "").toUpperCase();
  return keccak256(AbiCoder.defaultAbiCoder().encode(["string", "bytes32"], [normalized, keccak256(toUtf8Bytes(salt))]));
}
