import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Helper to sanitize private key
const getPrivateKey = () => {
  let key = process.env.PRIVATE_KEY;
  if (!key) return [];
  
  // Remove whitespace, quotes, and common copy-paste artifacts
  key = key.trim().replace(/^["']|["']$/g, '');
  
  // If it's too long, maybe it has a label attached or is a different format?
  // Let's try to find the 66-char 0x... hex string inside it if possible
  if (key.length > 66 && key.includes("0x")) {
    const match = key.match(/0x[a-fA-F0-9]{64}/);
    if (match) {
        console.log(`⚠️  Auto-corrected PRIVATE_KEY from length ${key.length} to 66.`);
        return [match[0]];
    }
  }

  return [key];
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://base-sepolia-rpc.publicnode.com",
      accounts: getPrivateKey(),
      chainId: 84532,
      timeout: 120000, // 2 minutes
    },
    hardhat: {
    },
  },
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "empty",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  }
};

export default config;
