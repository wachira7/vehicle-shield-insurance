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

/// A quote as sent over JSON: amounts and times as decimal strings.
export type SerializedQuote = { [K in keyof Quote]: string };

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

export const DEFAULT_QUOTE_VALIDITY_SECONDS = 15 * 60;

export function quoteDomain(chainId: bigint | number, verifyingContract: string): TypedDataDomain {
  return { name: "VehicleShield", version: "1", chainId, verifyingContract };
}

export function signQuote(signer: Signer, domain: TypedDataDomain, quote: Quote): Promise<string> {
  return signer.signTypedData(domain, QUOTE_TYPES, quote);
}

export interface QuoteTerms {
  buyer: string;
  vehicleId: string;
  coverage: bigint;
  premium: bigint;
  deductible: bigint;
  durationDays: number;
}

/// Builds a quote with a fresh nonce and expiry, and signs it.
export async function createSignedQuote(
  signer: Signer,
  domain: TypedDataDomain,
  terms: QuoteTerms,
  { validForSeconds = DEFAULT_QUOTE_VALIDITY_SECONDS, nowSeconds = Math.floor(Date.now() / 1000) } = {},
): Promise<{ quote: Quote; signature: string }> {
  const quote: Quote = {
    buyer: terms.buyer,
    vehicleId: terms.vehicleId,
    coverage: terms.coverage,
    premium: terms.premium,
    deductible: terms.deductible,
    duration: BigInt(terms.durationDays) * 86_400n,
    deadline: BigInt(nowSeconds + validForSeconds),
    nonce: randomNonce(),
  };
  return { quote, signature: await signQuote(signer, domain, quote) };
}

export function serializeQuote(quote: Quote): SerializedQuote {
  return {
    buyer: quote.buyer,
    vehicleId: quote.vehicleId,
    coverage: quote.coverage.toString(),
    premium: quote.premium.toString(),
    deductible: quote.deductible.toString(),
    duration: quote.duration.toString(),
    deadline: quote.deadline.toString(),
    nonce: quote.nonce,
  };
}

export function deserializeQuote(quote: SerializedQuote): Quote {
  return {
    buyer: quote.buyer,
    vehicleId: quote.vehicleId,
    coverage: BigInt(quote.coverage),
    premium: BigInt(quote.premium),
    deductible: BigInt(quote.deductible),
    duration: BigInt(quote.duration),
    deadline: BigInt(quote.deadline),
    nonce: quote.nonce,
  };
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
