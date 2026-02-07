"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { GovernanceTokenABI } from "../lib/abis/contracts";
import deployedAddresses from "../src/deployed-addresses.json";
import { Loader2, PlusCircle, CheckCircle } from "lucide-react";

export default function JoinDAOButton() {
  const { address } = useAccount();
  const [step, setStep] = useState<"idle" | "minting" | "delegating" | "done">("idle");

  const TOKEN_ADDRESS = deployedAddresses.GovernanceToken as `0x${string}`;

  // Check Balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: GovernanceTokenABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Write Hooks
  const { writeContract: mintToken, data: mintHash } = useWriteContract();
  const { writeContract: delegateToken, data: delegateHash } = useWriteContract();

  // Watch Mint
  const { isSuccess: isMinted } = useWaitForTransactionReceipt({ hash: mintHash });

  // Watch Delegate
  const { isSuccess: isDelegated } = useWaitForTransactionReceipt({ hash: delegateHash });

  // Orchestration: When mint is done, trigger delegate logic
  useEffect(() => {
    if (isMinted && step === "minting") {
        setStep("delegating");
        // Trigger auto-delegate or prompt user
        if (address) {
            delegateToken({
                address: TOKEN_ADDRESS,
                abi: GovernanceTokenABI,
                functionName: "delegate",
                args: [address],
            });
        }
    }
  }, [isMinted, step, address, delegateToken, TOKEN_ADDRESS]);

  // Orchestration: When delegate is done, finish
  useEffect(() => {
    if (isDelegated && step === "delegating") {
        setStep("done");
        refetchBalance();
    }
  }, [isDelegated, step, refetchBalance]);

  const handleJoin = () => {
    if (!address) return;
    setStep("minting");
    mintToken({
        address: TOKEN_ADDRESS,
        abi: GovernanceTokenABI,
        functionName: "mint",
        args: [address, parseEther("100")],
    });
  };

  // If user already has tokens (and we aren't in the middle of our flow), don't show
  // Convert BigInt to number safely for simple check
  const hasTokens = balance ? (balance as unknown as bigint) > 0n : false;
  if (hasTokens && step === "idle") return null;
  // If wallet isn't connected, don't show
  if (!address) return null;

  return (
    <div className="flex flex-col gap-2">
      {step === "idle" && (
        <button
            onClick={handleJoin}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:shadow-lg transition-all animate-in zoom-in"
        >
            <PlusCircle className="w-5 h-5" />
            Join DAO (Mint 100 $GT)
        </button>
      )}

      {step === "minting" && (
         <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-semibold">Minting User Tokens...</span>
         </div>
      )}

      {step === "delegating" && (
         <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-4 py-2 rounded-lg border border-purple-100">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-semibold">Activating voting power...</span>
         </div>
      )}

      {step === "done" && (
         <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100 animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-bold">Welcome to the DAO!</span>
         </div>
      )}
    </div>
  );
}
