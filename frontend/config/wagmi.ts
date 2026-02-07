import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'

export const config = createConfig({
  chains: [baseSepolia],
  ssr: true,
  transports: {
    [baseSepolia.id]: http('https://base-sepolia.g.alchemy.com/v2/6dhY0fZYfXpShToKfroFn'),
  },
})
