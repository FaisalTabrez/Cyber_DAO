"use client";

import { Banknote, Activity } from "lucide-react";
import { useDAO } from "../hooks/useDAO";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS, ABIS } from "../src/constants/contracts";
import { useEffect, useState } from "react";

export default function TreasuryOverview() {
  const { dailyLimit, dailyWithdrawn } = useDAO();
  const [mounted, setMounted] = useState(false);

  // Addresses
  const TREASURY_ADDRESS = CONTRACTS.SECURE_TREASURY;
  const TOKEN_ADDRESS = CONTRACTS.GOVERNANCE_TOKEN;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Token Balance of Treasury
  const { data: tokenBalance, isError, isLoading } = useReadContract({
    address: CONTRACTS.GOVERNANCE_TOKEN,
    abi: ABIS.GovernanceToken,
    functionName: "balanceOf",
    args: [CONTRACTS.SECURE_TREASURY],
    chainId: 84532, // Force Base Sepolia
    query: {
        enabled: !!CONTRACTS.GOVERNANCE_TOKEN,
        refetchInterval: 5000,
    }
  });

  // Debug Logging
  useEffect(() => {
    if (mounted) {
        console.log("💰 Treasury Overview Debug:", {
            TREASURY_ADDRESS,
            TOKEN_ADDRESS,
            tokenBalance: tokenBalance ? formatUnits(tokenBalance as unknown as bigint, 18) : "loading/undefined",
            isLoading,
            isError
        });
        if (isError) console.error("Balance Fetch Error: Blockchain call failed.");
    }
  }, [mounted, tokenBalance, isLoading, isError, TREASURY_ADDRESS, TOKEN_ADDRESS]);

  if (!mounted) return <div className="p-6 text-gray-400">Loading Treasury Data...</div>;

  // Explicitly use formatUnits(..., 18)
  const formattedBalance = tokenBalance ? parseFloat(formatUnits(tokenBalance as unknown as bigint, 18)) : 0;

  // Progress Calculations (ETH Limit)
  // Note: The daily limit logic in SecureTreasury is typically for ETH withdrawals.
  // We display it here for completeness of the DAO state, even if we operate on tokens now.
  const limit = parseFloat(dailyLimit);
  const spent = parseFloat(dailyWithdrawn);
  const spentPercent = limit > 0 ? (spent / limit) * 100 : 0;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
       <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-700">Treasury Overview</h3>
       </div>
       <div className="p-6 space-y-6">
          
          {/* Total Assets (Token) */}
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Total Assets</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">{formattedBalance.toFixed(2)}</span>
              <span className="text-sm font-bold text-gray-400">$GT</span>
            </div>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
               <Activity className="w-3 h-3" />
               +2.4% from last epoch
            </p>
          </div>

          {/* Daily Limit Progress */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Daily ETH Spending Limit</span>
                <span className="text-xs font-bold text-gray-900">{spent.toFixed(2)} / {limit.toFixed(2)} ETH</span>
             </div>
             <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                   className={`h-full rounded-full transition-all duration-500 ${
                       spentPercent > 80 ? 'bg-red-500' : 'bg-blue-500'
                   }`} 
                   style={{ width: `${Math.min(spentPercent, 100)}%` }} 
                />
             </div>
             <div className="mt-2 text-[10px] text-gray-400 text-right">
                {spentPercent > 100 ? "Limit Exceeded" : `${(100 - spentPercent).toFixed(1)}% remaining`}
             </div>
          </div>
          
       </div>
    </div>
  );
}
