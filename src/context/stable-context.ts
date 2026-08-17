import { createContext, type Context } from "react";

/**
 * A context whose identity survives Vite Fast Refresh.
 *
 * When a module that both defines a context and exports components is hot
 * replaced, `createContext` runs again and the new hook looks up a context the
 * already-mounted provider never wrote to — the "must be used within
 * <X>Provider" blank screen. Keying the instance off `globalThis` keeps one
 * identity per name for the life of the tab.
 */
const registry: Record<string, Context<unknown>> = ((
  globalThis as unknown as { __derpsContexts?: Record<string, Context<unknown>> }
).__derpsContexts ??= {});

export function stableContext<T>(name: string): Context<T | null> {
  if (!registry[name]) registry[name] = createContext<unknown>(null) as Context<unknown>;
  return registry[name] as unknown as Context<T | null>;
}
