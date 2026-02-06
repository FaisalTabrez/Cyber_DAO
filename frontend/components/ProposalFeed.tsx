"use client";

import { useEffect, useState } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { parseAbiItem } from "viem";
import deployedAddresses from "../src/deployed-addresses.json";
import { DAOGovernorABI } from "../lib/abis/contracts";
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

export default function ProposalFeed() {
  const [proposals, setProposals] = useState<ProposalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const publicClient = usePublicClient();
  const GOVERNOR_ADDRESS = deployedAddresses.DAOGovernor as `0x${string}`;

  // 1. Fetch Past Proposals
  useEffect(() => {
    async function fetchProposals() {
      if (!publicClient) return;

      try {
        const logs = await publicClient.getLogs({
          address: GOVERNOR_ADDRESS,
          event: parseAbiItem(
            "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)"
          ),
          fromBlock: 'earliest', // In prod, use deployment block
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
    abi: DAOGovernorABI,
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
