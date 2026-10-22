import { Wallet, verifyTypedData } from "ethers";
import { describe, expect, it } from "vitest";
import {
  QUOTE_TYPES,
  createSignedQuote,
  deserializeQuote,
  quoteDomain,
  serializeQuote,
  vehicleIdFor,
} from "./quote";

const signer = Wallet.createRandom();
const domain = quoteDomain(11155111, "0x77E28604bC55A0E085771F89C84C84d6BC9c8068");
const terms = {
  buyer: "0x44b638E43c1EC2134E3103A2aa7ed74E473130AC",
  vehicleId: vehicleIdFor("KDA 123A", "salt"),
  coverage: 15_000_000_000n,
  premium: 536_090_000n,
  deductible: 750_000_000n,
  durationDays: 365,
};

describe("createSignedQuote", () => {
  it("signs a quote the signer's address can be recovered from", async () => {
    const { quote, signature } = await createSignedQuote(signer, domain, terms);
    expect(verifyTypedData(domain, QUOTE_TYPES, quote, signature)).toBe(signer.address);
  });

  it("converts days to seconds and sets the expiry", async () => {
    const { quote } = await createSignedQuote(signer, domain, terms, { nowSeconds: 1_000, validForSeconds: 900 });
    expect(quote.duration).toBe(365n * 86_400n);
    expect(quote.deadline).toBe(1_900n);
  });

  it("uses a fresh nonce every time", async () => {
    const a = await createSignedQuote(signer, domain, terms);
    const b = await createSignedQuote(signer, domain, terms);
    expect(a.quote.nonce).not.toBe(b.quote.nonce);
  });

  it("survives a JSON round trip", async () => {
    const { quote, signature } = await createSignedQuote(signer, domain, terms);
    const wire = JSON.parse(JSON.stringify(serializeQuote(quote)));
    const restored = deserializeQuote(wire);
    expect(restored).toEqual(quote);
    expect(verifyTypedData(domain, QUOTE_TYPES, restored, signature)).toBe(signer.address);
  });
});

describe("vehicleIdFor", () => {
  it("ignores spacing and case in the plate", () => {
    expect(vehicleIdFor("kda 123a", "salt")).toBe(vehicleIdFor("KDA123A", "salt"));
  });

  it("depends on the salt", () => {
    expect(vehicleIdFor("KDA 123A", "salt")).not.toBe(vehicleIdFor("KDA 123A", "other"));
  });
});
