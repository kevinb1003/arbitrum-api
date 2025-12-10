import memjs from 'memjs'
import { MEMCACHED_URL } from '../constants'
import type { CacheKey, CacheEntry } from '../types/cache'

const mc = MEMCACHED_URL ? memjs.Client.create(MEMCACHED_URL) : null
const memoryCache = new Map<string, CacheEntry>()

const toKey = (key: CacheKey): string =>
  Array.isArray(key) ? key.map(String).join(':') : key

const readMemcached = async <T>(key: string): Promise<T | undefined> => {
  if (!mc) return undefined
  try {
    const hit = await mc.get(key)
    return hit ? (JSON.parse(hit.toString()) as T) : undefined
  } catch {
    return undefined
  }
}

const writeMemcached = async <T>(key: string, value: T, ttlMs: number) => {
  if (!mc) return
  try {
    await mc.set(key, Buffer.from(JSON.stringify(value)), {
      expires: Math.ceil(ttlMs / 1000),
    })
  } catch {
    // ignore set failures
  }
}

export const cache = async <T>(
  key: CacheKey,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> => {
  // Prefer memcached when configured
  // fallback to in-process map
  const cacheKey = toKey(key)
  const now = Date.now()

  const memcachedValue = await readMemcached<T>(cacheKey)
  if (memcachedValue !== undefined) return memcachedValue

  const local = memoryCache.get(cacheKey)
  if (local && local.expiresAt > now) return local.value as T

  const value = await loader()

  memoryCache.set(cacheKey, { value, expiresAt: now + ttlMs })
  void writeMemcached(cacheKey, value, ttlMs)
  return value
}
