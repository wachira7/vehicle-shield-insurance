// Assessor actions on a claim, signed by the first configured account (which must hold
// ASSESSOR_ROLE; anyone may pay an approved claim). Stands in for the console UI.
// Usage:
//   CLAIM_ID=1 ACTION=show                       yarn assess-claim --network <net>
//   CLAIM_ID=1 ACTION=review                     yarn assess-claim --network <net>
//   CLAIM_ID=1 ACTION=approve AMOUNT=800         yarn assess-claim --network <net>   (whole USDC)
//   CLAIM_ID=1 ACTION=reject REASON="Pre-existing damage" yarn assess-claim --network <net>
//   CLAIM_ID=1 ACTION=pay                        yarn assess-claim --network <net>
import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";

const STATUSES = ["None", "Submitted", "UnderReview", "Approved", "Rejected", "Paid"];

async function main() {
  const { CLAIM_ID, ACTION = "show", AMOUNT, REASON } = process.env;
  if (!CLAIM_ID || !/^\d+$/.test(CLAIM_ID)) throw new Error("Set CLAIM_ID");
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, `../../packages/protocol/deployments/${network.name}.json`), "utf8"),
  );
  const core = await ethers.getContractAt("InsuranceCore", deployment.contracts.InsuranceCore);
  const claimId = BigInt(CLAIM_ID);

  const show = async () => {
    const claim = await core.getClaim(claimId);
    const policy = await core.getPolicy(claim.policyId);
    console.log(
      `Claim #${claimId} on policy #${claim.policyId}: ${STATUSES[Number(claim.status)]}, ` +
        `requested ${ethers.formatUnits(claim.requestedAmount, 6)} USDC, payout ${ethers.formatUnits(claim.payoutAmount, 6)} USDC ` +
        `(deductible ${ethers.formatUnits(policy.deductible, 6)}), evidence ${claim.evidenceURI}`,
    );
  };

  await show();
  let tx;
  switch (ACTION) {
    case "show":
      return;
    case "review":
      tx = await core.startReview(claimId);
      break;
    case "approve":
      if (!AMOUNT) throw new Error("Set AMOUNT (whole USDC) to approve");
      tx = await core.approveClaim(claimId, ethers.parseUnits(AMOUNT, 6));
      break;
    case "reject":
      if (!REASON) throw new Error("Set REASON to reject");
      tx = await core.rejectClaim(claimId, REASON);
      break;
    case "pay":
      tx = await core.payClaim(claimId);
      break;
    default:
      throw new Error(`Unknown ACTION "${ACTION}"`);
  }
  await tx.wait();
  console.log(`${ACTION} sent in tx ${tx.hash}`);
  await show();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
