"use client";

import { useAccount, useReadContracts, useBalance } from "wagmi";
import { formatUnits, keccak256, toBytes, getAddress, isAddressEqual } from "viem";
import { CONTRACTS, ABIS } from "../src/constants/contracts"; // Single source of truth
import { useEffect, useState } from "react";

export function useDAO() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use Centralized Constants
  const TREASURY_ADDRESS = CONTRACTS.SECURE_TREASURY;
  const TOKEN_ADDRESS = CONTRACTS.GOVERNANCE_TOKEN;
  
  // Role Definition: keccak256("SECURITY_GUARDIAN_ROLE")
  // Verified Hash: 0x86c1afc0029e36adf493969d41f5975e93a4d76844e475dc266d5ad4f5f3f580
  const GUARDIAN_ROLE = keccak256(toBytes("SECURITY_GUARDIAN_ROLE"));

  const shouldFetch = mounted && !!TREASURY_ADDRESS && !!TOKEN_ADDRESS;

  // 1. Batch Fetch Contract State (Auto-Refetch every 5s)
  const { data: contractData, isLoading: isLoadingContracts } = useReadContracts({
    contracts: [
      // 0: Paused Status
      {
        address: TREASURY_ADDRESS,
        abi: ABIS.SecureTreasury,
        functionName: "paused",
      },
      // 1: User Token Balance (Stakeholder check)
      {
        address: TOKEN_ADDRESS,
        abi: ABIS.GovernanceToken,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
      // 2: Guardian Role Check (Replaces old 'guardian' view)
      {
        address: TOKEN_ADDRESS,
        abi: ABIS.GovernanceToken,
        functionName: "guardian",
      },
      // 3: Daily Limit
      {
        address: TREASURY_ADDRESS,
        abi: ABIS.SecureTreasury,
        functionName: "dailyLimit",
      },
      // 4: Daily Withdrawn
      {
         address: TREASURY_ADDRESS,
         abi: ABIS.SecureTreasury,
         functionName: "dailyWithdrawn",
      },
      // 5: Treasury Token Balance
      {
        address: TOKEN_ADDRESS,
        abi: ABIS.GovernanceToken,
        functionName: "balanceOf",
        args: [TREASURY_ADDRESS],
      }
    ],
    query: {
      refetchInterval: 5000,
      enabled: shouldFetch, 
      staleTime: 5000,
    }
  });

  // 2. Fetch Native ETH Balance of Treasury (Still useful for gas/stats)
  const { data: treasuryEthBalanceData } = useBalance({
    address: TREASURY_ADDRESS,
    query: {
      refetchInterval: 10000,
      enabled: shouldFetch,
    }
  });

  // Safe Destructuring
  const paused = contractData?.[0]?.result as boolean ?? false;
  const userBalance = contractData?.[1]?.result as bigint ?? 0n;
  const guardianAddress = contractData?.[2]?.result as string; 
  const dailyLimit = contractData?.[3]?.result as bigint ?? 0n;
  const dailyWithdrawn = contractData?.[4]?.result as bigint ?? 0n;
  const treasuryTokenBalance = contractData?.[5]?.result as bigint ?? 0n;

  // Role Logic
  const isGuardian = address && guardianAddress 
    ? isAddressEqual(guardianAddress as `0x${string}`, address)
    : false;
  const isStakeholder = userBalance > 0n;
  
  // Derived Status
  let userStatus: "Guardian" | "Stakeholder" | "Guest" = "Guest";
  if (isGuardian) userStatus = "Guardian";
  else if (isStakeholder) userStatus = "Stakeholder";

  return {
    // Formatting for UI using formatUnits(val, 18) as requested
    treasuryBalance: formatUnits(treasuryTokenBalance, 18), // Now returning GT Balance!
    treasuryEthBalance: treasuryEthBalanceData ? formatUnits(treasuryEthBalanceData.value, 18) : "0.0",
    userBalance: formatUnits(userBalance, 18),
    dailyLimit: formatUnits(dailyLimit, 18), // Assuming limit is set in same decimals/units
    dailyWithdrawn: formatUnits(dailyWithdrawn, 18),
    userStatus,
    isGuardian,
    isStakeholder,
    paused,
    isLoading: isLoadingContracts,
    isConnected
  };
}
