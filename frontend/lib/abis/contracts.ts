export const SecureTreasuryABI = [
  "function dailyLimit() view returns (uint256)",
  "function dailyWithdrawn() view returns (uint256)",
  "function guardian() view returns (address)",
  "function paused() view returns (bool)",
  "function circuitBreaker() external",
  "function unpause() external",
  "function transfer(address to, uint256 amount) external"
] as const;

export const DAOGovernorABI = [
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function castVote(uint256 proposalId, uint8 support) external returns (uint256)",
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)"
] as const;

export const GovernanceTokenABI = [
  "function totalSupply() view returns (uint256)",
  "function getVotes(address account) view returns (uint256)",
  "function delegates(address account) view returns (address)",
] as const;
