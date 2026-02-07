"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { ShieldCheck, Info, User } from "lucide-react";
import { CONTRACTS, ABIS } from "../src/constants/contracts";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ["#3B82F6", "#E5E7EB"]; // Blue, Gray

export default function GovernanceAnalytics() {
  const { address } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  // Address from Constants
  const TOKEN_ADDRESS = CONTRACTS.GOVERNANCE_TOKEN;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Fetch Total Supply
  const { data: totalSupplyData } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: ABIS.GovernanceToken,
    functionName: "totalSupply",
    query: { enabled: !!TOKEN_ADDRESS, refetchInterval: 5000 }
  });

  // 2. Fetch User Balance
  // We'll just fetch user and supply to calculate percentage.
  const { data: userBalanceData } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: ABIS.GovernanceToken,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!TOKEN_ADDRESS && !!address, refetchInterval: 5000 }
  });

  const totalSupply = totalSupplyData ? parseFloat(formatEther(totalSupplyData as bigint)) : 0;
  const userBalance = userBalanceData ? parseFloat(formatEther(userBalanceData as bigint)) : 0;
  
  // Calculate Distribution
  // In a real app, we'd index all holders. Here we simulate.
  const unknownHolding = totalSupply - userBalance;
  
  const data = [
    { name: "Your Stake", value: userBalance },
    { name: "Other Holders", value: unknownHolding > 0 ? unknownHolding : 0 },
  ].filter(d => d.value > 0);

  const userPower = totalSupply > 0 ? (userBalance / totalSupply) * 100 : 0;
  const isWhale = userPower > 1.0; // >1% ownership

  if (!isMounted) return null;
  if (!TOKEN_ADDRESS) return <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">Analytics Unavailable (Config Missing)</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-700">Power Concentration</h3>
         </div>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center items-center">
         {totalSupply > 0 ? (
            <div className="w-full h-[200px] relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {data.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <RechartsTooltip formatter={(value: number | undefined) => `${value?.toFixed(2) ?? "0.00"} Tokens`} />
                     <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
               </ResponsiveContainer>
               
               {/* Center Text */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                  <div className="text-center">
                     <span className="block text-2xl font-bold text-gray-900">{userPower.toFixed(2)}%</span>
                     <span className="text-[10px] text-gray-400 uppercase tracking-widest">Your Power</span>
                  </div>
               </div>
            </div>
         ) : (
            <div className="text-center text-gray-400 py-10">
               <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
               <p>No Token Data Available</p>
            </div>
         )}
         
         {/* Insights */}
         {totalSupply > 0 && (
             <div className="mt-4 w-full bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                   <User className="w-4 h-4 text-blue-600 mt-0.5" />
                   <div>
                      <p className="text-xs font-bold text-blue-800">Governance Status</p>
                      <p className="text-xs text-blue-600 mt-1">
                         {isWhale 
                            ? "��� Major Stakeholder: Your vote significantly impacts protocol direction." 
                            : "��� Minor Stakeholder: Coordinate with others to pass proposals."}
                      </p>
                   </div>
                </div>
             </div>
         )}
      </div>
    </div>
  );
}
