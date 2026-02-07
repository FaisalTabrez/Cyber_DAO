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
}

export default function RecentProposals() {
  const [proposals, setProposals] = useState<ProposalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const publicClient = usePublicClient();
  const GOVERNOR_ADDRESS = CONTRACTS.DAO_GOVERNOR;

  // 1. Fetch Past Proposals
  useEffect(() => {
    async function fetchProposals() {
      if (!publicClient) return;

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - 3000n; // Look back ~1.5 hours on Base (2s blocks) or 3000 blocks to be safe within 10k limit

        const logs = await publicClient.getLogs({
          address: GOVERNOR_ADDRESS,
          event: parseAbiItem(
            "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)"
          ),
          fromBlock: fromBlock > 0n ? fromBlock : 0n, 
          toBlock: 'latest'
        });

        // Format logs to our shape
        const formatted = logs.map(log => ({
            ...log.args,
            transactionHash: log.transactionHash
        } as unknown as ProposalEvent)).sort((a, b) => Number(b.proposalId - a.proposalId)); // Newest first

        setProposals(formatted);
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
    onLogs(logs) {
      const newProposals = logs.map(log => ({
        // @ts-ignore - Wagmi events are strictly typed but we know args exist
        ...log.args,
        transactionHash: log.transactionHash
      } as unknown as ProposalEvent));
      
      setProposals(prev => [...newProposals, ...prev].sort((a, b) => Number(b.proposalId - a.proposalId)));
    },
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-500" /> Recent Proposals
         </h2>
         <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
           Synced: Block {Number(proposals[0]?.proposalId) || 0}+
         </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {proposals.map((prop) => (
            <ProposalCard
              key={`${prop.proposalId.toString()}_${prop.transactionHash}`}
              proposalId={prop.proposalId}
              description={prop.description}
              targets={prop.targets as `0x${string}`[]}
              values={prop.values as bigint[]}
              calldatas={prop.calldatas as `0x${string}`[]}
              signatures={prop.signatures as string[]}
              proposer={prop.proposer}
            />
          ))}
      </div>
    </div>
  );
}
