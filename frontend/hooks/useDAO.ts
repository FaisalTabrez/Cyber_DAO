"use client";

import { useAccount, useReadContracts, useBalance } from "wagmi";
import { formatEther } from "viem";
import { SecureTreasuryABI, GovernanceTokenABI } from "../lib/abis/contracts";
import { useEffect, useState } from "react";

export function useDAO() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Environment Variables for Vercel
  const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_SECURE_TREASURY_ADDRESS as `0x${string}`;
  const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS as `0x${string}`;

  const shouldFetch = mounted && !!TREASURY_ADDRESS && !!TOKEN_ADDRESS;

  // 1. Batch Fetch Contract State (Auto-Refetch every 5s)
  const { data: contractData, isLoading: isLoadingContracts } = useReadContracts({
    contracts: [
      // 0: Paused Status
      {
        address: TREASURY_ADDRESS,
        abi: SecureTreasuryABI,
        functionName: "paused",
      },
      // 1: User Token Balance (Stakeholder check)
      {
        address: TOKEN_ADDRESS,
        abi: GovernanceTokenABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
      // 2: Guardian Address (Role Check)
      {
        address: TREASURY_ADDRESS,
        abi: SecureTreasuryABI,
        functionName: "guardian",
      },
      // 3: Daily Limit
      {
        address: TREASURY_ADDRESS,
        abi: SecureTreasuryABI,
        functionName: "dailyLimit",
      },
      // 4: Daily Withdrawn
      {
         address: TREASURY_ADDRESS,
         abi: SecureTreasuryABI,
         functionName: "dailyWithdrawn",
      }
    ],
    query: {
      refetchInterval: 5000,
      enabled: shouldFetch, 
      staleTime: 5000,
    }
  });

  // 2. Fetch Native ETH Balance of Treasury
  const { data: treasuryBalanceData } = useBalance({
    address: TREASURY_ADDRESS,
    query: {
      refetchInterval: 10000,
      enabled: shouldFetch,
    }
  });

  // Safe Destructuring
  const paused = contractData?.[0]?.result as boolean ?? false;
  const userBalance = contractData?.[1]?.result as bigint ?? 0n;
  const guardian = contractData?.[2]?.result as string;
  const dailyLimit = contractData?.[3]?.result as bigint ?? 0n;
  const dailyWithdrawn = contractData?.[4]?.result as bigint ?? 0n;

  // Role Logic
  const isGuardian = address && guardian ? address.toLowerCase() === guardian.toLowerCase() : false;
  const isStakeholder = userBalance > 0n;

  return {
    // Formatting for UI
    treasuryBalance: treasuryBalanceData ? formatEther(treasuryBalanceData.value) : "0.0",
    userBalance: formatEther(userBalance),
    dailyLimit: formatEther(dailyLimit),
    dailyWithdrawn: formatEther(dailyWithdrawn),
    
    // Status Flags
    paused,
    isGuardian,
    isStakeholder,
    isConnected: mounted && isConnected,
    isLoading: isLoadingContracts && mounted,
    
    // Addresses
    treasuryAddress: TREASURY_ADDRESS,
    tokenAddress: TOKEN_ADDRESS
  };
}
