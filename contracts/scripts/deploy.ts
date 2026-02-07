import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    throw new Error("No accounts found. Please check your .env file and ensure PRIVATE_KEY is set.");
  }

  const deployer = signers[0];
  
  // Use second account as guardian if available, otherwise deployer
  const guardianAddress = "0x08249eBbd323f845b802e551b71115dFBfAb250f"; // User Specified Guardian

  console.log("----------------------------------------------------");
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Guardian address set to:", guardianAddress);
  console.log("----------------------------------------------------");

  if (signers.length < 2) {
    console.warn("⚠️  WARNING: Only 1 account detected. Guardian is set to Deployer.");
    console.warn("   For production, use a separate wallet for the Guardian role.");
  }

  // 1. Deploy Governance Token
  console.log("1. Deploying GovernanceToken...");
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`   ✅ GovernanceToken: ${tokenAddress}`);

  // 2. Deploy Timelock
  // Min delay: 1 day (86400). 
  // Proposers: [], Executors: [], Admin: deployer (temporarily)
  console.log("2. Deploying Timelock...");
  const minDelay = 86400; 
  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = await Timelock.deploy(minDelay, [], [], deployer.address);
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log(`   ✅ Timelock: ${timelockAddress}`);

  // 3. Deploy DAOGovernor
  console.log("3. Deploying DAOGovernor...");
  const DAOGovernor = await ethers.getContractFactory("DAOGovernor");
  const governor = await DAOGovernor.deploy(tokenAddress, timelockAddress);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log(`   ✅ DAOGovernor: ${governorAddress}`);

  // 4. Deploy SecureTreasury
  // Guardian: calculated above. Daily Limit: 1 ETH.
  console.log("4. Deploying SecureTreasury...");
  const dailyLimit = ethers.parseEther("1.0");
  const SecureTreasury = await ethers.getContractFactory("SecureTreasury");
  const treasury = await SecureTreasury.deploy(guardianAddress, dailyLimit);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log(`   ✅ SecureTreasury: ${treasuryAddress}`);

  // 5. Fund Treasury with Governance Tokens
  console.log("5. Funding SecureTreasury...");
  const initialFundingAmount = ethers.parseEther("50000"); // 50,000 $GT
  console.log(`   Transferring 50,000 $GT to Treasury (${treasuryAddress})...`);
  const fundTx = await token.transfer(treasuryAddress, initialFundingAmount);
  await fundTx.wait();
  console.log("   ✅ Treasury Funded");

  // -- Setup Roles --
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE(); 
  // TimelockController uses DEFAULT_ADMIN_ROLE as usage admin

  console.log("\n-- 🔐 Setting up Security Roles --");
  
  // Grant Proposer role to Governor
  console.log("   Grating PROPOSER_ROLE to Governor...");
  const tx1 = await timelock.grantRole(PROPOSER_ROLE, governorAddress);
  await tx1.wait();
  
  // Grant Executor role to anyone (open for execution by public)
  console.log("   Grating EXECUTOR_ROLE to zero address (open)...");
  const tx2 = await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  await tx2.wait();
  
  // Transfer Treasury ownership to Timelock
  console.log("   Transferring Treasury ownership to Timelock...");
  const tx3 = await treasury.transferOwnership(timelockAddress);
  await tx3.wait();

  // Revoke admin role from deployer so only Timelock controls itself
  console.log("   Revoking ADMIN_ROLE from deployer (Decentralization)...");
  const tx4 = await timelock.revokeRole(ADMIN_ROLE, deployer.address);
  await tx4.wait();

  console.log("\n-- 💾 Saving Deployment Config --");
  const deployments = {
    GovernanceToken: tokenAddress,
    Timelock: timelockAddress,
    DAOGovernor: governorAddress,
    SecureTreasury: treasuryAddress,
    Guardian: guardianAddress
  };

  // We go up one level from 'contracts' to root, then into 'frontend/src'
  // NOTE: This assumes scripts runs from 'contracts' folder
  const outputPath = path.resolve(__dirname, "../../frontend/src/deployed-addresses.json");
  
  fs.writeFileSync(outputPath, JSON.stringify(deployments, null, 2));
  console.log(`   ✅ Saved to: ${outputPath}`);

  console.log("\n----------------------------------------------------");
  console.log("Deployment Complete!");
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
