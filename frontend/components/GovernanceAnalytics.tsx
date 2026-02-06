"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatEther, parseAbi } from "viem";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertTriangle, ShieldCheck, Info, User } from "lucide-react";
import deployedAddresses from "../src/deployed-addresses.json";
import { GovernanceTokenABI } from "../lib/abis/contracts";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#E5E7EB"]; // Blue, Green, Amber, Gray

// Mock addresses for demo (representing other major stakeholders)
const MOCK_ADDRESSES = [
  "0x1234567890123456789012345678901234567890", // Mock Whale 1
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", // Mock Whale 2
] as `0x${string}`[];

export default function GovernanceAnalytics() {
  const { address } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  const TOKEN_ADDRESS = deployedAddresses.GovernanceToken as `0x${string}`;
  const parsedTokenAbi = parseAbi(GovernanceTokenABI);

  // 1. Fetch Total Supply
  const { data: totalSupplyData } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: parsedTokenAbi,
    functionName: "totalSupply",
  });

  // 2. Fetch Voting Power for: Deployer (User) + 2 Mocks
  // We use the connected address as the "Deployer/User" for this view
  const targetAddresses = [address, ...MOCK_ADDRESSES].filter(Boolean) as `0x${string}`[];

  const { data: votesData } = useReadContracts({
    contracts: targetAddresses.map((addr) => ({
      address: TOKEN_ADDRESS,
      abi: parsedTokenAbi,
      functionName: "getVotes",
      args: [addr],
    })),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="p-6 text-center text-gray-400">Loading Governance Data...</div>;

  // Process Data
  const totalSupply = totalSupplyData ? Number(formatEther(totalSupplyData)) : 0;
  
  const votes = votesData?.map((result) => 
    result.status === "success" ? Number(formatEther(result.result as bigint)) : 0
  ) || [];

  // Structure for Chart
  const userVotes = votes[0] || 0;
  const mock1Votes = votes[1] || 0;
  const mock2Votes = votes[2] || 0; // Might be 0 if only 1 mock processed, but we have strict array
  
  // Calculate specific "Other" portion (Total Supply - Known Votes)
  // In a real scenario, this would be "All other holders"
  // If data is missing/loading, default to small amounts to avoid huge "Other" slice breaking chart or showing empty
  const knownVotes = userVotes + mock1Votes + mock2Votes;
  const otherVotes = Math.max(0, totalSupply - knownVotes);

  const chartData = [
    { name: "Your Votes (Deployer)", value: userVotes },
    { name: "Whale 1", value: mock1Votes },
    { name: "Whale 2", value: mock2Votes },
    { name: "Others (Distributed)", value: otherVotes },
  ].filter(item => item.value > 0);

  // Risk Analysis
  const centralizationThreshold = totalSupply * 0.33;
  const highRiskHolders = [
    { name: "Your Wallet", value: userVotes },
    { name: "Whale 1", value: mock1Votes },
    { name: "Whale 2", value: mock2Votes }
  ].filter(h => h.value > centralizationThreshold);

  const isCentralized = highRiskHolders.length > 0;

  // Concentration Alert: Top 3 holders > 50%
  const isConcentrationRisk = totalSupply > 0 && (knownVotes / totalSupply) > 0.5;

  // Transparency Score (Mocked Logic based on "Active Delegates")
  // For demo: if we have votes > 0 for our tracked users, we assume active participation.
  // Formula: (Known Voting Power / Total Supply) * 100 scaled to a score
  const participationRate = totalSupply > 0 ? (knownVotes / totalSupply) : 0;
  const transparencyScore = Math.min(100, Math.round(participationRate * 100 + 40)); // Base 40 + real participation boost

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-gray-500" />
        Governance Analytics
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Chart */}
        <div className="h-64 flex flex-col items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value: any) => `${Number(value).toFixed(2)} Votes`} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Central Label */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-[-20px]">
             <span className="text-xs text-gray-400 font-medium">Total Supply</span>
             <p className="text-sm font-bold text-gray-700">{totalSupply.toLocaleString()} GT</p>
          </div>
        </div>

        {/* Right Col: Metrics & Warnings */}
        <div className="space-y-6">
          
          {/* 1. Risk Badge */}
          <div className={cn(
            "p-4 rounded-lg border flex items-start gap-3",
            isCentralized ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
          )}>
            {isCentralized ? (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className={cn("font-bold text-sm", isCentralized ? "text-red-900" : "text-green-900")}>
                {isCentralized ? "Centralization Warning: High Risk" : "Decentralized Governance"}
              </h3>
              <p className={cn("text-xs mt-1", isCentralized ? "text-red-700" : "text-green-700")}>
                {isCentralized 
                  ? `Warning: ${highRiskHolders[0].name} holds > 33% of supply. This creates a single point of failure.` 
                  : "No single entity holds > 33% of the voting power. The DAO is healthy."}
              </p>
            </div>
          </div>

          {/* 2. Transparency Score */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
             <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                   <Info className="w-4 h-4 text-blue-500" />
                   <span className="text-sm font-medium text-gray-700">Transparency Score</span>
                   {isConcentrationRisk && (
                     <div className="group relative flex items-center">
                       <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse cursor-help" />
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-red-900 text-white text-xs p-3 rounded shadow-xl z-50 invisible group-hover:visible transition-all opacity-0 group-hover:opacity-100 border border-red-700">
                         <strong>Governance at Risk:</strong> High concentration of power detected. Proposals may be susceptible to 51% attacks.
                         <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-900"></div>
                       </div>
                     </div>
                   )}
                </div>
                <span className={cn(
                  "text-lg font-bold",
                  transparencyScore >= 80 ? "text-green-600" : transparencyScore >= 50 ? "text-yellow-600" : "text-red-500"
                )}>
                  {transparencyScore}/100
                </span>
             </div>
             <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn("h-2 rounded-full transition-all", 
                    transparencyScore >= 80 ? "bg-green-500" : transparencyScore >= 50 ? "bg-yellow-500" : "bg-red-500"
                  )} 
                  style={{ width: `${transparencyScore}%` }}
                />
             </div>
             <p className="text-xs text-gray-400 mt-2 text-right">
                Based on active delegates vs total supply
             </p>
          </div>

          {/* 3. Top Delegates List */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Delegates</h4>
            <ul className="space-y-3">
              {chartData.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex justify-between items-center text-sm">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                      <span className="text-gray-700 truncate max-w-[120px]">{item.name}</span>
                   </div>
                   <span className="font-mono text-gray-600">{item.value.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
