"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, encodeFunctionData, formatEther } from "viem";
import { CONTRACTS, ABIS } from "../src/constants/contracts";
import { Loader2, CheckCircle, AlertTriangle, AlertOctagon, FileText, Send } from "lucide-react";
import { useDAO } from "../hooks/useDAO";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function StakeholderActions() {
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Use Custom Hook for Data
  const { isStakeholder, dailyLimit, treasuryBalance, isLoading } = useDAO();

  const TREASURY_ADDRESS = CONTRACTS.SECURE_TREASURY;
  const GOVERNOR_ADDRESS = CONTRACTS.DAO_GOVERNOR;

  // Write Hook for Proposing
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash,
  });

  // Calculate Logic for Risks
  const parsedDailyLimit = parseFloat(dailyLimit);
  const parsedTreasuryBalance = parseFloat(treasuryBalance);
  const inputAmount = parseFloat(amount) || 0;

  const isCriticalRisk = parsedDailyLimit > 0 && inputAmount > parsedDailyLimit;
  const isHighImpact = parsedTreasuryBalance > 0 && inputAmount > (parsedTreasuryBalance * 0.10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || !description) return;

    try {
      // 1. Encode SecureTreasury.withdraw(address, uint256)
      const encodedWithdraw = encodeFunctionData({
        abi: ABIS.SecureTreasury,
        functionName: "withdraw",
        args: [recipient as `0x${string}`, parseEther(amount)],
      });

      // 2. Submit Proposal
      writeContract({
        address: GOVERNOR_ADDRESS,
        abi: ABIS.DAOGovernor,
        functionName: "propose",
        args: [
          [TREASURY_ADDRESS], // Target
          [BigInt(0)],        // Value (0 ETH sent with call)
          [encodedWithdraw],  // Calldata
          description         // Description
        ],
      });
    } catch (err) {
      console.error("Encoding Error:", err);
    }
  };

  const resetForm = () => {
    setRecipient("");
    setAmount("");
    setDescription("");
  };

  // Only render if Stakeholder
  if (!isLoading && !isStakeholder) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
      <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between">
        <h3 className="font-bold text-purple-900 flex items-center gap-2">
          <Send className="w-5 h-5 text-purple-600" /> 
          New Fund Request
        </h3>
        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded font-medium">
          Stakeholder Access
        </span>
      </div>

      <div className="p-6">
        {isConfirmed ? (
          <div className="text-center py-6">
            <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-green-700 mb-2">Proposal Created Successfully!</h4>
            <p className="text-sm text-gray-500 mb-4">The community can now vote on your request.</p>
            <p className="text-xs font-mono bg-gray-100 p-2 rounded text-gray-600 break-all mb-4">{hash}</p>
            <button 
              onClick={resetForm} 
              className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Address</label>
              <input 
                type="text" 
                placeholder="0x..." 
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>

            {/* Amount & Risk Indicators */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ETH)</label>
              <div className="relative">
                  <input 
                  type="number" 
                  step="0.0001"
                  placeholder="0.00" 
                  className={cn(
                    "w-full p-2 border rounded focus:ring-2 outline-none font-mono text-sm pr-12 transition-colors",
                    isCriticalRisk 
                      ? "border-red-300 bg-red-50 focus:ring-red-200" 
                      : isHighImpact 
                        ? "border-yellow-300 bg-yellow-50 focus:ring-yellow-200" 
                        : "border-gray-300 focus:ring-purple-500"
                  )}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500 font-bold">ETH</span>
              </div>

              {/* Warnings */}
              {isCriticalRisk && (
                <div className="flex items-start gap-2 mt-2 text-red-700 text-xs bg-red-100 p-2 rounded border border-red-200 animate-pulse">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Critical:</strong> This request exceeds the Daily Limit. It will fail the automated safety check and likely be rejected.
                  </span>
                </div>
              )}
              
              {!isCriticalRisk && isHighImpact && (
                <div className="flex items-start gap-2 mt-2 text-yellow-800 text-xs bg-yellow-100 p-2 rounded border border-yellow-200">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Caution:</strong> This is a high-impact transfer ({'>'}10% of Treasury). Expect high scrutiny from voters.
                  </span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Funds</label>
              <textarea 
                placeholder="Explain the project or need..." 
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Error Feedback */}
            {error && (
              <div className="text-red-500 text-xs bg-red-50 p-2 rounded">
                Error: {error.message.slice(0, 100)}...
              </div>
            )}

            {/* Submit */}
            <button 
              type="submit" 
              disabled={isPending || isConfirming}
              className={cn(
                "w-full font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors",
                isCriticalRisk 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-purple-600 hover:bg-purple-700 text-white",
                (isPending || isConfirming) && "opacity-70 cursor-not-allowed"
              )}
            >
              {(isPending || isConfirming) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing Proposal...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Submit Proposal
                </>
              )}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
