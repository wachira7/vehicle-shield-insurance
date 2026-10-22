import fs from "fs";
import path from "path";
import hre, { ethers, network, run } from "hardhat";
import { verifyOnSourcify } from "./lib/sourcify";

// Optional environment:
//   USDC_ADDRESS        existing stablecoin; a MockUSDC is deployed when unset
//   QUOTE_SIGNER_ADDRESS, ASSESSOR_ADDRESS, TREASURER_ADDRESS, PAUSER_ADDRESS
//                       role holders; each defaults to the deployer
//   SEED_POOL_USDC      whole USDC to mint into the pool (MockUSDC only)
async function main() {
  const [deployer] = await ethers.getSigners();
  const env = process.env;
  console.log(`Deploying to ${network.name} as ${deployer.address}`);

  let usdcAddress = env.USDC_ADDRESS;
  if (!usdcAddress) {
    const mock = await ethers.deployContract("MockUSDC");
    await mock.waitForDeployment();
    usdcAddress = await mock.getAddress();
    console.log(`MockUSDC:      ${usdcAddress}`);
  }

  const policyNFT = await ethers.deployContract("PolicyNFT", [deployer.address]);
  await policyNFT.waitForDeployment();
  const policyNFTAddress = await policyNFT.getAddress();
  console.log(`PolicyNFT:     ${policyNFTAddress}`);

  const core = await ethers.deployContract("InsuranceCore", [deployer.address, usdcAddress, policyNFTAddress]);
  await core.waitForDeployment();
  const coreAddress = await core.getAddress();
  console.log(`InsuranceCore: ${coreAddress}`);

  await (await policyNFT.grantRole(await policyNFT.MINTER_ROLE(), coreAddress)).wait();

  const roles = {
    QUOTE_SIGNER_ROLE: env.QUOTE_SIGNER_ADDRESS || deployer.address,
    ASSESSOR_ROLE: env.ASSESSOR_ADDRESS || deployer.address,
    TREASURER_ROLE: env.TREASURER_ADDRESS || deployer.address,
    PAUSER_ROLE: env.PAUSER_ADDRESS || deployer.address,
  };
  for (const [role, holder] of Object.entries(roles)) {
    const roleId = await core.getFunction(role)();
    await (await core.grantRole(roleId, holder)).wait();
    console.log(`Granted ${role} to ${holder}`);
  }

  if (!env.USDC_ADDRESS && env.SEED_POOL_USDC) {
    const usdc = await ethers.getContractAt("MockUSDC", usdcAddress);
    const amount = ethers.parseUnits(env.SEED_POOL_USDC, 6);
    await (await usdc.mint(deployer.address, amount)).wait();
    await (await usdc.approve(coreAddress, amount)).wait();
    await (await core.fundPool(amount)).wait();
    console.log(`Seeded pool with ${env.SEED_POOL_USDC} USDC`);
  }

  const { chainId } = await ethers.provider.getNetwork();
  const deployment = {
    network: network.name,
    chainId: Number(chainId),
    deployedAt: new Date().toISOString(),
    contracts: { InsuranceCore: coreAddress, PolicyNFT: policyNFTAddress, USDC: usdcAddress },
    usdcIsMock: !env.USDC_ADDRESS,
    roles,
  };
  const outDir = path.join(__dirname, "../../packages/protocol/deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${network.name}.json`), JSON.stringify(deployment, null, 2) + "\n");
  console.log(`Wrote packages/protocol/deployments/${network.name}.json`);

  if (network.name === "sepolia") {
    // Let the explorers index the bytecode before verifying.
    await core.deploymentTransaction()?.wait(5);
    const toVerify: [string, string, unknown[]][] = [
      [policyNFTAddress, "contracts/PolicyNFT.sol:PolicyNFT", [deployer.address]],
      [coreAddress, "contracts/InsuranceCore.sol:InsuranceCore", [deployer.address, usdcAddress, policyNFTAddress]],
    ];
    if (!env.USDC_ADDRESS) toVerify.unshift([usdcAddress, "contracts/test/MockUSDC.sol:MockUSDC", []]);
    for (const [address, contract, constructorArguments] of toVerify) {
      try {
        console.log(`Sourcify ${contract}: ${await verifyOnSourcify(hre, Number(chainId), address, contract)}`);
        if (env.ETHERSCAN_API_KEY) await run("verify:verify", { address, contract, constructorArguments });
      } catch (error) {
        console.warn(`Verification of ${address} failed; the deployment itself succeeded.`, error);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
