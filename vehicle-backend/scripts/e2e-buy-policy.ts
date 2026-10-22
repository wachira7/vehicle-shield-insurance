// End-to-end purchase: requests a signed quote from the running quote API over HTTP,
// approves the premium and buys the policy on-chain with the first configured account.
// Usage: API_URL=http://localhost:8787 yarn e2e:buy --network <localhost|sepolia>
import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";
import { deserializeQuote, type SerializedQuote } from "@vehicle-shield/protocol";

async function main() {
  const apiUrl = process.env.API_URL || "http://localhost:8787";
  const plate = process.env.PLATE || `E2E ${Date.now().toString(36).toUpperCase()}`;
  const [buyer] = await ethers.getSigners();
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../../packages/protocol/deployments/${network.name}.json`), "utf8"),
  );
  const core = await ethers.getContractAt("InsuranceCore", deployment.contracts.InsuranceCore);
  const usdc = await ethers.getContractAt("MockUSDC", deployment.contracts.USDC);

  console.log(`Requesting a quote for ${plate} from ${apiUrl} as ${buyer.address}`);
  const response = await fetch(`${apiUrl}/v1/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyer: buyer.address,
      plate,
      vehicle: { year: 2021, marketValueUsdc: 18_000, mileageKm: 72_000, condition: 8, accidentsLast3Years: 0, usage: "private" },
      coverageUsdc: 12_000,
      deductibleUsdc: 500,
      durationDays: 365,
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Quote API returned ${response.status}: ${JSON.stringify(body)}`);
  console.log(`Quoted ${body.premiumUsdc} USDC/year for ${ethers.formatUnits(body.quote.coverage, 6)} USDC cover`);

  const quote = deserializeQuote(body.quote as SerializedQuote);
  if (deployment.usdcIsMock && (await usdc.balanceOf(buyer.address)) < quote.premium) {
    await (await usdc.mint(buyer.address, quote.premium)).wait();
    console.log("Minted test USDC for the premium");
  }
  await (await usdc.approve(deployment.contracts.InsuranceCore, quote.premium)).wait();

  const receipt = await (await core.buyPolicy(quote, body.signature)).wait();
  const purchased = receipt!.logs
    .map((log) => core.interface.parseLog(log))
    .find((event) => event?.name === "PolicyPurchased");
  if (!purchased) throw new Error("PolicyPurchased event not found");

  const policyId = purchased.args.policyId as bigint;
  const policy = await core.getPolicy(policyId);
  console.log(`Bought policy #${policyId} in tx ${receipt!.hash}`);
  console.log(`  premium ${ethers.formatUnits(policy.premium, 6)} USDC, active: ${await core.isPolicyActive(policyId)}`);
  console.log(`  covers until ${new Date(Number(policy.endTime) * 1000).toISOString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
