"use client";

import { useEffect, useState } from "react";
import { ConnectKitButton } from "connectkit";
import { ShieldCheck, ShieldAlert, Banknote, Users, Eye, Lock, Activity } from "lucide-react";
import { useDAO } from "../hooks/useDAO";
import GovernanceAnalytics from "../components/GovernanceAnalytics";
import RecentProposals from "../components/RecentProposals";
import SecurityTerminal from "../components/SecurityTerminal";
import StakeholderActions from "../components/StakeholderActions";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    isConnected, 
    isGuardian, 
    isStakeholder, 
    isSystemPaused,
    treasuryBalance,
    dailyLimit,
    spentToday 
  } = useDAO();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Calculate Progress
  const limit = parseFloat(dailyLimit);
  const spent = parseFloat(spentToday);
  const spentPercent = limit > 0 ? (spent / limit) * 100 : 0;

  // Determine Role Badge
  const getRoleBadge = () => {
    if (!isConnected) return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2"><Eye className="w-3 h-3"/> Public Observer</span>;
    if (isGuardian) return <span className="bg-green-900 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-700 flex items-center gap-2"><Lock className="w-3 h-3"/> Security Guardian</span>;
    if (isStakeholder) return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-200 flex items-center gap-2"><Users className="w-3 h-3"/> DAO Member</span>;
    return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2"><Users className="w-3 h-3"/> Guest</span>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      
      {/* SYSTEM ALERT */}
      {isSystemPaused && (
        <div className="bg-red-600 text-white p-3 text-center font-bold text-sm tracking-widest animate-pulse flex justify-center items-center gap-2 sticky top-0 z-50 shadow-md">
          <ShieldAlert className="w-5 h-5" />
          SYSTEM LOCKDOWN ACTIVE - OPERATIONS HALTED
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">CyberDAO</h1>
                <p className="text-xs text-gray-500 font-medium tracking-wide">Secure Treasury Board</p>
              </div>
           </div>

           <div className="flex items-center gap-4">
              {getRoleBadge()}
              <ConnectKitButton />
           </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: Data & Analytics */}
            <div className="space-y-6">
                
                {/* Treasury Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                   <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-gray-400" />
                      <h3 className="font-semibold text-gray-700">Treasury Overview</h3>
                   </div>
                   <div className="p-6 space-y-6">
                      
                      <div>
                        <p className="text-sm text-gray-500 font-medium mb-1">Total Assets</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-gray-900">{parseFloat(treasuryBalance).toFixed(2)}</span>
                          <span className="text-sm font-bold text-gray-400">ETH</span>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                         <div className="flex justify-between items-end mb-2">
                            <div>
                               <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Daily Limit Used</p>
                               <p className="text-lg font-bold text-gray-800">{spent.toFixed(4)} / {limit} ETH</p>
                            </div>
                            <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded",
                                spentPercent > 80 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                            )}>{spentPercent.toFixed(1)}%</span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                           <div 
                              className={cn("h-full rounded-full transition-all duration-700 ease-out", spentPercent > 80 ? "bg-red-500" : "bg-blue-500")}
                              style={{ width: `${Math.min(spentPercent, 100)}%` }}
                           />
                         </div>
                      </div>
                   </div>
                </div>

                {/* Analytics Widget */}
                <GovernanceAnalytics />

            </div>

            {/* RIGHT COLUMN: Contextual Actions */}
            <div className="lg:col-span-2 space-y-6">
               
               {/* 1. Guardian View */}
               {isGuardian && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <SecurityTerminal />
                  </div>
               )}

               {/* 2. Stakeholder View */}
               {!isGuardian && isStakeholder && !isSystemPaused && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                     <StakeholderActions />
                     <div>
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                              <Users className="w-5 h-5 text-purple-600" />
                              Recent Proposals
                           </h3>
                           <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded">Voting Enabled</span>
                        </div>
                        <RecentProposals />
                     </div>
                  </div>
               )}

               {/* 3. Public / Guest / Paused View */}
               {(!isConnected || (!isGuardian && !isStakeholder) || (!isGuardian && isSystemPaused)) && (
                   <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      
                      {!isConnected && (
                         <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl mb-6 text-center">
                            <h2 className="text-xl font-bold text-blue-900 mb-2">Transparency Mode</h2>
                            <p className="text-blue-700 text-sm">You are viewing the public ledger. Connect a wallet to interact.</p>
                         </div>
                      )}
                      
                      {isSystemPaused && !isGuardian && (
                          <div className="bg-red-50 border border-red-100 p-6 rounded-xl mb-6 flex items-center gap-4 text-red-800">
                             <ShieldAlert className="w-10 h-10 text-red-600 shrink-0" />
                             <div>
                                <h3 className="font-bold text-lg">Operations Suspended</h3>
                                <p className="text-sm mt-1">The Treasury has been locked by Security Guardians via the Circuit Breaker protocol. No new proposals can be submitted until functionality is restored.</p>
                             </div>
                          </div>
                      )}

                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                         Live Proposal Feed
                      </h3>
                      <RecentProposals />
                   </div>
               )}

            </div>
         </div>
      </main>
    </div>
  );
}
