import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------
const DEPLOYED_ADDRESSES_PATH = path.join(__dirname, "../../frontend/src/deployed-addresses.json");

// REPLACE THIS WITH YOUR SECONDARY DEMO WALLET ADDRESS
const SECONDARY_WALLET_ADDRESS = "0x80577fdD7fD0EB3BEbC77d5610fc4B2020e84828"; 

async function main() {
  console.log("🚀 Starting Demo Setup V2...");

  // 0. Setup & Addresses
  if (!fs.existsSync(DEPLOYED_ADDRESSES_PATH)) {
    throw new Error(`Cloud not find deployed-addresses.json at ${DEPLOYED_ADDRESSES_PATH}`);
  }
  const addresses = JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_PATH, "utf8"));
  const [deployer] = await ethers.getSigners();
  const MAIN_WALLET = "0x08249eBbd323f845b802e551b71115dFBfAb250f";

  console.log(`\n👤 Main Wallet (Target):   ${MAIN_WALLET}`);
  console.log(`👤 Deployer (Signer):      ${deployer.address}`);
  console.log(`👤 Secondary Wallet:       ${SECONDARY_WALLET_ADDRESS}`);

  if (SECONDARY_WALLET_ADDRESS === ethers.ZeroAddress || SECONDARY_WALLET_ADDRESS.includes("0x0000")) {
    console.warn("⚠️  WARNING: SECONDARY_WALLET_ADDRESS is not set. Skipping actions for secondary wallet.");
  }

  // 1. Attach Contracts
  const GovernanceToken = await ethers.getContractAt("GovernanceToken", addresses.GovernanceToken);
  const SecureTreasury = await ethers.getContractAt("SecureTreasury", addresses.SecureTreasury);

  // 2. Check Guardian (Simple Address, not AccessControl) 
  console.log("\n🛡️  Checking Guardian...");
  // Note: SecureTreasury.sol uses 'guardian()' public getter, not AccessControl
  const currentGuardian = await SecureTreasury.guardian();
  
  if (currentGuardian.toLowerCase() !== MAIN_WALLET.toLowerCase()) {
    console.log(`   Current Guardian is ${currentGuardian}. Updating to ${MAIN_WALLET}...`);
    try {
       // Only Owner can set guardian. If owner is Timelock, this will fail unless we are the Timelock (unlikely).
       // If owner is Deployer, this works.
       const tx = await SecureTreasury.setGuardian(MAIN_WALLET);
       await tx.wait();
       console.log("   ✅ Guardian Updated");
    } catch (e: any) {
       console.log(`   ⚠️  Failed to update Guardian: ${e.message}`);
       console.log("      (This is expected if ownership was already transferred to the Timelock)");
    }
  } else {
    console.log("   ✅ Wallet is already the Guardian");
  }

  // 3. Token Distribution (Transfer from Deployer instead of Mint)
  // GovernanceToken.sol has fixed supply minted to deployer.
  const AMOUNT = ethers.parseEther("5000");

  async function distributeTokens(to: string, label: string) {
    if (!to || to === ethers.ZeroAddress) return;
    if (to.toLowerCase() === MAIN_WALLET.toLowerCase()) {
         console.log(`\n🔹 Skipping transfer to Main Wallet (Deployer holds supply).`);
         return;
    }
    
    console.log(`\n💸 Transferring 5,000 GT to ${label} (${to})...`);
    try {
      const tx = await GovernanceToken.transfer(to, AMOUNT);
      await tx.wait();
      console.log(`   ✅ Transferred`);
    } catch (e: any) {
      console.log(`   ❌ Failed to transfer: ${e.message}`);
    }
  }

  await distributeTokens(MAIN_WALLET, "Main Wallet");
  await distributeTokens(SECONDARY_WALLET_ADDRESS, "Secondary Wallet");
  await distributeTokens(addresses.SecureTreasury, "SecureTreasury");

  // 4. Self-Delegation
  console.log("\n🗳️  Handling Delegation...");
  
  // 4a. Main Wallet Delegation
  const currentDelegate = await GovernanceToken.delegates(MAIN_WALLET);
  if (currentDelegate !== MAIN_WALLET) {
    console.log("   Delegating Main Wallet to self...");
    const tx = await GovernanceToken.delegate(MAIN_WALLET);
    await tx.wait();
    console.log("   ✅ Delegated");
  } else {
    console.log("   ✅ Main Wallet already delegated");
  }

  // 4b. Secondary Wallet Delegation (Requires private key)
  if (SECONDARY_WALLET_ADDRESS !== ethers.ZeroAddress) {
    console.log(`   ⚠️  Cannot auto-delegate for Secondary Wallet (${SECONDARY_WALLET_ADDRESS}).`);
    console.log(`   👉 Action Required: Login as Secondary Wallet and delegate to self via UI or contract.`);
  }

  // 5. Final Confirmation
  console.log("\n📊 Final Balances:");
  
  const b1 = await GovernanceToken.balanceOf(MAIN_WALLET);
  const votes1 = await GovernanceToken.getVotes(MAIN_WALLET);
  console.log(`   Main Wallet:      ${ethers.formatEther(b1)} GT | Voting Power: ${ethers.formatEther(votes1)}`);

  if (SECONDARY_WALLET_ADDRESS !== ethers.ZeroAddress) {
    const b2 = await GovernanceToken.balanceOf(SECONDARY_WALLET_ADDRESS);
    const votes2 = await GovernanceToken.getVotes(SECONDARY_WALLET_ADDRESS);
    console.log(`   Secondary Wallet: ${ethers.formatEther(b2)} GT | Voting Power: ${ethers.formatEther(votes2)}`);
  }

  const b3 = await GovernanceToken.balanceOf(addresses.SecureTreasury);
  console.log(`   Treasury:         ${ethers.formatEther(b3)} GT`);

  console.log("\n✅ Demo Setup Complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
