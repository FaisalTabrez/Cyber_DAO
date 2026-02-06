"use client";

import { Banknote, Activity } from "lucide-react";
import { useDAO } from "../hooks/useDAO";

export default function TreasuryOverview() {
  const { treasuryBalance, dailyLimit, spentToday } = useDAO();

  // Progress Calculations
  const limit = parseFloat(dailyLimit);
  const spent = parseFloat(spentToday);
  const spentPercent = limit > 0 ? (spent / limit) * 100 : 0;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
       <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-700">Treasury Overview</h3>
       </div>
       <div className="p-6 space-y-6">
          
          {/* Total Assets */}
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">Total Assets</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">{parseFloat(treasuryBalance).toFixed(2)}</span>
              <span className="text-sm font-bold text-gray-400">ETH</span>
            </div>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
               <Activity className="w-3 h-3" />
               +2.4% from last epoch
            </p>
          </div>

          {/* Daily Limit Progress */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Daily Spending Limit</span>
                <span className="text-xs font-bold text-gray-900">{spent.toFixed(2)} / {limit.toFixed(2)} ETH</span>
             </div>
             <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                   className={`h-full rounded-full transition-all duration-500 ${
                       spentPercent > 80 ? 'bg-red-500' : 'bg-blue-500'
                   }`} 
                   style={{ width: `${Math.min(spentPercent, 100)}%` }} 
                />
             </div>
             <div className="mt-2 text-[10px] text-gray-400 text-right">
                {spentPercent > 100 ? "Limit Exceeded" : `${(100 - spentPercent).toFixed(1)}% remaining`}
             </div>
          </div>
          
       </div>
    </div>
  );
}
