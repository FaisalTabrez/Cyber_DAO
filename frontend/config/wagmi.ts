import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [baseSepolia],
    transports: {
      // RPC URL for each chain
      [baseSepolia.id]: http(
        process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org",
      ),
    },

    // Required API Keys
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

    // Required App Info
    appName: "CyberDAO Treasury",
    appDescription: "Transparent DAO Treasury with Security Controls",
    appUrl: "https://cyberdao.example.com", 
    appIcon: "https://cyberdao.example.com/icon.png", 
  }),
);
