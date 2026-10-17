"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function tradeApi<T>(path: string, body?: unknown, method = "GET", signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/trades${path}`, {
    method, signal, cache: "no-store", credentials: "same-origin",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  let value;
  try { value = await response.json(); }
  catch { throw new RequestError("Couldn't reach Loop. Please try again.", response.status); }
  if (!response.ok) throw new RequestError(value.error ?? "Couldn't update this trade.", response.status);
  return value as T;
}

export function useTradeUpdates(id: string | undefined, refresh: () => void) {
  useEffect(() => {
    const supabase = supabaseBrowser();
    let debounce: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(debounce);
      debounce = setTimeout(refresh, 150);
    };
    const channel = supabase.channel(`trade-screen-${id ?? "list"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trades", ...(id ? { filter: `id=eq.${id}` } : {}) }, update)
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_legs", ...(id ? { filter: `trade_id=eq.${id}` } : {}) }, update)
      .subscribe();
    // Reconcile after missed events, reconnects, and tab switches.
    const reconcile = () => { if (document.visibilityState === "visible") refresh(); };
    const interval = setInterval(reconcile, 15_000);
    window.addEventListener("focus", reconcile);
    return () => {
      clearTimeout(debounce);
      clearInterval(interval);
      window.removeEventListener("focus", reconcile);
      void supabase.removeChannel(channel);
    };
  }, [id, refresh]);
}
