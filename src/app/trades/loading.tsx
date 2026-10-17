import styles from "./trades.module.css";

export default function Loading() {
  return <div className={styles.loading} role="status">Getting your trades ready…</div>;
}
