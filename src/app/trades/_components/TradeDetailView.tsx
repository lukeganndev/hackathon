"use client";

import Link from "next/link";
import { useState } from "react";
import { displayDate, localDateInput, orderLegs, type TradeDetail, type Leg } from "./types";
import { StatusBadge } from "./StatusBadge";
import styles from "../trades.module.css";

export type TradeAction = (action: "accept" | "meetup" | "confirm" | "cancel", body?: unknown, legId?: string) => Promise<boolean>;

function ConfirmForm({ leg, title, receiver, onAction, busy }: { leg: Leg; title: string; receiver: string; onAction: TradeAction; busy: string | null }) {
  const [code, setCode] = useState("");
  return <form className={styles.confirmForm} onSubmit={async (event) => {
    event.preventDefault();
    if (await onAction("confirm", { code }, leg.id)) setCode("");
  }}><h3>You’re giving {receiver}</h3><p>{title}</p><label htmlFor={`code-${leg.id}`}>Enter the code {receiver} shows you</label><div className={styles.codeEntry}><input id={`code-${leg.id}`} inputMode="numeric" autoComplete="off" pattern="[0-9]{4}" maxLength={4} required placeholder="0000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} disabled={busy !== null} /><button className={styles.primary} disabled={busy !== null || code.length !== 4}>{busy === leg.id ? "Confirming…" : "Confirm handoff"}</button></div><small>Confirm after handing over the listing. Five incorrect attempts pause entry for 15 minutes.</small></form>;
}

export function TradeDetailView({ detail, onAction, busy, error }: { detail: TradeDetail; onAction: TradeAction; busy: string | null; error: string }) {
  const { trade, userId } = detail;
  const legs = orderLegs(detail.legs, userId);
  const name = (id: string) => detail.profiles.find((profile) => profile.id === id)?.display_name ?? "Student";
  const title = (id: string) => detail.listings.find((listing) => listing.id === id)?.title ?? "Listing";
  const received = legs.filter((leg) => leg.receiver_id === userId);
  const given = legs.filter((leg) => leg.giver_id === userId);
  const accepted = legs.filter((leg) => leg.accepted_at).length;
  const confirmed = legs.filter((leg) => leg.confirmed_at).length;
  const canAccept = received.some((leg) => !leg.accepted_at);
  const canCancel = !["done", "cancelled"].includes(trade.status) && confirmed === 0;
  const cash = legs.some((leg) => leg.cash_cents > 0);
  const spots = [...new Set(detail.schools.flatMap((school) => school.meetup_spots.map((spot) => spot.name)))];
  const [spot, setSpot] = useState("");
  const [at, setAt] = useState(() => localDateInput(new Date(Date.now() + 60 * 60_000)));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const step = trade.status === "proposed" ? 0 : trade.status === "accepted" ? 1 : trade.status === "meetup_set" ? 2 : 3;

  return <main>
    <Link href="/trades" className={styles.back}>← My trades</Link>
    <div className={styles.detailHeading}><div><p className={styles.eyebrow}>{legs.length === 1 ? "YOUR CAMPUS EXCHANGE" : `${legs.length} PEOPLE. ONE GOOD LOOP.`}</p><h1>{trade.status === "done" ? "Full circle. Feels good." : trade.status === "cancelled" ? "Another loop will come." : "Let’s close this loop."}</h1></div><StatusBadge status={trade.status} /></div>
    {error && <div className={styles.error} role="alert">{error}</div>}
    {trade.status !== "cancelled" && <ol className={styles.progress} aria-label="Trade progress">{["Everyone accepts", "Set a meetup", "Exchange & confirm", "Loop closed"].map((label, index) => <li key={label} className={index <= step ? styles.currentStep : ""} aria-current={index === step ? "step" : undefined}><span aria-hidden="true">{index < step ? "✓" : index + 1}</span>{label}</li>)}</ol>}

    <div className={styles.detailGrid}>
      <section className={styles.panel} aria-labelledby="loop-heading"><div className={styles.panelHeading}><h2 id="loop-heading">The exchange</h2><span className={styles.muted}>{cash ? "Cash sale" : "No cash needed"}</span></div>
        <ol className={styles.handoffList}>{legs.map((leg, index) => <li key={leg.id}>
          <span className={styles.handoffNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div className={styles.handoffContent}><p><strong>{leg.giver_id === userId ? "You" : name(leg.giver_id)}</strong><span className={styles.muted}> give to </span><strong>{leg.receiver_id === userId ? "you" : name(leg.receiver_id)}</strong></p><Link href={`/listings/${leg.listing_id}`}>{title(leg.listing_id)}</Link><span className={leg.confirmed_at ? styles.confirmedLabel : styles.muted}>{leg.confirmed_at ? "✓ Handoff confirmed" : leg.accepted_at ? "Receiver accepted" : "Waiting for receiver"}</span></div>
          <span className={styles.handoffArrow} aria-hidden="true">↗</span>
        </li>)}</ol>
        <div className={styles.exchangeNote}>{trade.status === "done" ? "Everyone got what they came for." : "Every person gives something and receives something. Your items stay reserved while this trade is in progress."}</div>
      </section>

      <aside className={styles.panel} aria-labelledby="next-heading">
        <p className={styles.eyebrow}>WHAT HAPPENS NEXT</p>
        {trade.status === "proposed" && <><h2 id="next-heading">Get everyone on board.</h2><p className={styles.panelDescription}>{accepted} of {legs.length} receivers have accepted.</p><ul className={styles.peopleList}>{legs.map((leg) => <li key={leg.id}><span className={styles.smallAvatar} aria-hidden="true">{name(leg.receiver_id).slice(0, 1).toUpperCase()}</span><span>{leg.receiver_id === userId ? "You" : name(leg.receiver_id)}</span><span className={leg.accepted_at ? styles.confirmedLabel : styles.muted}>{leg.accepted_at ? "Accepted ✓" : "Pending"}</span></li>)}</ul>{canAccept ? <button className={styles.primary} disabled={busy !== null} onClick={() => onAction("accept")}>{busy === "accept" ? "Accepting…" : "Accept this loop"}<span aria-hidden="true">→</span></button> : <p className={styles.notice}>You’re in. We’ll update this page as the others accept.</p>}</>}

        {trade.status === "accepted" && <><h2 id="next-heading">Pick a place. Make it happen.</h2><p className={styles.panelDescription}>Everyone’s in. Choose a campus meetup spot and a time you’ve agreed on.</p>{cash && <p className={styles.notice}>💳 The payment is held on the buyer&apos;s card (Stripe test mode). It&apos;s charged only when the seller enters the buyer&apos;s code at the handoff.</p>}<form className={styles.meetupForm} onSubmit={(event) => { event.preventDefault(); void onAction("meetup", { spot, at: new Date(at).toISOString() }); }}>
          <label htmlFor="meetup-spot">Meetup spot</label><select id="meetup-spot" value={spot} onChange={(event) => setSpot(event.target.value)} required disabled={busy !== null}><option value="">Choose a campus spot</option>{spots.map((spot) => <option key={spot}>{spot}</option>)}</select>
          <label htmlFor="meetup-time">Date & time <span className={styles.muted}>(your local time)</span></label><input id="meetup-time" type="datetime-local" required min={localDateInput(new Date())} value={at} onChange={(event) => setAt(event.target.value)} disabled={busy !== null} />
          {!spots.length && <p role="alert">No meetup spots are configured for this campus yet.</p>}<button className={styles.primary} disabled={busy !== null || !spot || !at}>{busy === "meetup" ? "Scheduling…" : "Set the meetup"}<span aria-hidden="true">→</span></button>
        </form></>}

        {trade.status === "meetup_set" && <><h2 id="next-heading">Meet. Swap. Confirm.</h2><div className={styles.meetupSummary}><strong>{trade.meetup_spot}</strong><span>{displayDate(trade.meetup_at)}</span></div><p className={styles.panelDescription}>{confirmed} of {legs.length} handoffs confirmed. Only share your code when you receive your listing.</p>
          {received.map((leg) => { const code = detail.codes.find((code) => code.leg_id === leg.id)?.code; return <div className={styles.receiverCode} key={leg.id}>{leg.confirmed_at ? <p className={styles.confirmedLabel}>✓ Your received listing is confirmed.</p> : <><span>Your code for {name(leg.giver_id)}</span><strong aria-label={code ? `Your handoff code is ${code.split("").join(" ")}` : "Code is loading"}>{code ?? "••••"}</strong><p>Show this to {name(leg.giver_id)} when they give you <b>{title(leg.listing_id)}</b>.</p></>}</div>; })}
          {given.map((leg) => leg.confirmed_at ? <p key={leg.id} className={styles.notice}>✓ You confirmed your handoff to {name(leg.receiver_id)}.</p> : <ConfirmForm key={leg.id} leg={leg} title={title(leg.listing_id)} receiver={name(leg.receiver_id)} onAction={onAction} busy={busy} />)}
        </>}

        {trade.status === "done" && <div className={styles.celebration}><span aria-hidden="true">↻</span><h2 id="next-heading">Loop closed!</h2><p>{detail.profiles.length} people traded. Everyone’s handoff is confirmed.</p><Link href="/trades" className={styles.primary}>Find your next loop <span aria-hidden="true">↗</span></Link></div>}
        {trade.status === "cancelled" && <><h2 id="next-heading">This trade was cancelled.</h2><p className={styles.panelDescription}>Reserved items have been released. You can look for a fresh match in your trades.</p><Link href="/trades" className={styles.primary}>Explore other loops <span aria-hidden="true">↗</span></Link></>}
      </aside>
    </div>
    <div className={styles.detailBottom}><p>{trade.status === "meetup_set" && confirmed > 0 ? "A handoff is already confirmed, so this trade can’t be cancelled. Finish the remaining exchanges together." : "Meet in a public campus spot. Check the listing before you share a code."}</p>{canCancel && <div>{confirmCancel ? <div className={styles.cancelConfirm}><span>Release the reserved items?</span><button className={styles.dangerButton} disabled={busy !== null} onClick={() => onAction("cancel")}>{busy === "cancel" ? "Cancelling…" : "Yes, cancel trade"}</button><button className={styles.textButton} disabled={busy !== null} onClick={() => setConfirmCancel(false)}>Keep trade</button></div> : <button className={styles.textButton} disabled={busy !== null} onClick={() => setConfirmCancel(true)}>Cancel trade</button>}</div>}</div>
  </main>;
}
