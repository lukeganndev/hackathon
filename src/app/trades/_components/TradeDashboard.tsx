"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RequestError, tradeApi, useTradeUpdates } from "./client";
import { displayDate, type FoundLoop, type TradeSummary } from "./types";
import { StatusBadge } from "./StatusBadge";
import styles from "../trades.module.css";

export function TradeDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<TradeSummary | null>(null);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [filter, setFilter] = useState("active");
  const [loops, setLoops] = useState<FoundLoop[] | null>(null);
  const [moreAvailable, setMoreAvailable] = useState(false);
  const [finding, setFinding] = useState(false);
  const [proposing, setProposing] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      setSummary(await tradeApi<TradeSummary>(""));
      setError("");
      setSignedOut(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't load your trades.");
      setSignedOut(error instanceof RequestError && error.status === 401);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useTradeUpdates(undefined, load);

  async function find() {
    setFinding(true); setError(""); setLoops(null);
    try {
      const found = await tradeApi<{ loops: FoundLoop[]; moreAvailable?: boolean }>("/find", undefined, "POST");
      setLoops(found.loops); setMoreAvailable(Boolean(found.moreAvailable));
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn't find loops."); }
    finally { setFinding(false); }
  }
  async function propose(loop: FoundLoop, index: number) {
    setProposing(index); setError("");
    try {
      const result = await tradeApi<{ trade: { id: string } }>("", { legs: loop.legs }, "POST");
      router.push(`/trades/${result.trade.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't propose this loop.");
      setProposing(null);
    }
  }
  const trades = summary?.trades ?? [];
  const active = trades.filter((trade) => trade.status !== "done" && trade.status !== "cancelled");
  const completed = trades.filter((trade) => trade.status === "done");
  const shown = trades.filter((trade) => filter === "all" || (filter === "active" ? !["done", "cancelled"].includes(trade.status) : ["done", "cancelled"].includes(trade.status)));

  return (
    <main>
      <section className={styles.hero} aria-labelledby="trades-heading">
        <div><p className={styles.eyebrow}>MAKE WHAT YOU HAVE GO FURTHER</p><h1 id="trades-heading">Good things come<br />full circle<span className={styles.brandDot}>.</span></h1><p className={styles.heroText}>Your textbook could be someone’s next pair of shoes.<br className={styles.desktopBreak} /> Find the people who complete your loop.</p>
          <button className={styles.primary} onClick={find} disabled={finding || proposing !== null || signedOut}>{finding ? "Finding your loops…" : "Find a loop"}<span aria-hidden="true">↗</span></button>
        </div>
        <div className={styles.heroArt} aria-hidden="true"><div className={styles.orbit}><span>HAVE</span><strong>Something<br />for everyone.</strong><span>WANT</span></div><span className={styles.orbitTag}>A better kind of exchange</span></div>
      </section>

      {error && <div className={styles.error} role="alert">{error} {signedOut ? <Link href="/login">Sign in again</Link> : <button className={styles.textButton} onClick={load}>Refresh trades</button>}</div>}

      {(finding || loops !== null) && <section className={styles.section} aria-labelledby="matches-heading" aria-busy={finding}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>POSSIBILITIES, FOUND</p><h2 id="matches-heading">{finding ? "Connecting the dots…" : loops?.length ? `${loops.length} ${loops.length === 1 ? "loop" : "loops"} for you` : "Your next loop is on its way"}</h2></div>{loops?.length ? <span className={styles.muted}>Everyone gives. Everyone gets.</span> : null}</div>
        {finding ? <div className={styles.loading} role="status">Checking available listings and what students want…</div> : !loops?.length ? <div className={styles.empty}><h3>A few more connections can make a loop.</h3><p>Add something you have and mark a listing you want, or tell Loop what you’re looking for.</p><Link href="/chat" className={styles.secondary}>Tell Loop what you want <span aria-hidden="true">→</span></Link></div> : <div className={styles.matchGrid}>{loops.map((loop, index) => (
          <article className={styles.matchCard} key={loop.legs.map((leg) => `${leg.from}:${leg.listingId}`).join("|")}>
            <div className={styles.cardTop}><span className={styles.matchNumber}>LOOP {String(index + 1).padStart(2, "0")}</span><span className={styles.badge}>{loop.legs.length} people · pure swap</span></div>
            <ol className={styles.matchLegs}>{loop.legs.map((leg) => <li key={leg.listingId}><span className={styles.smallAvatar} aria-hidden="true">{leg.giverName.slice(0, 1).toUpperCase()}</span><div><p><strong>{leg.from === summary?.userId ? "You" : leg.giverName}</strong><span className={styles.muted}> → </span>{leg.to === summary?.userId ? "you" : leg.receiverName}</p><Link href={`/listings/${leg.listingId}`}>{leg.title}</Link></div></li>)}</ol>
            <button className={styles.primary} disabled={proposing !== null} onClick={() => propose(loop, index)}>{proposing === index ? "Creating proposal…" : "Propose this loop"}<span aria-hidden="true">→</span></button>
          </article>
        ))}</div>}
        {moreAvailable && <p className={styles.muted}>Showing the first 50 matches, with shorter loops first.</p>}
      </section>}

      <section className={styles.section} aria-labelledby="activity-heading">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>YOUR EXCHANGES</p><h2 id="activity-heading">Keep things moving.</h2></div><div className={styles.stats}><span><strong>{active.length}</strong> in progress</span><span><strong>{completed.length}</strong> closed</span></div></div>
        <div className={styles.tabs} aria-label="Filter trades">{[["active", "In progress"], ["closed", "Past trades"], ["all", "All trades"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
        {!summary && !error ? <div className={styles.loading} role="status">Loading your trades…</div> : !shown.length ? <div className={styles.empty}><span className={styles.emptySymbol} aria-hidden="true">↻</span><h3>{filter === "active" ? "Your first loop starts here." : "No trades here yet."}</h3><p>{filter === "active" ? "Find a match above. Once you propose a loop, you can follow every step here." : "Completed and cancelled trades will stay here for you."}</p></div> : <div className={styles.tradeList}>{shown.map((trade) => <Link key={trade.id} href={`/trades/${trade.id}`} className={styles.tradeRow}><span className={styles.tradeSymbol} aria-hidden="true">↻</span><div className={styles.tradeRowTitle}><h3>{trade.status === "done" ? "A loop, complete." : trade.status === "cancelled" ? "Cancelled trade" : "Your campus trade"}</h3><p>{trade.meetup_spot ? `${trade.meetup_spot} · ${displayDate(trade.meetup_at)}` : `Proposed ${displayDate(trade.created_at)}`}</p></div><StatusBadge status={trade.status} /><span className={styles.rowArrow} aria-hidden="true">↗</span></Link>)}</div>}
      </section>
      <aside className={styles.tip}><strong>How a loop works</strong><span>Find your people.</span><span aria-hidden="true">→</span><span>Everyone accepts.</span><span aria-hidden="true">→</span><span>Meet up. Exchange. Close the loop.</span></aside>
    </main>
  );
}
