export type CacheKey = string | (string | number | boolean)[]
export type CacheEntry = { value: unknown; expiresAt: number }
