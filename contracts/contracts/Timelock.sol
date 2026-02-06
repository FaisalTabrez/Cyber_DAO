// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title Timelock
 * @dev TimelockController acts as the execute of the DAO.
 * Security Note: The proposers and executors will be the Governor contract.
 * The admin role should be revoked from the deployer after setup to ensure
 * true decentralization.
 */
contract Timelock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
