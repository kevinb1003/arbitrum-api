import dotenv from 'dotenv'

dotenv.config()

export const PORT = process.env.PORT || 3000
export const L1_RPC_URL = process.env.L1_RPC_URL || ''
export const L2_RPC_URL = process.env.L2_RPC_URL || ''
export const NETWORK_MODE = process.env.NETWORK_MODE || 'sepolia'
export const BRIDGE_GETTER_CACHE_TTL_MS = Number(
  process.env.BRIDGE_GETTER_CACHE_TTL_MS ?? 5 * 60 * 1000 // Default 5 minutes
)
export const BRIDGE_TX_CACHE_TTL_MS = Number(
  process.env.BRIDGE_TX_CACHE_TTL_MS ?? 15_000 // Default 15 seconds
)
export const APPROVAL_CACHE_TTL_MS = Number(
  process.env.APPROVAL_CACHE_TTL_MS ?? 5 * 60 * 1000 // Default 5 minutes
)
export const MEMCACHED_URL = process.env.MEMCACHED_URL
export const RATE_LIMIT_WINDOW_MS = Number(
  process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000 // Default 15 minutes
)
export const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 100) // Default 100 requests per window
export const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
