"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent, useBalance } from "wagmi";
import { formatEther } from "viem";
import { SecureTreasuryABI, DAOGovernorABI } from "../lib/abis/contracts";
import { Terminal, ShieldAlert, Lock, Unlock, Activity, AlertOctagon, Power, FileWarning } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface SecurityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
}

export default function SecurityTerminal() {
  const { address } = useAccount();
  const [logs, setLogs] = useState<SecurityLog[]>([
    { id: '1', timestamp: new Date().toLocaleTimeString(), message: "Guardian Node: Online", type: 'success' },
    { id: '2', timestamp: new Date().toLocaleTimeString(), message: "Scanning Mempool for Threats...", type: 'info' },
  ]);
  const [isArmed, setIsArmed] = useState(false);
  const [shake, setShake] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Addresses from Env
  const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_SECURE_TREASURY_ADDRESS as `0x${string}`;
  const GOVERNOR_ADDRESS = process.env.NEXT_PUBLIC_DAO_GOVERNOR_ADDRESS as `0x${string}`;

  // 1. System State
  const { data: isPausedData } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: SecureTreasuryABI,
    functionName: "paused",
    query: { refetchInterval: 2000, enabled: !!TREASURY_ADDRESS }
  });
  const isPaused = isPausedData as boolean ?? false;

  // 2. Metrics
  const { data: balanceData } = useBalance({ 
    address: TREASURY_ADDRESS,
    query: { enabled: !!TREASURY_ADDRESS }
  });
  
  const { data: dailyLimitData } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: SecureTreasuryABI,
    functionName: "dailyLimit",
    query: { enabled: !!TREASURY_ADDRESS }
  });

  const dailyLimit = dailyLimitData ? parseFloat(formatEther(dailyLimitData as bigint)) : 0;
  const balance = balanceData ? parseFloat(formatEther(balanceData.value)) : 0;
  const coverage = dailyLimit > 0 ? (balance / dailyLimit) : 0;

  // 3. Write Config
  const { writeContract, isPending } = useWriteContract();

  // 4. Log Management
  const addLog = useCallback((message: string, type: SecurityLog['type'] = 'info') => {
    setLogs(prev => {
      const newLogs = [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      }];
      return newLogs.slice(-10); // Keep last 10
    });
  }, []);

  // 5. Watchers
  useWatchContractEvent({
    address: GOVERNOR_ADDRESS,
    abi: DAOGovernorABI,
    eventName: 'ProposalCreated',
    onLogs(newLogs) {
      newLogs.forEach(log => {
         const hash = log.transactionHash as string | null;
         addLog(`New Governance Proposal Detected: ${hash ? hash.slice(0, 8) : 'Unknown'}`, 'warning');
      });
    },
    enabled: !!GOVERNOR_ADDRESS
  });

  // Effect: Shake on Pause Trigger
  useEffect(() => {
    if (isPaused) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isPaused]);

  // Effect: Auto-scroll
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);


  const executeSecurityProtocol = () => {
    if (isPaused) {
       // Resume
       writeContract({
          address: TREASURY_ADDRESS,
          abi: SecureTreasuryABI,
          functionName: "unpause", 
       }, {
         onSuccess: () => {
           addLog("Resuming Operations...", "success");
           setIsArmed(false);
         },
         onError: (e) => addLog(`Resume Failed: ${e.message.slice(0, 20)}`, 'critical')
       });
    } else {
       // PAUSE (Circuit Breaker)
       writeContract({
          address: TREASURY_ADDRESS,
          abi: SecureTreasuryABI,
          functionName: "circuitBreaker",
       }, {
         onSuccess: () => addLog("CIRCUIT BREAKER ACTIVATED", "critical"),
         onError: (e) => addLog(`Breaker Failed: ${e.message.slice(0, 20)}`, 'critical')
       });
    }
  };

  if (!TREASURY_ADDRESS || !GOVERNOR_ADDRESS) {
      return <div className="p-4 text-red-500 font-mono">Control Error: Configuration Missing</div>
  }

  return (
    <div className={cn(
      "w-full rounded-xl overflow-hidden shadow-2xl transition-all duration-500 relative bg-black font-mono",
      shake && "animate-shake", 
      isPaused ? "border-4 border-red-600 shadow-red-900/50" : "border border-gray-800 shadow-xl"
    )}>
      
      {/* GLOBAL RED TINT OVERLAY WHEN PAUSED */}
      {isPaused && (
         <div className="absolute inset-0 bg-red-900/10 pointer-events-none z-0 animate-pulse" />
      )}

      {/* HEADER */}
      <div className="bg-gray-900 p-3 flex justify-between items-center border-b border-gray-800 relative z-10">
         <div className="flex items-center gap-2">
            <Terminal className={cn("w-4 h-4", isPaused ? "text-red-500" : "text-green-500")} />
            <span className="text-xs font-bold text-gray-400 tracking-widest">GUARDIAN_NET_V1.0</span>
         </div>
         <div className="flex gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[9px] text-gray-500 uppercase">Status</span>
                {isPaused ? (
                   <span className="text-xs font-bold text-red-500 bg-red-900/20 px-2 py-0.5 rounded animate-pulse">LOCKDOWN</span>
                ) : (
                   <span className="text-xs font-bold text-green-500 bg-green-900/20 px-2 py-0.5 rounded">SECURE</span>
                )}
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 relative z-10">
          
          {/* LEFT: INCIDENT LOG */}
          <div className="p-4 border-r border-gray-800 bg-black/80 h-[300px] flex flex-col">
             <div className="flex items-center justify-between mb-3">
               <h3 className="text-xs font-bold text-gray-500 flex items-center gap-2">
                 <Activity className="w-3 h-3" /> NETWORK_TRAFFIC
               </h3>
               <span className="text-[10px] text-gray-600 animate-pulse">LIVE</span>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {logs.map((log) => (
                   <div key={log.id} className="text-[10px] md:text-xs flex gap-2 font-mono hover:bg-white/5 p-1 rounded transition-colors">
                      <span className="text-gray-600 shrink-0 select-none">[{log.timestamp}]</span>
                      <span className={cn(
                        log.type === 'critical' ? "text-red-500 font-bold" : 
                        log.type === 'warning' ? "text-yellow-500" :
                        log.type === 'success' ? "text-green-500" :
                        "text-gray-400"
                      )}>
                         {log.type === 'critical' && '>>> '}
                         {log.message}
                      </span>
                   </div>
                ))}
                <div ref={logsEndRef} />
             </div>
          </div>

          {/* RIGHT: COMMAND CENTER */}
          <div className="p-6 bg-gray-900/50 flex flex-col items-center justify-center relative overflow-hidden">
             
             {/* Security Score Large Display */}
             <div className="mb-8 text-center">
                 <div className="text-5xl font-black text-white/90 tracking-tighter">
                    {isPaused ? "0.00" : coverage.toFixed(2)}<span className="text-lg text-gray-600 ml-1">x</span>
                 </div>
                 <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-1">Collateral Ratio</p>
             </div>

             {/* UI: ARMING SWITCH */}
             <div className="w-full max-w-[200px] mb-4">
               <label className="flex items-center justify-between cursor-pointer group p-2 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors border border-gray-700">
                  <span className="text-xs font-bold text-gray-400 group-hover:text-gray-300">CONFIRM PROTOCOL</span>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={isArmed}
                      onChange={(e) => setIsArmed(e.target.checked)}
                      disabled={isPending}
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                  </div>
               </label>
             </div>

             {/* ACTION: BIG RED BUTTON */}
             <button
               onClick={executeSecurityProtocol}
               disabled={!isArmed || isPending}
               className={cn(
                 "w-full max-w-[220px] py-4 rounded-lg font-black text-sm tracking-widest flex items-center justify-center gap-3 transition-all transform shadow-lg relative overflow-hidden",
                 
                 // State: Armed & Available vs Locked
                 (!isArmed || isPending) 
                   ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                   : isPaused
                     ? "bg-green-600 hover:bg-green-500 text-white border-b-4 border-green-800 active:border-b-0 active:translate-y-1 shadow-green-900/50" 
                     : "bg-red-600 hover:bg-red-500 text-white border-b-4 border-red-800 active:border-b-0 active:translate-y-1 shadow-red-900/50 animate-pulse"
               )}
             >
                {isPending ? (
                   <span className="animate-pulse">PROCESSING...</span>
                ) : (
                   <>
                     {isPaused ? <Unlock className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                     {isPaused ? "RESTORE SYSTEM" : "ACTIVATE BREAKER"}
                   </>
                )}
             </button>

             {/* WARNING TEXT */}
             {isArmed && !isPaused && (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-red-500 animate-pulse font-bold bg-red-950/30 px-2 py-1 rounded">
                   <AlertOctagon className="w-3 h-3" />
                   WARNING: THIS WILL FREEZE ALL FUNDS
                </div>
             )}

          </div>

      </div>

      {/* BACKGROUND DECORATION */}
      <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-transparent via-gray-700 to-transparent opacity-20" />
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}
