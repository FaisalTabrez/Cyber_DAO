import deployedAddresses from "../deployed-addresses.json";

// Single Source of Truth for Contract Addresses
// Prioritize Environment Variables, fallback to deployed-addresses.json
export const CONTRACTS = {
  GOVERNANCE_TOKEN: (process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS || deployedAddresses.GovernanceToken) as `0x${string}`,
  TIMELOCK: (process.env.NEXT_PUBLIC_TIMELOCK_ADDRESS || deployedAddresses.Timelock) as `0x${string}`,
  DAO_GOVERNOR: (process.env.NEXT_PUBLIC_DAO_GOVERNOR_ADDRESS || deployedAddresses.DAOGovernor) as `0x${string}`,
  SECURE_TREASURY: (process.env.NEXT_PUBLIC_SECURE_TREASURY_ADDRESS || deployedAddresses.SecureTreasury) as `0x${string}`,
  GUARDIAN: (process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS || deployedAddresses.Guardian) as `0x${string}`,
};

// Contract ABIs
export const ABIS = {
  SecureTreasury: [
    "function dailyLimit() view returns (uint256)",
    "function dailyWithdrawn() view returns (uint256)",
    "function guardian() view returns (address)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function paused() view returns (bool)",
    "function circuitBreaker() external",
    "function unpause() external",
    "function transfer(address to, uint256 amount) external",
    "function withdraw(address to, uint256 amount) external"
  ] as const,

  DAOGovernor: [
    "function votingDelay() view returns (uint256)",
    "function votingPeriod() view returns (uint256)",
    "function proposalThreshold() view returns (uint256)",
    "function state(uint256 proposalId) view returns (uint8)",
    "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
    "function castVote(uint256 proposalId, uint8 support) external returns (uint256)",
    "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256)",
    "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)"
  ] as const,

  GovernanceToken: [
    "function totalSupply() view returns (uint256)",
    "function getVotes(address account) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function delegates(address account) view returns (address)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function mint(address to, uint256 amount) external",
    "function delegate(address delegatee) external"
  ] as const
};
