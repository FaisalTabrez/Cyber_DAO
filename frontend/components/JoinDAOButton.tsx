"use client";

import { useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { CONTRACTS, ABIS } from "../src/constants/contracts";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function JoinDAOButton() {
  const { address } = useAccount();

  // 1. Read Balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.GOVERNANCE_TOKEN,
    abi: ABIS.GovernanceToken,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
         enabled: !!address,
         refetchInterval: 5000 
    }
  });

  // 2. Read Voting Power
  const { data: votes, refetch: refetchVotes } = useReadContract({
    address: CONTRACTS.GOVERNANCE_TOKEN,
    abi: ABIS.GovernanceToken,
    functionName: "getVotes",
    args: address ? [address] : undefined,
     query: {
         enabled: !!address,
         refetchInterval: 5000 
    }
  });

  // 3. Write Hook (Delegate)
  const { writeContract: delegate, data: hash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Refetch on Success
  useEffect(() => {
    if (isSuccess) {
      refetchBalance();
      refetchVotes();
    }
  }, [isSuccess, refetchBalance, refetchVotes]);

  if (!address) return null;

  const hasBalance = balance && (balance as unknown as bigint) > 0n;
  const hasVotingPower = votes && (votes as unknown as bigint) > 0n;
  const isBusy = isWritePending || isConfirming;

  // Case 1: Inactive User (Has tokens, no voting power)
  if (hasBalance && !hasVotingPower) {
    return (
      <button
        onClick={() => delegate({
          address: CONTRACTS.GOVERNANCE_TOKEN,
          abi: ABIS.GovernanceToken,
          functionName: "delegate",
          args: [address],
        })}
        disabled={isBusy}
        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all animate-in zoom-in ring-4 ring-amber-500/20"
      >
        {isBusy ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Activating...
          </>
        ) : (
          <>
            <AlertTriangle className="w-7 h-7" />
            <div className="flex flex-col items-start leading-tight">
                <span>Voting Power Inactive</span>
                <span className="text-xs font-medium opacity-90">Click to Activate {balance ? formatEther(balance as unknown as bigint) : "0"} Votes</span>
            </div>
          </>
        )}
      </button>
    );
  }

  // Case 2: Success / Active (Has voting power)
  if (hasVotingPower) {
    return (
      <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg border border-green-200 shadow-sm animate-in fade-in">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <span className="font-semibold">Voting Power Active</span>
        <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">
            {votes ? Number(formatEther(votes as unknown as bigint)).toLocaleString() : "0"} Votes
        </span>
      </div>
    );
  }

  return null;
}
