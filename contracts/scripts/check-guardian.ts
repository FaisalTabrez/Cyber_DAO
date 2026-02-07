import { ethers } from "hardhat";
import deployedAddresses from "../../frontend/src/deployed-addresses.json";

async function main() {
  // Use environment variable for target address if provided, otherwise fallback to local JSON
  // Example usage: TREASURY_ADDRESS=0x123... npx hardhat run scripts/check-guardian.ts --network baseSepolia
  const targetAddress = process.env.TREASURY_ADDRESS || deployedAddresses.SecureTreasury;

  console.log("\n🔍 Checking Guardian Status");
  console.log("   Target Contract:", targetAddress);

  if (!ethers.isAddress(targetAddress)) {
    throw new Error(`Invalid address provided: ${targetAddress}`);
  }

  // Connect to the contract
  const secureTreasury = await ethers.getContractAt("SecureTreasury", targetAddress);
  
  try {
    const guardian = await secureTreasury.guardian();
    console.log(`   🛡️  Current Guardian: ${guardian}`);
    
    // Optional: Check if it matches the expected one from local config if using standard deploy
    const expectedGuardian = deployedAddresses.Guardian;
    if (expectedGuardian && guardian.toLowerCase() === expectedGuardian.toLowerCase()) {
        console.log("   ✅ Matches your local configuration.");
    } else {
        console.log("   ⚠️  Does NOT match your local 'Guardian' config.");
        console.log("       Expected (Local):", expectedGuardian);
    }

  } catch (error) {
    console.error("   ❌ Failed to fetch guardian. Ensure the address is a SecureTreasury contract.");
    console.error(error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
