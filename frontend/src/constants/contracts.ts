import deployedAddresses from "../deployed-addresses.json";
import GovTokenABI from "../abis/GovToken.json";

// Single Source of Truth for Contract Addresses
// Prioritize Environment Variables, fallback to deployed-addresses.json, then Hardcoded Fallback
export const CONTRACTS = {
  GOVERNANCE_TOKEN: (process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS || deployedAddresses.GovernanceToken || "0x017F933806c7E43c0d4b8e72A6F0Eb5aa90294fD") as `0x${string}`,
  TIMELOCK: (process.env.NEXT_PUBLIC_TIMELOCK_ADDRESS || deployedAddresses.Timelock || "0x2d633EBb7626Bc1D348030D0F9E08968e2623dF0") as `0x${string}`,
  DAO_GOVERNOR: (process.env.NEXT_PUBLIC_DAO_GOVERNOR_ADDRESS || deployedAddresses.DAOGovernor || "0xf58b66676AA07bF28b217748432652130768a281") as `0x${string}`,
  SECURE_TREASURY: (process.env.NEXT_PUBLIC_SECURE_TREASURY_ADDRESS || deployedAddresses.SecureTreasury || "0x3BA24319a1d7B1baDdEB99D46DfB837E61812701") as `0x${string}`,
  GUARDIAN: (process.env.NEXT_PUBLIC_GUARDIAN_ADDRESS || deployedAddresses.Guardian || "0x08249eBbd323f845b802e551b71115dFBfAb250f") as `0x${string}`,
};

// Contract ABIs
export const ABIS = {
  SecureTreasury: [
    "function dailyLimit() view returns (uint256)",
    "function dailyWithdrawn() view returns (uint256)",
    "function guardian() view returns (address)",
    "function paused() view returns (bool)",
    "function circuitBreaker() external",
    "function unpause() external",
    "function transfer(address to, uint256 amount) external",
    "function withdraw(address to, uint256 amount) external",
    "function setGuardian(address _newGuardian) external",
    "function updateDailyLimit(uint256 _newLimit) external"
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

  GovernanceToken: GovTokenABI as const
};
