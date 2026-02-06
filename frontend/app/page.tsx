"use client";

import { useEffect, useState } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { formatEther, parseEther, parseAbi } from "viem";
import { ConnectKitButton } from "connectkit";
import deployedAddresses from "../src/deployed-addresses.json";
import { SecureTreasuryABI, GovernanceTokenABI } from "../lib/abis/contracts";
import { ShieldCheck, ShieldAlert, Banknote, Lock, Users } from "lucide-react";
import GovernanceAnalytics from "../components/GovernanceAnalytics";
import RecentProposals from "../components/RecentProposals";
import SecurityTerminal from "../components/SecurityTerminal";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import SubmitProposalModal from "../components/SubmitProposalModal";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  // Addresses
  const TREASURY_ADDRESS = deployedAddresses.SecureTreasury as `0x${string}`;
  const TOKEN_ADDRESS = deployedAddresses.GovernanceToken as `0x${string}`;

  // 1. Role Check: Guardian
  const { data: guardianAddress } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: SecureTreasuryABI,
    functionName: "guardian",
    query: {
       enabled: !!isConnected, // Only fetch if connected
    }
  });

  // 2. Role Check: Stakeholder (Has Voting Power)
  const parsedTokenAbi = parseAbi(GovernanceTokenABI);
  const { data: votingPower } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: parsedTokenAbi,
    functionName: "getVotes",
    args: address ? [address] : undefined,
    query: {
       enabled: !!isConnected && !!address,
    }
  });

  // Determine Role Status
  const isGuardian = isConnected && address && guardianAddress && address.toLowerCase() === (guardianAddress as string).toLowerCase();
  const isStakeholder = isConnected && votingPower && votingPower > BigInt(0);

  // 3. Treasury Overview Info (Always fetched for UI)
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

  // 4. Circuit Breaker Status (Global Alert Only)
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

  // VIEW LOGIC
  const renderContent = () => {
    if (!isConnected) {
      // PUBLIC TRANSPARENCY DASHBOARD
      return (
        <div className="space-y-8">
           <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center">
             <h2 className="text-2xl font-bold text-blue-900 mb-2">Public Transparency Dashboard</h2>
             <p className="text-blue-700 mb-4">You are viewing the Treasury in Read-Only Mode. Connect a wallet to participate.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Reuse Treasury Card */}
              <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-gray-500" /> Treasury Overview
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
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
                </div>
              </section>

              {/* Read Only Analytics */}
              <GovernanceAnalytics />
           </div>
           
           {/* Read Only Proposals */}
           <div className="mt-8">
             <RecentProposals />
           </div>
        </div>
      );
    } 
    
    if (isGuardian) {
      // SECURITY COMMAND CENTER
      return (
        <div className="space-y-6">
           <div className="bg-slate-900 text-green-400 border border-green-900 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6" />
                <div>
                   <h2 className="text-xl font-bold">Security Command Center</h2>
                   <p className="text-xs text-green-600/80">GUARDIAN CLEARANCE GRANTED</p>
                </div>
              </div>
           </div>
           
           <SecurityTerminal />

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-75">
             {/* Simplified stats for Guardian to see context */}
             <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-gray-500 font-medium mb-2">Treasury Exposure</h3>
                <p className="text-2xl font-bold">{spent} / {limit} ETH</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(spentPercentage, 100)}%` }}></div>
                </div>
             </div>
           </div>
           
           <div className="mt-8 opacity-50 hover:opacity-100 transition-opacity">
               <RecentProposals />
           </div>
        </div>
      );
    }

    if (isStakeholder) {
      // GOVERNANCE & REQUEST PORTAL
      return (
        <div className="space-y-8">
          <div className="bg-purple-50 border border-purple-200 p-6 rounded-xl flex justify-between items-center">
             <div>
               <h2 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
                 <Users className="w-6 h-6" /> Governance & Request Portal
               </h2>
               <p className="text-purple-700">You have active voting power. Create or vote on proposals.</p>
             </div>
             
             <div className="flex items-center gap-4">
                 <SubmitProposalModal />
                 <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-purple-100">
                    <span className="text-xs text-gray-400 uppercase font-bold">Your Voting Power</span>
                    <p className="text-xl font-bold text-purple-600">{formatEther(votingPower || BigInt(0))} Votes</p>
                 </div>
             </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section className="col-span-1 lg:col-span-2 space-y-6">
              <RecentProposals />
            </section>
            
            <section className="col-span-1">
               <GovernanceAnalytics />
            </section>
          </div>
        </div>
      );
    }

    // Default Fallback (Connected but 0 votes - likely a new user)
    return (
      <div className="text-center py-20">
         <h2 className="text-2xl font-bold text-gray-700 mb-4">Welcome to CyberDAO</h2>
         <p className="text-gray-500 mb-8">You are connected, but you don't have any voting power yet.</p>
         <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Apply for Membership (Get Tokens)
         </button>
         
         <div className="mt-12 text-left max-w-4xl mx-auto">
            <RecentProposals />
         </div>
      </div>
    );
  };

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
      <header className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto bg-white/50 backdrop-blur-sm sticky top-0 z-40 mb-6 rounded-b-xl border-b border-gray-100">
        <div>
           <h1 className="text-2xl font-bold flex items-center gap-2">
             <ShieldCheck className="text-blue-600" />
             CyberDAO Treasury
           </h1>
        </div>
        <ConnectKitButton />
      </header>

      <main className="max-w-7xl mx-auto px-6">
        {renderContent()}
      </main>
    </div>
  );
}
