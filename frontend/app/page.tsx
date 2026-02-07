"use client";

import { useEffect, useState } from "react";
import { ConnectKitButton } from "connectkit";
import { ShieldCheck, ShieldAlert, Users, Eye, Lock, Coins } from "lucide-react";
import { useDAO } from "../hooks/useDAO";
import { formatEther } from "viem";

// Components
import GovernanceAnalytics from "../components/GovernanceAnalytics";
import ProposalFeed from "../components/ProposalFeed";
import GuardianTerminal from "../components/SecurityTerminal";
import TreasuryOverview from "../components/TreasuryOverview";
import NewProposalModal from "../components/modals/NewProposalModal";
import StakeholderActions from "../components/StakeholderActions"; // Keep if needed, but request implies specific layout

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    isConnected, 
    userStatus,
    paused: isSystemPaused,
    userBalance
  } = useDAO();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Role Badge Logic
  const getRoleBadge = () => {
    if (!isConnected) return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2"><Eye className="w-3 h-3"/> Public Observer</span>;
    switch (userStatus) {
      case "Guardian":
        return <span className="bg-green-900 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-700 flex items-center gap-2"><Lock className="w-3 h-3"/> Security Guardian</span>;
      case "Stakeholder":
        return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-200 flex items-center gap-2"><Users className="w-3 h-3"/> DAO Member</span>;
      default:
        return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2"><Users className="w-3 h-3"/> Guest</span>;
    }
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
           {/* Logo & Title */}
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">CyberDAO</h1>
                <p className="text-xs text-gray-500 font-medium tracking-wide">Secure Treasury Board</p>
              </div>
           </div>

           {/* Stats & Wallet */}
           <div className="flex items-center gap-4 flex-wrap justify-end">
              {isConnected && (
                 <div className="hidden md:flex flex-col items-end mr-2">
                    <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Your Balance</span>
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                       <Coins className="w-3 h-3 text-yellow-500" />
                       {parseFloat(userBalance).toFixed(2)} GVT
                    </span>
                 </div>
              )}
              {getRoleBadge()}
              
              <ConnectKitButton />
           </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
         {/* TOP SECTION: Role-Specific Action Area */}
         <section>
            {userStatus === "Guardian" ? (
               <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                 <GuardianTerminal />
               </div>
            ) : userStatus === "Stakeholder" ? (
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                  <div>
                     <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Stakeholder Governance
                     </h2>
                     <p className="text-sm text-blue-700 mt-1 max-w-xl">
                        You have voting rights. Propose new treasury allocations or vote on active proposals below.
                     </p>
                  </div>
                  <NewProposalModal />
               </div>
            ) : null }
         </section>

         {/* MIDDLE SECTION: Analytics & Treasury */}
         <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Treasury Overview */}
            <TreasuryOverview />
            
            {/* Governance Analytics (Power Concentration) */}
            <GovernanceAnalytics />
         </section>

         {/* BOTTOM SECTION: Proposal Feed */}
         <section>
             <ProposalFeed />
         </section>

      </main>
    </div>
  );
}
