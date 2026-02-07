import { ethers } from "hardhat";
import deployedAddresses from "../../frontend/src/deployed-addresses.json";

// Target Addresses
const ADDRESSES = {
  GUARDIAN: "0x08249eBbd323f845b802e551b71115dFBfAb250f",
  STAKEHOLDER: "0x2e7F647c3465d263658D63291830399053804521",
  TREASURER: "0x13BDb7B7626108CC3F350cE6dcdAA6895C5949a2"
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Starting Final Onboarding Script");
  console.log("   Operator:", deployer.address);

  // 1. Attach Contracts
  const GovernanceToken = await ethers.getContractAt("GovernanceToken", deployedAddresses.GovernanceToken);
  const SecureTreasury = await ethers.getContractAt("SecureTreasury", deployedAddresses.SecureTreasury);
  const Timelock = await ethers.getContractAt("Timelock", deployedAddresses.Timelock);

  // 2. Security Role Checks (Guardian)
  console.log("\n🔒 1. Verifying Security Roles...");
  const currentGuardian = await SecureTreasury.guardian();
  
  if (currentGuardian.toLowerCase() === ADDRESSES.GUARDIAN.toLowerCase()) {
    console.log(`   ✅ Guardian Correctly Set: ${currentGuardian}`);
  } else {
    console.warn(`   ⚠️  Guardian Mismatch! Contract has: ${currentGuardian}, Expected: ${ADDRESSES.GUARDIAN}`);
    console.warn("      (Note: SecureTreasury is owned by Timelock, so Guardian cannot be changed by script)");
  }

  // 3. Admin Role Checks (Treasurer)
  console.log("\n💼 2. Verifying Treasurer Permissions...");
  // Note: SecureTreasury uses Ownable (Timelock), not AccessControl. 
  // We cannot grant DEFAULT_ADMIN_ROLE on it. We check if Treasurer has any existing power.
  console.log("   ℹ️  SecureTreasury uses Ownable (owned by Timelock).");
  console.log("   ℹ️  Treasurer address will hold tokens but requires Governance Proposals to move Treasury funds.");

  // 4. Token Allocation (Mint/Transfer)
  console.log("\n💸 3. Allocating Governance Tokens ($GT)...");
  
  const distributions = [
    { name: "Stakeholder (Voter)", address: ADDRESSES.STAKEHOLDER, amount: "10000" },
    { name: "Treasurer (Finance)", address: ADDRESSES.TREASURER, amount: "5000" },
    { name: "Secure Treasury (Bank)", address: deployedAddresses.SecureTreasury, amount: "50000" }
  ];

  for (const dist of distributions) {
    const amountWei = ethers.parseEther(dist.amount);
    
    // Check if we need to transfer (checking recipient balance logic optional, we just send)
    process.stdout.write(`   Sending ${dist.amount} $GT to ${dist.name}... `);
    
    try {
      const tx = await GovernanceToken.transfer(dist.address, amountWei);
      await tx.wait();
      console.log("✅ Done");
    } catch (error) {
      console.log("❌ Failed");
      console.error(error);
    }
  }

  // 5. Delegation
  console.log("\n🗳️  4. Delegation Status...");
  // We cannot self-delegate for them without their keys.
  console.log("   ⚠️  Automatic delegation skipped (Requires user private key).");
  console.log("   ℹ️  Stakeholder & Treasurer must connect to Frontend and click 'Join DAO' or Delegate manually.");

  // 6. Final Status Table
  console.log("\n📊 Final Status Report:");
  console.table({
    "Guardian": { 
      Address: ADDRESSES.GUARDIAN.slice(0, 10) + "...", 
      Role: "Security Guardian", 
      Status: currentGuardian.toLowerCase() === ADDRESSES.GUARDIAN.toLowerCase() ? "ACTIVE" : "MISMATCH" 
    },
    "Stakeholder": { 
      Address: ADDRESSES.STAKEHOLDER.slice(0, 10) + "...", 
      Balance: ethers.formatEther(await GovernanceToken.balanceOf(ADDRESSES.STAKEHOLDER)) + " GT",
      Votes: ethers.formatEther(await GovernanceToken.getVotes(ADDRESSES.STAKEHOLDER)) + " Voting Power"
    },
    "Treasurer": { 
      Address: ADDRESSES.TREASURER.slice(0, 10) + "...", 
      Balance: ethers.formatEther(await GovernanceToken.balanceOf(ADDRESSES.TREASURER)) + " GT",
      Votes: ethers.formatEther(await GovernanceToken.getVotes(ADDRESSES.TREASURER)) + " Voting Power"
    },
    "Treasury": { 
      Address: deployedAddresses.SecureTreasury.slice(0, 10) + "...", 
      Balance: ethers.formatEther(await GovernanceToken.balanceOf(deployedAddresses.SecureTreasury)) + " GT",
      ManagedBy: "Timelock DAO"
    }
  });

  console.log("\n✅ Onboarding Complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
