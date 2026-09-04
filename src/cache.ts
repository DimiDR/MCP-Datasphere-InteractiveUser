type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type CacheLayerStats = {
  enabled: boolean;
  ttl_ms: number;
  size: number;
  hits: number;
  misses: number;
  keys: string[];
};

export type CacheStats = {
  metadata: CacheLayerStats;
  query: CacheLayerStats;
};

export class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();
  private hits = 0;
  private misses = 0;

  constructor(
    private enabled: boolean,
    private ttlMs: number,
  ) {}

  isEnabled(): boolean {
    return this.enabled;
  }

  getTtlMs(): number {
    return this.ttlMs;
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<{ value: T; cache_hit: boolean }> {
    if (!this.enabled) {
      this.misses++;
      return { value: await fetcher(), cache_hit: false };
    }

    const existing = this.store.get(key);
    if (existing && Date.now() < existing.expiresAt) {
      this.hits++;
      return { value: existing.value as T, cache_hit: true };
    }
    if (existing) {
      this.store.delete(key);
    }

    let pending = this.inflight.get(key) as Promise<T> | undefined;
    if (!pending) {
      this.misses++;
      pending = fetcher()
        .then((value) => {
          this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
          this.inflight.delete(key);
          return value;
        })
        .catch((err) => {
          this.inflight.delete(key);
          throw err;
        });
      this.inflight.set(key, pending);
    }

    const value = await pending;
    return { value, cache_hit: false };
  }

  clear(): void {
    this.store.clear();
    this.inflight.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheLayerStats {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
      }
    }
    return {
      enabled: this.enabled,
      ttl_ms: this.ttlMs,
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      keys: [...this.store.keys()],
    };
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  return !["0", "false", "no", "off"].includes(raw.trim().toLowerCase());
}

/** Metadata, service documents, catalog lists — longer TTL. */
export const metadataCache = new TtlCache(
  parseBool(process.env.DSP_CACHE_ENABLED, true),
  parsePositiveInt(process.env.DSP_CACHE_TTL_MS, 15 * 60 * 1000),
);

/** OData query responses — shorter TTL (identical queries only). */
export const queryCache = new TtlCache(
  parseBool(process.env.DSP_QUERY_CACHE_ENABLED, true),
  parsePositiveInt(process.env.DSP_QUERY_CACHE_TTL_MS, 2 * 60 * 1000),
);

/** @deprecated use metadataCache */
export const cache = metadataCache;

export function clearCache(): void {
  metadataCache.clear();
  queryCache.clear();
}

export function getCacheStats(): CacheStats {
  return {
    metadata: metadataCache.stats(),
    query: queryCache.stats(),
  };
}

export function cacheKey(parts: string[]): string {
  return parts.join(":");
}
