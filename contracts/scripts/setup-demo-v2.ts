import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------
const DEPLOYED_ADDRESSES_PATH = path.join(__dirname, "../../frontend/src/deployed-addresses.json");

// REPLACE THIS WITH YOUR SECONDARY DEMO WALLET ADDRESS
const SECONDARY_WALLET_ADDRESS = "0x0000000000000000000000000000000000000000"; 

async function main() {
  console.log("🚀 Starting Demo Setup V2...");

  // 0. Setup & Addresses
  if (!fs.existsSync(DEPLOYED_ADDRESSES_PATH)) {
    throw new Error(`Cloud not find deployed-addresses.json at ${DEPLOYED_ADDRESSES_PATH}`);
  }
  const addresses = JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_PATH, "utf8"));
  const [deployer] = await ethers.getSigners();
  const MAIN_WALLET = deployer.address;

  console.log(`\n👤 Main Wallet (Deployer): ${MAIN_WALLET}`);
  console.log(`👤 Secondary Wallet:       ${SECONDARY_WALLET_ADDRESS}`);

  if (SECONDARY_WALLET_ADDRESS === ethers.ZeroAddress || SECONDARY_WALLET_ADDRESS.includes("0x0000")) {
    console.warn("⚠️  WARNING: SECONDARY_WALLET_ADDRESS is not set. Skipping actions for secondary wallet.");
  }

  // 1. Attach Contracts
  const GovernanceToken = await ethers.getContractAt("GovernanceToken", addresses.GovernanceToken);
  const SecureTreasury = await ethers.getContractAt("SecureTreasury", addresses.SecureTreasury);

  // 2. Grant Guardian Role
  // SECURITY_GUARDIAN_ROLE = keccak256("SECURITY_GUARDIAN_ROLE")
  const GUARDIAN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SECURITY_GUARDIAN_ROLE"));
  
  console.log("\n🛡️  Checking Guardian Role...");
  const hasRole = await SecureTreasury.hasRole(GUARDIAN_ROLE, MAIN_WALLET);
  if (!hasRole) {
    console.log("   Granting Guardian Role to Main Wallet...");
    const tx = await SecureTreasury.grantRole(GUARDIAN_ROLE, MAIN_WALLET);
    await tx.wait();
    console.log("   ✅ Role Granted");
  } else {
    console.log("   ✅ Wallet already has Guardian Role");
  }

  // 3. Token Airdrop (Minting 5,000 GT)
  const AMOUNT = ethers.parseEther("5000");

  async function mintTokens(to: string, label: string) {
    if (to === ethers.ZeroAddress || !to) return;
    
    console.log(`\n💸 Minting 5,000 GT to ${label} (${to})...`);
    try {
      const tx = await GovernanceToken.mint(to, AMOUNT);
      await tx.wait();
      console.log(`   ✅ Minted`);
    } catch (e: any) {
      console.log(`   ❌ Failed to mint: ${e.message}`);
    }
  }

  await mintTokens(MAIN_WALLET, "Main Wallet");
  await mintTokens(SECONDARY_WALLET_ADDRESS, "Secondary Wallet");
  await mintTokens(addresses.SecureTreasury, "SecureTreasury");

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
