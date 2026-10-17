"use client";

import Link from "next/link";
import styles from "./trades.module.css";

export default function TradeError({ reset }: { reset: () => void }) {
  return <main className={styles.empty}><h1>We couldn’t load this trade.</h1><p>Please retry, or return to your trades.</p><div className={styles.actions}><button onClick={reset} className={styles.primary}>Try again</button><Link href="/trades" className={styles.secondary}>My trades</Link></div></main>;
}
