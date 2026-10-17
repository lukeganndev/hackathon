"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RequestError, tradeApi, useTradeUpdates } from "./client";
import { TradeDetailView, type TradeAction } from "./TradeDetailView";
import type { TradeDetail } from "./types";
import styles from "../trades.module.css";

export function TradeDetailScreen({ id }: { id: string }) {
  const [detail, setDetail] = useState<TradeDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const load = useCallback(async () => {
    try {
      setDetail(await tradeApi<TradeDetail>(`/${id}`));
      setUnavailable(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't load this trade.");
      if (error instanceof RequestError && [401, 403, 404].includes(error.status)) {
        setDetail(null); setUnavailable(true);
      }
    }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useTradeUpdates(id, load);
  const act: TradeAction = async (action, body, legId) => {
    setBusy(legId ?? action); setError("");
    try {
      const path = action === "confirm" ? `/${id}/legs/${legId}/confirm` : `/${id}/${action}`;
      await tradeApi(path, body, "POST");
      await load();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't update this trade.");
      return false;
    } finally { setBusy(null); }
  };
  if (!detail) return <main className={styles.empty} aria-busy={!error}>{error ? <><h1>{unavailable ? "This trade isn’t available." : "We couldn’t load this trade."}</h1><p role="alert">{error}</p><div className={styles.actions}><button onClick={load} className={styles.secondary}>Try again</button><Link href="/trades" className={styles.primary}>Back to my trades</Link></div></> : <p role="status">Getting your loop ready…</p>}</main>;
  return <TradeDetailView detail={detail} onAction={act} busy={busy} error={error} />;
}
