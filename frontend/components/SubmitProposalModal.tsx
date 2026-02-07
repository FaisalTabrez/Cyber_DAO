"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, encodeFunctionData, formatEther, parseAbi } from "viem";
import { CONTRACTS, ABIS } from "../src/constants/contracts";
import { X, Loader2, CheckCircle, AlertTriangle, FileText } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function SubmitProposalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const TREASURY_ADDRESS = CONTRACTS.SECURE_TREASURY;
  const GOVERNOR_ADDRESS = CONTRACTS.DAO_GOVERNOR;

  // 1. Fetch Daily Limit for Security Warning
  const { data: dailyLimit } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: ABIS.SecureTreasury,
    functionName: "dailyLimit",
  });

  // 2. Write Contract Hook
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash,
  });

  const parsedDailyLimit = dailyLimit ? Number(formatEther(dailyLimit as bigint)) : 0;
  const inputAmount = parseFloat(amount) || 0;
  const isOverLimit = parsedDailyLimit > 0 && inputAmount > parsedDailyLimit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || !description) return;

    try {
      // 1. Encode the Treasury transfer logic
      // We assume SecureTreasury has a transfer(address,uint256) function based on requirements
      const encodedTransfer = encodeFunctionData({
        abi: ABIS.SecureTreasury,
        functionName: "transfer",
        args: [recipient as `0x${string}`, parseEther(amount)],
      });

      // 2. Submit Proposal to Governor
      writeContract({
        address: GOVERNOR_ADDRESS,
        abi: ABIS.DAOGovernor,
        functionName: "propose",
        args: [
          [TREASURY_ADDRESS], // Targets
          [BigInt(0)],        // Values (ETH sent with call - 0 because we are calling transfer fn)
          [encodedTransfer],  // Calldatas
          description         // Description
        ],
      });
    } catch (err) {
      console.error("Encoding Error:", err);
    }
  };

  const close = () => {
    setIsOpen(false);
    // Reset form on close if success
    if (isConfirmed) {
      setRecipient("");
      setAmount("");
      setDescription("");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
      >
        <FileText className="w-4 h-4" />
        New Transfer Proposal
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Submit Treasury Proposal</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isConfirmed ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold text-green-700 mb-2">Proposal Submitted!</h4>
                  <p className="text-sm text-gray-500 mb-4">Your proposal is now active on-chain.</p>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded text-gray-600 break-all">{hash}</p>
                  <button onClick={close} className="mt-6 w-full py-2 bg-gray-900 text-white rounded hover:bg-black">
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Recipient Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Address</label>
                    <input 
                      type="text" 
                      placeholder="0x..." 
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      required
                    />
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ETH)</label>
                    <div className="relative">
                       <input 
                        type="number" 
                        step="0.0001"
                        placeholder="0.00" 
                        className={cn(
                          "w-full p-2 border rounded focus:ring-2 outline-none font-mono text-sm pr-12",
                          isOverLimit ? "border-red-300 focus:ring-red-200 bg-red-50" : "border-gray-300 focus:ring-blue-500"
                        )}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                      <span className="absolute right-3 top-2 text-sm text-gray-500 font-bold">ETH</span>
                    </div>
                    {/* Security Warning */}
                    {isOverLimit && (
                      <div className="flex items-start gap-2 mt-2 text-red-600 text-xs bg-red-50 p-2 rounded border border-red-100">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>Security Warning:</strong> This amount exceeds the Daily Limit ({parsedDailyLimit} ETH). 
                          This proposal will likely be rejected or stuck in the queue.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      placeholder="Explain why funds are needed..." 
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[80px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="text-red-500 text-xs bg-red-50 p-2 rounded">
                      Error: {error.message.slice(0, 100)}...
                    </div>
                  )}

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    disabled={isPending || isConfirming}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 rounded flex items-center justify-center gap-2"
                  >
                    {(isPending || isConfirming) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : "Submit Proposal"}
                  </button>

                </form>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
