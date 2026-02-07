import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { getDefaultConfig } from 'connectkit'

export const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [baseSepolia],
    transports: {
      // RPC URL for each chain
      [baseSepolia.id]: http('https://sepolia.base.org'),
    },

    // Required API Keys
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",

    // Required App Info
    appName: "CyberDAO",

    // Optional App Info
    appDescription: "Cyber Security DAO",
    appUrl: "https://cyberdao.demo", 
    appIcon: "https://family.co/logo.png", 
    ssr: true, // If using Next.js
  }),
)
