// scripts/extractAbis.ts
import fs from 'fs';
import path from 'path';

async function main() {
    // Create abis directory if it doesn't exist
    const abiDir = path.join(__dirname, '../abis');
    if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir);
    }

    // List of contracts to extract ABIs from
    const contracts = ['InsuranceCore', 'PolicyNFT', 'RiskAssessment','IVehicleShield' ];

    contracts.forEach(contractName => {
        // Read the artifact file
        const artifactPath = path.join(
            __dirname,
            `../artifacts/contracts/${contractName}.sol/${contractName}.json`
        );
        
        try {
            const artifactFile = fs.readFileSync(artifactPath, 'utf8');
            const artifact = JSON.parse(artifactFile);
            
            // Write only the ABI to a new file
            fs.writeFileSync(
                path.join(abiDir, `${contractName}.json`),
                JSON.stringify(artifact.abi, null, 2)
            );
            
            console.log(`✅ Extracted ABI for ${contractName}`);
        } catch (error) {
            console.error(`❌ Error extracting ABI for ${contractName}:`, error);
        }
    });
}

main()
    .then(() => console.log('🎉 ABI extraction complete!'))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });