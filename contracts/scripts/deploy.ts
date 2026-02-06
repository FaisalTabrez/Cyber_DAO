import { ethers } from "hardhat";

async function main() {
  const [deployer, guardian] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Guardian address:", guardian.address);

  // 1. Deploy Governance Token
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy();
  await token.waitForDeployment();
  console.log(`GovernanceToken deployed to: ${await token.getAddress()}`);

  // 2. Deploy Timelock
  // Min delay: 1 day (86400). 
  // Proposers: [], Executors: [], Admin: deployer (temporarily)
  const minDelay = 86400; 
  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = await Timelock.deploy(minDelay, [], [], deployer.address);
  await timelock.waitForDeployment();
  console.log(`Timelock deployed to: ${await timelock.getAddress()}`);

  // 3. Deploy DAOGovernor
  const DAOGovernor = await ethers.getContractFactory("DAOGovernor");
  const governor = await DAOGovernor.deploy(await token.getAddress(), await timelock.getAddress());
  await governor.waitForDeployment();
  console.log(`DAOGovernor deployed to: ${await governor.getAddress()}`);

  // 4. Deploy SecureTreasury
  // Guardian: second account. Daily Limit: 1 ETH.
  const dailyLimit = ethers.parseEther("1.0");
  const SecureTreasury = await ethers.getContractFactory("SecureTreasury");
  const treasury = await SecureTreasury.deploy(guardian.address, dailyLimit);
  await treasury.waitForDeployment();
  console.log(`SecureTreasury deployed to: ${await treasury.getAddress()}`);

  // -- Setup Roles --
  const timelockAddress = await timelock.getAddress();
  const governorAddress = await governor.getAddress();

  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE(); // TimelockController uses DEFAULT_ADMIN_ROLE as usage admin

  console.log("Setting up Timelock roles...");
  // Grant Proposer role to Governor
  await timelock.grantRole(PROPOSER_ROLE, governorAddress);
  // Grant Executor role to anyone (or restrict if needed)
  await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  
  // Transfer Treasury ownership to Timelock
  console.log("Transferring Treasury ownership to Timelock...");
  await treasury.transferOwnership(timelockAddress);

  // Revoke admin role from deployer so only Timelock controls itself
  console.log("Revoking admin role from deployer...");
  await timelock.revokeRole(ADMIN_ROLE, deployer.address);

  console.log("Deployment and setup complete!");
  console.log("----------------------------------------------------");
  console.log("Security Note: The deployer no longer has admin access to the Timelock.");
  console.log("The Treasury is owned by the Timelock.");
  console.log("Guardian for Circuit Breaker is:", guardian.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
