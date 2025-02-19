import { ethers } from "hardhat";

async function main() {
  console.log("Deploying VehicleShield contracts...");

  try {
    // Deploy PolicyNFT first
    const PolicyNFT = await ethers.getContractFactory("PolicyNFT");
    const policyNFT = await PolicyNFT.deploy();
    await policyNFT.waitForDeployment();
    console.log(`PolicyNFT deployed to: ${await policyNFT.getAddress()}`);

    // Deploy RiskAssessment
    const RiskAssessment = await ethers.getContractFactory("RiskAssessment");
    const riskAssessment = await RiskAssessment.deploy();
    await riskAssessment.waitForDeployment();
    console.log(`RiskAssessment deployed to: ${await riskAssessment.getAddress()}`);

    // Deploy InsuranceCore with PolicyNFT and RiskAssessment addresses
    const InsuranceCore = await ethers.getContractFactory("InsuranceCore");
    const insuranceCore = await InsuranceCore.deploy(
      await policyNFT.getAddress(),
      await riskAssessment.getAddress()
    );
    await insuranceCore.waitForDeployment();
    console.log(`InsuranceCore deployed to: ${await insuranceCore.getAddress()}`);

    // Set InsuranceCore address in PolicyNFT
    const setTx = await policyNFT.setInsuranceCoreAddress(await insuranceCore.getAddress());
    await setTx.wait();
    console.log("InsuranceCore address set in PolicyNFT");

    console.log("\nDeployment complete!");
    console.log("\nContract Addresses:");
    console.log("-------------------");
    console.log(`PolicyNFT: ${await policyNFT.getAddress()}`);
    console.log(`RiskAssessment: ${await riskAssessment.getAddress()}`);
    console.log(`InsuranceCore: ${await insuranceCore.getAddress()}`);

    // Verify instructions
    console.log("\nTo verify on Etherscan:");
    console.log("------------------------");
    console.log(`npx hardhat verify --network sepolia ${await policyNFT.getAddress()}`);
    console.log(`npx hardhat verify --network sepolia ${await riskAssessment.getAddress()}`);
    console.log(`npx hardhat verify --network sepolia ${await insuranceCore.getAddress()} "${await policyNFT.getAddress()}" "${await riskAssessment.getAddress()}"`);

  } catch (error) {
    console.error("Error during deployment:", error);
    throw error;
  }
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });