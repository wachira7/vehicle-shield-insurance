// Source verification through the Sourcify v2 API. hardhat-verify 2.x still calls the
// removed v1 endpoints, so we submit the compiler input ourselves.
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const SOURCIFY_URL = "https://sourcify.dev/server";
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "vehicle-shield-deploy (https://github.com/wachira7/vehicle-shield-insurance)",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/// Returns the match level ("exact_match" or "match"), or "already verified".
export async function verifyOnSourcify(
  hre: HardhatRuntimeEnvironment,
  chainId: number,
  address: string,
  contractIdentifier: string, // e.g. "contracts/InsuranceCore.sol:InsuranceCore"
): Promise<string> {
  const buildInfo = await hre.artifacts.getBuildInfo(contractIdentifier);
  if (!buildInfo) throw new Error(`No build info for ${contractIdentifier}; run yarn compile first`);

  const response = await fetch(`${SOURCIFY_URL}/v2/verify/${chainId}/${address}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      stdJsonInput: buildInfo.input,
      compilerVersion: buildInfo.solcLongVersion,
      contractIdentifier,
    }),
  });
  if (response.status === 409) return "already verified";
  if (!response.ok) throw new Error(`Sourcify rejected ${address}: ${response.status} ${await response.text()}`);

  const { verificationId } = (await response.json()) as { verificationId: string };
  for (let attempt = 0; attempt < 36; attempt++) {
    await sleep(5_000);
    const job = await (await fetch(`${SOURCIFY_URL}/v2/verify/${verificationId}`, { headers: HEADERS })).json();
    if (!job.isJobCompleted) continue;
    if (job.error) throw new Error(`Sourcify could not verify ${address}: ${job.error.message ?? JSON.stringify(job.error)}`);
    return job.contract.match ?? job.contract.runtimeMatch ?? "match";
  }
  throw new Error(`Sourcify verification of ${address} timed out (job ${verificationId})`);
}
