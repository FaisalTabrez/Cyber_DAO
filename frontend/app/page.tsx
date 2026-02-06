"use client";

import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">CyberDAO Treasury</h1>
        <ConnectKitButton />
      </header>

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <section className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">Treasury Status</h2>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-white dark:bg-gray-700 rounded shadow">
                <p className="text-sm text-gray-500">Total Assets</p>
                <p className="text-2xl font-bold">1,250 ETH</p>
             </div>
             <div className="p-4 bg-white dark:bg-gray-700 rounded shadow">
                <p className="text-sm text-gray-500">Daily Limit</p>
                <p className="text-2xl font-bold">1.0 ETH</p>
             </div>
          </div>
        </section>

        <section className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg w-full max-w-2xl border border-red-200">
          <h2 className="text-xl font-semibold mb-4 text-red-700 dark:text-red-400">
            Security Controls (Guardian)
          </h2>
          <p className="mb-4 text-sm">
            Circuit Breaker status: <span className="font-bold text-green-600">Active (Safe)</span>
          </p>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50" disabled={!isConnected}>
              Emergency Pause
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50" disabled={!isConnected}>
              Update Limits
            </button>
          </div>
          {!isConnected && <p className="mt-2 text-xs text-red-500">Connect wallet to access controls</p>}
        </section>
      </main>
    </div>
  );
}
