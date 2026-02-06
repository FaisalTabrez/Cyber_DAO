"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, encodeFunctionData } from "viem";
import { SecureTreasuryABI, DAOGovernorABI } from "../../lib/abis/contracts";
import deployedAddresses from "../../src/deployed-addresses.json";
import { X, Loader2, CheckCircle, AlertTriangle, FileText, ShieldAlert } from "lucide-react";
import { useDAO } from "../../hooks/useDAO";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function NewProposalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Use DAO hook for consistent data
  const { dailyLimit, treasuryBalance, isGuardian } = useDAO();

  const TREASURY_ADDRESS = deployedAddresses.SecureTreasury as `0x${string}`;
  const GOVERNOR_ADDRESS = deployedAddresses.DAOGovernor as `0x${string}`;

  // Write Hook for Proposing
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash,
  });

  // Security Calculations
  const parsedDailyLimit = parseFloat(dailyLimit);
  const parsedTreasuryBalance = parseFloat(treasuryBalance);
  const inputAmount = parseFloat(amount) || 0;

  const exceedsLimit = parsedDailyLimit > 0 && inputAmount > parsedDailyLimit;
  const exceedsBalance = parsedTreasuryBalance > 0 && inputAmount > parsedTreasuryBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount || !description) return;

    try {
      // 1. Encode SecureTreasury.withdraw(address, uint256)
      const encodedWithdraw = encodeFunctionData({
        abi: SecureTreasuryABI,
        functionName: "withdraw",
        args: [recipient as `0x${string}`, parseEther(amount)],
      });

      // 2. Submit Proposal
      writeContract({
        address: GOVERNOR_ADDRESS,
        abi: DAOGovernorABI,
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

  const close = () => {
    setIsOpen(false);
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
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm"
      >
        <FileText className="w-4 h-4" />
        New Proposal
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 scale-100 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                 Submit Withdrawal Proposal
              </h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-700 transition-colors bg-white hover:bg-gray-100 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
               {isConfirmed ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-green-700 mb-2">Proposal Submitted!</h4>
                    <p className="text-gray-500 mb-6">Your withdrawal request has been encoded and proposed to the DAO.</p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-6 font-mono text-xs text-gray-500 break-all">
                       {hash}
                    </div>
                    <button 
                      onClick={close}
                      className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-bold hover:bg-black transition-colors"
                    >
                      Close
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
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm transition-all"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        required
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Amount (ETH)</label>
                      <input 
                        type="number" 
                        step="0.000000000000000001"
                        placeholder="0.00" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm transition-all"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>

                    {/* Security Warnings */}
                    {(exceedsLimit || exceedsBalance) && (
                        <div className={cn(
                            "p-3 rounded-lg border flex items-start gap-3",
                            exceedsBalance ? "bg-red-50 border-red-200 text-red-800" : "bg-orange-50 border-orange-200 text-orange-800"
                        )}>
                           <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                           <div className="text-sm">
                              {exceedsBalance && <p className="font-bold">Error: Exceeds Treasury Balance</p>}
                              {exceedsLimit && <p className="font-bold">Warning: Exceeds Daily Limit</p>}
                              <p className="mt-1 opacity-90 text-xs">
                                 {exceedsBalance 
                                    ? "This proposal is mathematically impossible to execute." 
                                    : "This transaction will likely trigger the Circuit Breaker pause mechanism."}
                              </p>
                           </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Proposal Description</label>
                      <textarea 
                        placeholder="Why is this withdrawal needed?" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm min-h-[100px] transition-all"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>

                    {error && (
                      <div className="text-red-600 bg-red-50 p-3 rounded-lg text-xs border border-red-100">
                        {error.message.slice(0, 150)}...
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                       <button 
                         type="button" 
                         onClick={close}
                         className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                       >
                         Cancel
                       </button>
                       <button 
                         type="submit" 
                         disabled={isPending || isConfirming || exceedsBalance}
                         className={cn(
                            "flex-1 py-2.5 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all",
                            (isPending || isConfirming) ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700",
                            exceedsBalance && "opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400"
                         )}
                       >
                          {isPending || isConfirming ? (
                             <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                             "Submit Proposal"
                          )}
                       </button>
                    </div>

                  </form>
               )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
