import { expect } from "chai";
import { ethers } from "hardhat";
import { SecureTreasury } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SecureTreasury Security Controls", function () {
  let treasury: SecureTreasury;
  let deployer: SignerWithAddress; // Acting as Timelock/Owner
  let guardian: SignerWithAddress;
  let attacker: SignerWithAddress;
  
  const DAILY_LIMIT = ethers.parseEther("1.0"); // 1 ETH
  const INITIAL_FUNDS = ethers.parseEther("10.0");

  beforeEach(async function () {
    [deployer, guardian, attacker] = await ethers.getSigners();

    const SecureTreasuryFactory = await ethers.getContractFactory("SecureTreasury");
    treasury = (await SecureTreasuryFactory.deploy(guardian.address, DAILY_LIMIT)) as unknown as SecureTreasury;
    await treasury.waitForDeployment();

    // Fund the treasury
    await deployer.sendTransaction({
      to: await treasury.getAddress(),
      value: INITIAL_FUNDS,
    });
  });

  describe("Circuit Breaker (Emergency Pause)", function () {
    it("Should allow Guardian to trigger circuit breaker", async function () {
      await expect(treasury.connect(guardian).circuitBreaker())
        .to.emit(treasury, "CircuitBreakerTriggered")
        .withArgs(guardian.address);
        
      expect(await treasury.paused()).to.be.true;
    });

    it("Should revert withdrawals when paused", async function () {
      // 1. Guardian pauses
      await treasury.connect(guardian).circuitBreaker();

      // 2. Owner attempts withdraw
      await expect(
        treasury.connect(deployer).withdraw(deployer.address, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(treasury, "EnforcedPause");
    });
  });

  describe("Access Control", function () {
    it("Should revert if non-Guardian tries to pause", async function () {
      await expect(
        treasury.connect(attacker).circuitBreaker()
      ).to.be.revertedWith("Security: caller is not the guardian");
    });

    it("Should revert if non-Owner (non-Timelock) tries to withdraw", async function () {
      await expect(
        treasury.connect(attacker).withdraw(attacker.address, ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount")
      .withArgs(attacker.address);
    });
  });

  describe("Daily Limits (Risk Scoring)", function () {
    it("Should allow withdrawals within limit", async function () {
      const amount = ethers.parseEther("0.5");
      await expect(treasury.connect(deployer).withdraw(deployer.address, amount))
        .to.changeEtherBalance(deployer, amount);
        
      expect(await treasury.dailyWithdrawn()).to.equal(amount);
    });

    it("Should revert calls exceeding daily limit", async function () {
      // 1. Withdraw 0.5 ETH (OK)
      await treasury.connect(deployer).withdraw(deployer.address, ethers.parseEther("0.5"));

      // 2. Withdraw 0.6 ETH (Total 1.1 > 1.0 Limit) -> Should Fail
      await expect(
        treasury.connect(deployer).withdraw(deployer.address, ethers.parseEther("0.6"))
      ).to.be.revertedWith("RiskControl: Daily limit exceeded");
    });

    it("Should reset limit after 24 hours", async function () {
      // 1. Exhaust limit
      await treasury.connect(deployer).withdraw(deployer.address, ethers.parseEther("1.0"));

      // 2. Fast forward time by 1 day + 1 second
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      // 3. Withdraw again (Should work now)
      await expect(
        treasury.connect(deployer).withdraw(deployer.address, ethers.parseEther("0.5"))
      ).to.not.be.reverted;
    });
  });
});
