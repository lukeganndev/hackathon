import { statusLabels, type TradeStatus } from "./types";
import styles from "../trades.module.css";

export function StatusBadge({ status }: { status: TradeStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}><span aria-hidden="true" />{statusLabels[status]}</span>;
}
