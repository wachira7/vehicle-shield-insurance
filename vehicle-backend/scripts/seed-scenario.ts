// Drives a local deployment through every event the indexer handles: purchases, a claim
// reviewed, approved and paid, a rejected claim, a cancellation, a policy NFT transfer,
// an open claim, and pool funding and withdrawal. Local networks only.
// Usage: yarn seed:scenario --network localhost
import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";
import { createSignedQuote, priceQuote, quoteDomain, vehicleIdFor } from "@vehicle-shield/protocol";

const USDC = (n: number) => ethers.parseUnits(String(n), 6);

async function main() {
  if (!["localhost", "hardhat"].includes(network.name)) throw new Error("seed-scenario only runs on local networks");
  const [admin, alice, bob, carol] = await ethers.getSigners();
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../../packages/protocol/deployments/${network.name}.json`), "utf8"),
  );
  const core = await ethers.getContractAt("InsuranceCore", deployment.contracts.InsuranceCore);
  const nft = await ethers.getContractAt("PolicyNFT", deployment.contracts.PolicyNFT);
  const usdc = await ethers.getContractAt("MockUSDC", deployment.contracts.USDC);
  const domain = quoteDomain(deployment.chainId, deployment.contracts.InsuranceCore);
  const send = async (tx: Promise<{ wait: () => Promise<unknown> }>) => (await tx).wait();

  async function buy(buyer: typeof alice, plate: string) {
    const coverage = USDC(10_000);
    const deductible = USDC(200);
    const price = priceQuote(
      { year: 2020, marketValue: USDC(15_000), mileageKm: 90_000, condition: 7, accidentsLast3Years: 0, usage: "private" },
      { coverage, deductible, durationDays: 365 },
    );
    if (!price.eligible) throw new Error(price.reasons.join(" "));
    const latest = await ethers.provider.getBlock("latest");
    const { quote, signature } = await createSignedQuote(
      admin,
      domain,
      { buyer: buyer.address, vehicleId: vehicleIdFor(plate, "scenario"), coverage, premium: price.premium, deductible, durationDays: 365 },
      { nowSeconds: latest!.timestamp },
    );
    await send(usdc.mint(buyer.address, quote.premium));
    await send(usdc.connect(buyer).approve(deployment.contracts.InsuranceCore, quote.premium));
    const id = await core.nextPolicyId();
    await send(core.connect(buyer).buyPolicy(quote, signature));
    return id;
  }

  async function submit(holder: typeof alice, policyId: bigint, amount: number) {
    const id = await core.nextClaimId();
    await send(core.connect(holder).submitClaim(policyId, USDC(amount), `ipfs://scenario-claim-${id}`));
    return id;
  }

  const policyA = await buy(alice, "KDA 001A");
  const policyB = await buy(bob, "KDB 002B");

  const paidClaim = await submit(alice, policyA, 1_500);
  await send(core.startReview(paidClaim));
  await send(core.approveClaim(paidClaim, USDC(1_200)));
  await send(core.payClaim(paidClaim));

  const rejectedClaim = await submit(alice, policyA, 300);
  await send(core.rejectClaim(rejectedClaim, "Damage predates the policy"));

  await send(core.connect(bob).cancelPolicy(policyB));
  await send(nft.connect(alice).transferFrom(alice.address, carol.address, policyA));
  const openClaim = await submit(carol, policyA, 500);

  await send(usdc.mint(admin.address, USDC(1_000)));
  await send(usdc.approve(deployment.contracts.InsuranceCore, USDC(1_000)));
  await send(core.fundPool(USDC(1_000)));
  await send(core.withdraw(admin.address, USDC(100)));

  console.log(
    `Scenario done: policies ${policyA} (to carol) and ${policyB} (cancelled); ` +
      `claims ${paidClaim} paid, ${rejectedClaim} rejected, ${openClaim} open`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
