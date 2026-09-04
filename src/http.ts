import { Agent, setGlobalDispatcher } from "undici";

/** Reuse TLS connections to the Datasphere tenant (saves ~100–300 ms on repeat calls). */
setGlobalDispatcher(
  new Agent({
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 60_000,
    connections: 16,
  }),
);

export async function dspFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, init);
}
