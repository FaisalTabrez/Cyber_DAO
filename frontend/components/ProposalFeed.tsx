"use client";

import { useEffect, useState } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { parseAbiItem } from "viem";
import { CONTRACTS, ABIS } from "../src/constants/contracts";
import ProposalCard from "./ProposalCard";
import { Activity, Loader2 } from "lucide-react";

// interface matching event args
interface ProposalEvent {
  proposalId: bigint;
  proposer: string;
  targets: readonly `0x${string}`[];
  values: readonly bigint[];
  signatures: readonly string[];
  calldatas: readonly `0x${string}`[];
  voteStart: bigint;
  voteEnd: bigint;
  description: string;
  transactionHash: string;
  status: number; // 0-7 from Enum
}

export default function ProposalFeed() {
  const [proposals, setProposals] = useState<ProposalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const publicClient = usePublicClient();
  const GOVERNOR_ADDRESS = CONTRACTS.DAO_GOVERNOR;

  // 1. Fetch Past Proposals
  useEffect(() => {
    async function fetchProposals() {
      if (!publicClient || !GOVERNOR_ADDRESS) {
        setIsLoading(false);
        return;
      }

      try {
        // Deployment Block: 14800000n (approx)
        // Public RPC supports this range better now
        const fromBlock = 14800000n; 

        console.log("Fetching proposals from block:", fromBlock);

        const logs = await publicClient.getLogs({
          address: GOVERNOR_ADDRESS,
          event: parseAbiItem(
            "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)"
          ),
          fromBlock,
          toBlock: 'latest'
        });

        // Map State for each proposal
        const formatted = await Promise.all(logs.map(async (log) => {
             const args = log.args as any;
             
             // Fetch current state Global Indexer style
             let state = 0; // Default Pending
             try {
                // @ts-ignore
                state = await publicClient.readContract({
                    address: GOVERNOR_ADDRESS,
                    abi: ABIS.DAOGovernor,
                    functionName: 'state',
                    args: [args.proposalId]
                }) as number;
             } catch (e) {
                 console.warn(`Could not fetch state for proposal ${args.proposalId}`, e);
             }

             return {
                ...args,
                transactionHash: log.transactionHash,
                status: state
             } as ProposalEvent;
        }));

        setProposals(formatted.sort((a, b) => Number(b.proposalId - a.proposalId))); 
      } catch (error) {
        console.error("Error fetching proposals:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProposals();
  }, [publicClient, GOVERNOR_ADDRESS]);

  // 2. Watch for Real-time New Proposals
  useWatchContractEvent({
    address: GOVERNOR_ADDRESS,
    abi: ABIS.DAOGovernor,
    eventName: "ProposalCreated",
    onLogs: async (logs) => {
        // For new logs, status is likely 0 (Pending) or 1 (Active) depending on delay
        // We can just assume 0 or fetch
        const newItems = await Promise.all(logs.map(async (log) => {
             const args = log.args as any;
             let state = 0;
             try {
                 // @ts-ignore
                 state = await publicClient?.readContract({
                     address: GOVERNOR_ADDRESS,
                     abi: ABIS.DAOGovernor,
                     functionName: 'state',
                     args: [args.proposalId]
                 }) as number;
             } catch {}
    
            return {
                ...args,
                transactionHash: log.transactionHash,
                status: state
            } as ProposalEvent;
        }));
      
      setProposals(prev => [...newItems, ...prev].sort((a, b) => Number(b.proposalId - a.proposalId)));
    },
    enabled: !!GOVERNOR_ADDRESS
  });

  if (isLoading) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-100">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
        <p className="text-gray-500">Loading On-Chain Proposals...</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-100">
         <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
         <h3 className="text-gray-600 font-semibold text-lg">No Active Proposals</h3>
         <p className="text-gray-400">The governance queue is currently empty.</p>
         {!GOVERNOR_ADDRESS && <p className="text-red-500 text-xs mt-2">Error: Governor Address Not Configured</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-bold text-gray-700">Governance Feed</h2>
       </div>
       <div className="grid grid-cols-1 gap-6">
          {proposals.map((proposal) => (
            <ProposalCard 
              key={proposal.transactionHash}
              {...proposal}
            />
          ))}
       </div>
    </div>
  );
}
