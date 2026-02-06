"use client";

import { useEffect, useState } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import { ConnectKitButton } from "connectkit";
import deployedAddresses from "../src/deployed-addresses.json";
import { SecureTreasuryABI } from "../lib/abis/contracts";
import { ShieldCheck, ShieldAlert, Banknote, Activity } from "lucide-react";
import GovernanceAnalytics from "../components/GovernanceAnalytics";
import ProposalCard from "../components/ProposalCard";
import SecurityTerminal from "../components/SecurityTerminal";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Mock proposals for demo (in real app, fetch from The Graph or events)
// We use BigInt for IDs and Values to match Contract types
const MOCK_PROPOSALS = [
  { 
    id: BigInt(101), 
    description: "Grant 1000 ETH to vague-project", 
    targets: ["0x0000000000000000000000000000000000000000"] as `0x${string}`[], // Mock 'Bad Actor' address 
    values: [parseEther("1000")],
    calldatas: ["0x"] as `0x${string}`[],
    signatures: [""]
  },
  { 
    id: BigInt(102), 
    description: "Pay audit firm (Certik)", 
    targets: [deployedAddresses.SecureTreasury] as `0x${string}`[],
    values: [parseEther("5")],
    calldatas: ["0xa9059cbb"] as `0x${string}`[], // Mock function call (transfer)
    signatures: ["transfer(address,uint256)"]
  },
];

export default function Home() {
  const { isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  // Addresses
  const TREASURY_ADDRESS = deployedAddresses.SecureTreasury as `0x${string}`;

  // 1. Treasury Overview
  const { data: treasuryBalance } = useBalance({
    address: TREASURY_ADDRESS,
  });

  const { data: dailyLimit } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: SecureTreasuryABI,
    functionName: "dailyLimit",
  });

  const { data: dailyWithdrawn } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: SecureTreasuryABI,
    functionName: "dailyWithdrawn",
  });

  // 2. Circuit Breaker Status (Global Alert Only)
  const { data: isPausedData } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: SecureTreasuryABI,
    functionName: "paused",
  });
  const isPaused = isPausedData as boolean;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculations
  const limit = dailyLimit ? Number(formatEther(dailyLimit as bigint)) : 0;
  const spent = dailyWithdrawn ? Number(formatEther(dailyWithdrawn as bigint)) : 0;
  const spentPercentage = limit > 0 ? (spent / limit) * 100 : 0;
  const remaining = limit - spent;

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-[family-name:var(--font-geist-sans)] pb-20">
      
      {/* SECURITY BANNER */}
      {isPaused && (
        <div className="bg-red-600 text-white p-4 text-center font-bold flex items-center justify-center gap-2 animate-pulse sticky top-0 z-50 shadow-lg">
          <ShieldAlert className="w-6 h-6" />
          SYSTEM EMERGENCY LOCKDOWN ACTIVE - ALL WITHDRAWALS PAUSED
        </div>
      )}

      {/* HEADER */}
      <header className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div>
           <h1 className="text-3xl font-bold flex items-center gap-2">
             <ShieldCheck className="text-blue-600" />
             CyberDAO Treasury
           </h1>
           <p className="text-sm text-gray-500">Transparent & Secure Governance</p>
        </div>
        <ConnectKitButton />
      </header>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* 0. SECURITY TERMINAL (Top Feature) */}
        <div className="col-span-1 md:col-span-3">
          <SecurityTerminal />
        </div>

        {/* 1. TREASURY STATUS CARD */}
        <section className="col-span-1 md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-gray-500" /> Treasury Overview
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
             <div className="p-5 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium mb-1">Total Assets</p>
                <p className="text-3xl font-bold text-blue-900">
                  {treasuryBalance ? Number(formatEther(treasuryBalance.value)).toFixed(2) : "0.00"} 
                  <span className="text-lg font-normal ml-1">ETH</span>
                </p>
             </div>
             
             <div className="p-5 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 font-medium mb-1">Daily Limit</p>
                <p className="text-2xl font-bold text-gray-800">{limit} ETH</p>
             </div>

             <div className="p-5 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 font-medium mb-1">Spent Today</p>
                <p className="text-2xl font-bold text-gray-800">{spent} ETH</p>
             </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Daily Spending Capacity</span>
              <span className={spentPercentage > 80 ? "text-red-500" : "text-green-600"}>
                {remaining.toFixed(2)} ETH Remaining
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className={cn(
                  "h-4 rounded-full transition-all duration-500",
                  spentPercentage > 80 ? "bg-red-500" : "bg-green-500"
                )} 
                style={{ width: `${Math.min(spentPercentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </section>

        {/* 2. GOVERNANCE ANALYTICS (Moved to Right Col) */}
        <section className="col-span-1 md:col-span-1 h-full"> 
            <GovernanceAnalytics />
        </section>

        {/* 3. PROPOSAL FEED */}
        <section className="col-span-1 md:col-span-3">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-500" /> Recent Proposals
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {MOCK_PROPOSALS.map((prop) => (
               <ProposalCard
                 key={prop.id.toString()}
                 proposalId={prop.id}
                 description={prop.description}
                 targets={prop.targets}
                 values={prop.values}
                 calldatas={prop.calldatas}
                 signatures={prop.signatures}
               />
             ))}
          </div>
        </section>

      </main>
    </div>
  );
}
