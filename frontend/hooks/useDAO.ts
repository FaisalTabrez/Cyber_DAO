import { useAccount, useReadContracts, useBalance } from "wagmi";
import { formatEther } from "viem";
import uploadedAddresses from "../src/deployed-addresses.json"; // Use standard import for addresses
import { SecureTreasuryABI, GovernanceTokenABI } from "../lib/abis/contracts";

export function useDAO() {
  const { address, isConnected } = useAccount();

  const TREASURY_ADDRESS = uploadedAddresses.SecureTreasury as `0x${string}`;
  const TOKEN_ADDRESS = uploadedAddresses.GovernanceToken as `0x${string}`;

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
    }
  });

  // 2. Fetch ETH Balance of Treasury
  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
    address: TREASURY_ADDRESS,
    query: {
      refetchInterval: 5000,
    }
  });

  // 3. Parse Data safely
  const isSystemPaused = contractData?.[0]?.result as boolean ?? false;
  const userBalance = contractData?.[1]?.result as bigint ?? BigInt(0);
  const guardianAddress = contractData?.[2]?.result as string;
  const dailyLimitVal = contractData?.[3]?.result as bigint ?? BigInt(0);
  const dailyWithdrawnVal = contractData?.[4]?.result as bigint ?? BigInt(0);

  // Derived State
  const isGuardian = 
    isConnected && 
    !!address && 
    !!guardianAddress && 
    address.toLowerCase() === guardianAddress.toLowerCase();

  const isStakeholder = isConnected && userBalance > BigInt(0);

  const treasuryBalanceStr = balanceData ? formatEther(balanceData.value) : "0";
  const dailyLimitStr = formatEther(dailyLimitVal);
  const dailyWithdrawnStr = formatEther(dailyWithdrawnVal);
  
  // Return unified object
  return {
    // User Identity
    address,
    isConnected,
    isGuardian,
    isStakeholder,
    
    // DAO State
    isSystemPaused,
    treasuryBalance: treasuryBalanceStr,
    dailyLimit: dailyLimitStr,
    spentToday: dailyWithdrawnStr,
    
    // Raw Values if needed
    rawUserBalance: userBalance,
    
    // Loading State
    isLoading: isLoadingContracts || isLoadingBalance
  };
}
