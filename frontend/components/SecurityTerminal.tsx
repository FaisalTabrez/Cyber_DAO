"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SecureTreasuryABI } from "../lib/abis/contracts";
import deployedAddresses from "../src/deployed-addresses.json";
import { Terminal, AlertTriangle, Activity, Lock, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function SecurityTerminal() {
  const { address } = useAccount();
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM_INIT] ... Security Protocols Loaded",
    "[SYSTEM_INIT] ... Connected to Base Sepolia Node",
    "[SYSTEM_INIT] ... Monitoring Treasury Assets"
  ]);

  const TREASURY_ADDRESS = deployedAddresses.SecureTreasury as `0x${string}`;

  // 1. Read Status
  const { data: isPausedData, refetch } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: SecureTreasuryABI,
    functionName: "paused",
  });
  const isPaused = isPausedData as boolean;

  const { data: guardianAddress } = useReadContract({
    address: TREASURY_ADDRESS,
    abi: SecureTreasuryABI,
    functionName: "guardian",
  });

  const isGuardian = address && guardianAddress && address.toLowerCase() === (guardianAddress as string).toLowerCase();

  // 2. Write Action
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      refetch();
      const timestamp = new Date().toLocaleTimeString();
      addLog(`[${timestamp}] GUARDIAN ${address?.slice(0, 6)}... INITIATED GLOBAL TREASURY FREEZE.`);
      addLog(`[${timestamp}] EXECUTION CONFIRMED. SYSTEM LOCKED.`);
    }
  }, [isConfirmed, refetch, address]);

  const handleCircuitBreaker = () => {
    writeContract({
      address: TREASURY_ADDRESS,
      abi: SecureTreasuryABI,
      functionName: "circuitBreaker",
    });
    addLog(`[${new Date().toLocaleTimeString()}] INITIATING EMERGENCY SEQUENCE...`);
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-4), message]); // Keep last 5 logs
  };

  return (
    <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-slate-950 text-green-500 font-mono relative mb-8">
      {/* Scanline Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-10"></div>
      
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest">CYBER_SEC_TERMINAL_V1.0</span>
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-900"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-900"></div>
          <div className="w-3 h-3 rounded-full bg-green-900"></div>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-6 relative z-20">
        
        {/* Status Line */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-gray-500 text-xs mb-1">CURRENT STATUS</div>
            <div className={cn(
              "text-2xl font-bold tracking-wider flex items-center gap-3",
              isPaused ? "text-red-500 animate-pulse" : "text-green-500"
            )}>
              {isPaused ? (
                <>
                  <ShieldAlert className="w-8 h-8" />
                  SYSTEM STATUS: EMERGENCY LOCKDOWN
                </>
              ) : (
                <>
                  <Activity className="w-8 h-8" />
                  SYSTEM STATUS: OPERATIONAL
                </>
              )}
            </div>
          </div>
          
          {/* Guardian Badge */}
          {address && (
            <div className={cn(
              "px-3 py-1 text-xs border rounded uppercase tracking-widest",
              isGuardian ? "border-green-800 text-green-400 bg-green-950/30" : "border-gray-800 text-gray-600"
            )}>
              {isGuardian ? "ACCESS GRANTED: GUARDIAN LEVEL" : "READ ONLY CLASS"}
            </div>
          )}
        </div>

        {/* Action Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Logs Panel */}
          <div className="col-span-2 bg-black/50 p-4 rounded border border-gray-800 font-sm h-32 overflow-hidden flex flex-col justify-end">
            {logs.map((log, i) => (
              <div key={i} className="mb-1 text-xs opacity-80 font-mono">
                <span className="text-green-700 mr-2">{">"}</span>
                {log}
              </div>
            ))}
            {isPending && (
              <div className="text-xs text-yellow-500 animate-pulse">
                <span className="mr-2">{">"}</span> AWAITING MEMPOOL CONFIRMATION...
              </div>
            )}
          </div>

          {/* Big Button */}
          <div className="col-span-1 flex items-center justify-center">
            {isPaused ? (
               <div className="text-center p-4 border border-red-900/50 bg-red-950/10 rounded w-full h-full flex flex-col items-center justify-center gap-2">
                 <Lock className="w-8 h-8 text-red-500" />
                 <span className="text-red-500 text-xs font-bold">SYSTEM FROZEN</span>
                 <p className="text-[10px] text-red-400/60">Unlock requires governance vote</p>
               </div>
            ) : isGuardian ? (
              <button
                onClick={handleCircuitBreaker}
                disabled={isPending || isConfirming}
                className="group relative w-full h-full min-h-[100px] flex flex-col items-center justify-center border-2 border-red-600 bg-red-950/20 hover:bg-red-600/20 transition-all rounded overflow-hidden"
              >
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ff000010_10px,#ff000010_20px)] group-hover:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#ff000020_10px,#ff000020_20px)]"></div>
                
                <AlertTriangle className="w-8 h-8 text-red-500 mb-2 relative z-10 group-hover:scale-110 transition-transform" />
                <span className="text-red-500 font-bold tracking-widest relative z-10 text-center text-sm px-2">
                  ACTIVATE EMERGENCY<br/>CIRCUIT BREAKER
                </span>
                
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-red-600"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-red-600"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-red-600"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-red-600"></div>
              </button>
            ) : (
                <div className="text-center text-gray-600 text-xs flex flex-col items-center gap-2">
                    <Lock className="w-6 h-6 opacity-30" />
                    <span>GUARDIAN ACCESS REQUIRED</span>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
