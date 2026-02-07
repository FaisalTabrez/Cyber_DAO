"use client";

import { useAccount, useReadContracts, useBalance, usePublicClient } from "wagmi";
import { formatUnits, keccak256, toBytes, getAddress, isAddressEqual, parseAbiItem } from "viem";
import { CONTRACTS, ABIS } from "../src/constants/contracts"; // Single source of truth
import { useEffect, useState } from "react";

export interface DAOProposal {
    id: bigint;
    proposer: string;
    description: string;
    voteStart: bigint; // Snapshot block
    voteEnd: bigint;   // Deadline block
    snapshot: bigint;  // Explicitly fetched
    deadline: bigint;  // Explicitly fetched
    state: number;     // 0-7
    transactionHash: string;
    targets: readonly `0x${string}`[];
    values: readonly bigint[];
    calldatas: readonly `0x${string}`[];
}

export function useDAO() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  
  // Governance History State
  const [proposals, setProposals] = useState<DAOProposal[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use Centralized Constants
  const TREASURY_ADDRESS = CONTRACTS.SECURE_TREASURY;
  const TOKEN_ADDRESS = CONTRACTS.GOVERNANCE_TOKEN;
  const GOVERNOR_ADDRESS = CONTRACTS.DAO_GOVERNOR;
  
  // Role Definition: keccak256("SECURITY_GUARDIAN_ROLE")
  // Verified Hash: 0x86c1afc0029e36adf493969d41f5975e93a4d76844e475dc266d5ad4f5f3f580
  const GUARDIAN_ROLE = keccak256(toBytes("SECURITY_GUARDIAN_ROLE"));

  const shouldFetch = mounted && !!TREASURY_ADDRESS && !!TOKEN_ADDRESS;

  // 1. Batch Fetch Contract State (Auto-Refetch every 5s)
  const { data: contractData, isLoading: isLoadingContracts } = useReadContracts({
    contracts: [
      // 0: Paused Status
      {
        address: TREASURY_ADDRESS,
        abi: ABIS.SecureTreasury,
        functionName: "paused",
        chainId: 84532,
      },
      // 1: User Token Balance (Stakeholder check)
      {
        address: TOKEN_ADDRESS,
        abi: ABIS.GovernanceToken,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        chainId: 84532,
      },
      // 2: Guardian Role Check (Replaces old 'guardian' view)
      {
        address: TOKEN_ADDRESS,
        abi: ABIS.GovernanceToken,
        functionName: "guardian",
        chainId: 84532,
      },
      // 3: Daily Limit
      {
        address: TREASURY_ADDRESS,
        abi: ABIS.SecureTreasury,
        functionName: "dailyLimit",
        chainId: 84532,
      },
      // 4: Daily Withdrawn
      {
         address: TREASURY_ADDRESS,
         abi: ABIS.SecureTreasury,
         functionName: "dailyWithdrawn",
         chainId: 84532,
      },
      // 5: Treasury Token Balance
      {
        address: TOKEN_ADDRESS,
        abi: ABIS.GovernanceToken,
        functionName: "balanceOf",
        args: [TREASURY_ADDRESS],
        chainId: 84532,
      }
    ],
    query: {
      refetchInterval: 5000,
      enabled: shouldFetch, 
      staleTime: 5000,
      retry: 2,
      // @ts-ignore
      onError: (err) => console.error('REVERT REASON (useDAO):', err)
    }
  });

  // 2. Fetch Native ETH Balance of Treasury (Still useful for gas/stats)
  const { data: treasuryEthBalanceData } = useBalance({
    address: TREASURY_ADDRESS,
    query: {
      refetchInterval: 10000,
      enabled: shouldFetch,
    }
  });

  // Safe Destructuring
  const paused = contractData?.[0]?.result as boolean ?? false;
  const userBalance = contractData?.[1]?.result as bigint ?? 0n;
  const guardianAddress = contractData?.[2]?.result as string; 
  const dailyLimit = contractData?.[3]?.result as bigint ?? 0n;
  const dailyWithdrawn = contractData?.[4]?.result as bigint ?? 0n;
  const treasuryTokenBalance = contractData?.[5]?.result as bigint ?? 0n;

  // Role Logic
  const DEMO_GUARDIAN = '0x08249eBbd323f845b802e551b71115dFBfAb250f';
  const isStartGuardian = address && guardianAddress 
    ? isAddressEqual(guardianAddress as `0x${string}`, address)
    : false;

  // Fallback for Demo (Force Guardian)
  const isGuardian = isStartGuardian || (address ? isAddressEqual(address, DEMO_GUARDIAN) : false);

  // Debug Guardian Logic
  if (address) {
    console.log("🛡️ Guardian Check:", {
      connected: address,
      contractGuardian: guardianAddress,
      isMatch: isGuardian
    });
  }

  const isStakeholder = userBalance > 0n;
  
  // Derived Status
  let userStatus: "Guardian" | "Stakeholder" | "Guest" = "Guest";
  if (isGuardian) userStatus = "Guardian";
  else if (isStakeholder) userStatus = "Stakeholder";

  // 3. Global History Indexer
  useEffect(() => {
    async function fetchAllProposals() {
        if (!publicClient || !GOVERNOR_ADDRESS) return;
        
        try {
            console.log("🔄 Syncing Governance History...");
            const currentBlock = await publicClient.getBlockNumber();
            const fromBlock = currentBlock > 50000n ? currentBlock - 50000n : 0n; // 50k Block Range
            
            const logs = await publicClient.getLogs({
                address: GOVERNOR_ADDRESS,
                event: parseAbiItem(
                    "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)"
                ),
                fromBlock,
                toBlock: 'latest' 
            });

            // Enrich with snapshot/deadline/state
            const enriched = await Promise.all(logs.map(async (log) => {
                const args = log.args as any;
                const pid = args.proposalId;
                
                // Multicall for efficiency
                const results = await publicClient.multicall({
                    contracts: [
                        { address: GOVERNOR_ADDRESS, abi: ABIS.DAOGovernor, functionName: 'proposalSnapshot', args: [pid] },
                        { address: GOVERNOR_ADDRESS, abi: ABIS.DAOGovernor, functionName: 'proposalDeadline', args: [pid] },
                        { address: GOVERNOR_ADDRESS, abi: ABIS.DAOGovernor, functionName: 'state', args: [pid] }
                    ]
                });

                return {
                    id: pid,
                    proposer: args.proposer,
                    targets: args.targets,
                    values: args.values,
                    calldatas: args.calldatas,
                    description: args.description,
                    voteStart: args.voteStart,
                    voteEnd: args.voteEnd,
                    transactionHash: log.transactionHash,
                    snapshot: results[0].result as bigint ?? 0n,
                    deadline: results[1].result as bigint ?? 0n,
                    state: results[2].result as number ?? 0
                } as DAOProposal;
            }));

            setProposals(enriched.sort((a,b) => Number(b.id - a.id)));
        } catch (e) {
            console.error("Governance History Sync Error:", e);
        } finally {
            setHistoryLoading(false);
        }
    }

    if (shouldFetch) fetchAllProposals();
  }, [publicClient, GOVERNOR_ADDRESS, shouldFetch]);

  return {
    // New History Data
    proposals,
    historyLoading,

    // Formatting for UI using formatUnits(val, 18) as requested
    treasuryBalance: formatUnits(treasuryTokenBalance, 18), // Now returning GT Balance!
    treasuryEthBalance: treasuryEthBalanceData ? formatUnits(treasuryEthBalanceData.value, 18) : "0.0",
    userBalance: formatUnits(userBalance, 18),
    dailyLimit: formatUnits(dailyLimit, 18), // Assuming limit is set in same decimals/units
    dailyWithdrawn: formatUnits(dailyWithdrawn, 18),
    userStatus,
    isGuardian,
    isStakeholder,
    paused,
    isLoading: isLoadingContracts,
    isConnected
  };
}
