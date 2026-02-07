import { formatEther } from "viem";

export const RISK_THRESHOLDS = {
  HIGH_VALUE_ETH: 0.005, // Updated for demo
  TREASURY_PERCENTAGE: 0.1 // >10% is also risky
};

export function analyzeProposalRisk(valueWei: bigint, treasuryBalanceWei: bigint) {
  const valueEth = parseFloat(formatEther(valueWei));
  const treasuryEth = parseFloat(formatEther(treasuryBalanceWei));

  const isHighValue = valueEth > RISK_THRESHOLDS.HIGH_VALUE_ETH;
  const isHighPercentage = treasuryEth > 0 && (valueEth / treasuryEth) > RISK_THRESHOLDS.TREASURY_PERCENTAGE;

  return {
    isHighRisk: isHighValue || isHighPercentage,
    riskFactors: {
      isHighValue,
      isHighPercentage,
      valueEth,
      threshold: RISK_THRESHOLDS.HIGH_VALUE_ETH
    }
  };
}
