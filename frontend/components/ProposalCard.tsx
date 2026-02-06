"use client";

import { useState, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { formatEther, parseEther } from "viem";
import { AlertTriangle, ShieldAlert, CheckCircle, XCircle, MinusCircle, FileCode, ArrowRight } from "lucide-react";
import deployedAddresses from "../src/deployed-addresses.json";
import { DAOGovernorABI, SecureTreasuryABI } from "../lib/abis/contracts";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Proposal State Enum matching OpenZeppelin
const PROPOSAL_STATE = [
  "Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"
];

interface ProposalCardProps {
  proposalId: bigint;
  proposer?: string;
  targets: `0x${string}`[];
  values: bigint[];
  signatures: string[];
  calldatas: `0x${string}`[];
  description: string;
}

export default function ProposalCard({
  proposalId,
  targets,
  values,
  calldatas,
  description
}: ProposalCardProps) {
  const { address } = useAccount();
  
  // Contracts
  const GOVERNOR_ADDRESS = deployedAddresses.DAOGovernor as `0x${string}`;
  const TREASURY_ADDRESS = deployedAddresses.SecureTreasury as `0x${string}`;

  // 1. Fetch Dynamic Proposal Data (State & Votes)
  const { data: state, refetch: refetchState } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: DAOGovernorABI,
    functionName: "state",
    args: [proposalId],
  });

  const { data: votes, refetch: refetchVotes } = useReadContract({
    address: GOVERNOR_ADDRESS,
    abi: DAOGovernorABI,
    functionName: "proposalVotes",
    args: [proposalId],
  });

  // 2. Fetch Treasury Balance for "Large Transfer" check
  const { data: treasuryBalance } = useBalance({
    address: TREASURY_ADDRESS,
  });

  // 3. Voting Action
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  if (isConfirmed) {
      refetchVotes();
      refetchState();
  }

  const castVote = (support: 0 | 1 | 2) => {
    writeContract({
      address: GOVERNOR_ADDRESS,
      abi: DAOGovernorABI,
      functionName: "castVote",
      args: [proposalId, support], // 0=Against, 1=For, 2=Abstain
    });
  };

  // 4. Security Signal Logic
  const analysis = useMemo(() => {
    const flags: { label: string; type: "warning" | "danger" | "info" }[] = [];
    let riskScore = 0;
    
    // Check 1: Large Transfer (>10% of Treasury)
    const totalValue = values.reduce((acc, val) => acc + val, BigInt(0));
    const treasuryBal = treasuryBalance?.value || BigInt(0);
    
    // Avoid division by zero
    const tenPercent = treasuryBal > BigInt(0) ? treasuryBal / BigInt(10) : BigInt(0);

    if (totalValue > BigInt(0) && totalValue > tenPercent) {
      flags.push({ label: "Large Transfer (>10% Treasury)", type: "danger" });
      riskScore += 40;
    }

    // Check 2: New Destination (Mock check)
    // In production, we'd query an indexer for target history
    const hasHistory = targets.every(t => t.toLowerCase() === deployedAddresses.SecureTreasury.toLowerCase() || t.toLowerCase() === deployedAddresses.Timelock.toLowerCase());
    if (!hasHistory) {
         // Assume any address NOT the known system contracts is "New/Unknown" for this demo
         flags.push({ label: "New Destination / Unknown Contract", type: "warning" });
         riskScore += 30;
    }

    // Check 3: Complex Interaction (Calldata present)
    const hasCalldata = calldatas.some(cd => cd !== "0x");
    if (hasCalldata) {
        flags.push({ label: "Complex Function Call", type: "info" });
        riskScore += 10;
    }

    // Cap Score
    riskScore = Math.min(riskScore, 100);

    return { flags, riskScore, totalValue };
  }, [values, treasuryBalance, targets, calldatas]);

  // Visuals
  const currentState = typeof state === 'number' ? PROPOSAL_STATE[state] : "Loading...";
  const isActive = currentState === "Active";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">
              ID: {proposalId.toString()}
            </span>
            <span className={cn(
              "px-2 py-1 rounded text-xs font-bold uppercase",
              isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            )}>
              {currentState}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{description}</h3>
        </div>
        
        {/* Risk Meter */}
        <div className="flex flex-col items-end">
            <div className="text-xs font-semibold text-gray-500 mb-1">RISK METER</div>
            <div className="relative w-16 h-8 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gray-200 rounded-t-full"></div>
                <div 
                    className={cn(
                        "absolute top-0 left-0 w-full h-full rounded-t-full origin-bottom transition-transform duration-500",
                        analysis.riskScore > 70 ? "bg-red-500" : analysis.riskScore > 30 ? "bg-yellow-500" : "bg-green-500"
                    )}
                    style={{ transform: `rotate(${(analysis.riskScore / 100) * 180 - 180}deg)` }}
                ></div>
            </div>
            <div className={cn(
                "text-xs font-bold mt-1",
                analysis.riskScore > 70 ? "text-red-600" : analysis.riskScore > 30 ? "text-yellow-600" : "text-green-600"
            )}>
                {analysis.riskScore}/100
            </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        
        {/* Security Insights */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Security Insight
            </h4>
            
            {analysis.flags.length === 0 ? (
                <p className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> No security risks detected. Standard operation.
                </p>
            ) : (
                <ul className="space-y-2">
                    {analysis.flags.map((flag, idx) => (
                        <li key={idx} className={cn(
                            "text-sm flex items-start gap-2",
                            flag.type === "danger" ? "text-red-700 font-medium" : 
                            flag.type === "warning" ? "text-yellow-700" : "text-blue-700"
                        )}>
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span><span className="font-bold">Reason:</span> This proposal is flagged as <strong>{flag.label}</strong>.</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>

        {/* Targets & Values */}
        <div className="text-sm border-t border-gray-100 pt-4">
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <span className="text-gray-500 block text-xs uppercase">Target Address</span>
                    <span className="font-mono text-gray-700 block truncate" title={targets[0]}>{targets[0]}</span>
                    {targets.length > 1 && <span className="text-xs text-gray-400">+{targets.length - 1} more</span>}
                 </div>
                 <div>
                    <span className="text-gray-500 block text-xs uppercase">Total Value</span>
                    <span className="font-mono text-gray-700 block">{formatEther(analysis.totalValue)} ETH</span>
                 </div>
             </div>
        </div>

        {/* Voting Actions */}
        {isActive ? (
            <div className="grid grid-cols-3 gap-3 pt-2">
                <button 
                    onClick={() => castVote(1)} 
                    disabled={!address || isPending}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 transition-colors disabled:opacity-50"
                >
                    <CheckCircle className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">For</span>
                </button>
                <button 
                    onClick={() => castVote(0)} 
                    disabled={!address || isPending}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-colors disabled:opacity-50"
                >
                    <XCircle className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">Against</span>
                </button>
                <button 
                    onClick={() => castVote(2)} 
                    disabled={!address || isPending}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50"
                >
                    <MinusCircle className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">Abstain</span>
                </button>
            </div>
        ) : (
            <div className="bg-gray-50 p-3 rounded text-center text-sm text-gray-400 italic">
                Voting is closed
            </div>
        )}
        
        {isPending && <p className="text-xs text-center text-blue-500 animate-pulse">Confirming transaction...</p>}
      </div>
    </div>
  );
}
