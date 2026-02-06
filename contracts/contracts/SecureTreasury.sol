// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SecureTreasury
 * @dev Holds DAO funds with extra security layers:
 *      1. Circuit Breaker (Emergency Pause) by Guardian.
 *      2. Daily Withdrawal Limits (Risk Control).
 *      3. Anti-Reentrancy.
 */
contract SecureTreasury is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -- Roles --
    address public guardian;

    // -- Risk Scoring & Limits --
    uint256 public dailyLimit; // Maximum amount (in ETH equivalent or native) per day
    uint256 public lastWithdrawalDay;
    uint256 public dailyWithdrawn;

    // -- Events --
    event Deposit(address indexed sender, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);
    event DailyLimitUpdated(uint256 newLimit);
    event GuardianUpdated(address newGuardian);
    event CircuitBreakerTriggered(address triggeredBy);

    // -- Modifiers --
    modifier onlyGuardian() {
        require(msg.sender == guardian, "Security: caller is not the guardian");
        _;
    }

    /**
     * @param _guardian The address that can trigger the circuit breaker.
     * @param _dailyLimit The initial daily withdrawal limit in wei.
     * Owner will be the Timelock controller.
     */
    constructor(address _guardian, uint256 _dailyLimit) Ownable(msg.sender) {
        guardian = _guardian;
        dailyLimit = _dailyLimit;
    }

    /**
     * @dev Allows the contract to receive native funds.
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Withers native currency (ETH/Base).
     * Security:
     * - Only Owner (Timelock) can call.
     * - Protected by ReentrancyGuard.
     * - Checked against Daily Limit.
     * - Checked against Paused state (Circuit Breaker).
     */
    function withdraw(address payable to, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
        whenNotPaused 
    {
        _checkRisk(amount);
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Treasury: transfer failed");

        emit Withdrawal(to, amount);
    }

    /**
     * @dev Withdraws ERC20 tokens.
     * Note: We map ERC20 limits separately or use a generic value oracle in a real 
     * advanced system. Here strict strictly for logic demonstration, we don't 
     * limit ERC20 by value, but you could add a mapping.
     */
    function withdrawToken(IERC20 token, address to, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
        whenNotPaused 
    {
        // Simple risk check: just ensure we don't drain the whole wallet in one go? 
        // For now, we rely on Timelock Governance delay for ERC20s unless we add price feeds.
        token.safeTransfer(to, amount);
    }

    /**
     * @dev Internal function to update risk tracking.
     */
    function _checkRisk(uint256 amount) internal {
        uint256 today = block.timestamp / 1 days;
        if (today > lastWithdrawalDay) {
            lastWithdrawalDay = today;
            dailyWithdrawn = 0;
        }

        dailyWithdrawn += amount;
        require(dailyWithdrawn <= dailyLimit, "RiskControl: Daily limit exceeded");
    }

    // -- Governance / Admin Functions --

    function updateDailyLimit(uint256 _newLimit) external onlyOwner {
        dailyLimit = _newLimit;
        emit DailyLimitUpdated(_newLimit);
    }

    function setGuardian(address _newGuardian) external onlyOwner {
        guardian = _newGuardian;
        emit GuardianUpdated(_newGuardian);
    }

    // -- Circuit Breaker --

    /**
     * @dev Triggers the circuit breaker. Stops all withdrawals.
     * Only Guardian can call.
     */
    function circuitBreaker() external onlyGuardian {
        _pause();
        emit CircuitBreakerTriggered(msg.sender);
    }

    /**
     * @dev Resets the circuit breaker.
     * Only Owner (TimelockDAO) can unpause.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
