import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import styles from "./trades.module.css";

// The site header lives in the root layout; this only gates signed-out visitors.
export default async function TradesLayout({ children }: { children: React.ReactNode }) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  return (
    <div className={styles.shell}>
      {user ? children : (
        <main className={styles.signedOut}>
          <p className={styles.eyebrow}>YOUR CAMPUS. MORE POSSIBILITIES.</p>
          <h1>Good trades start with you.</h1>
          <p>Sign in with your school email to find loops and keep track of your trades.</p>
          <Link href="/login" className={styles.primary}>Sign in to view trades <span aria-hidden="true">↗</span></Link>
        </main>
      )}
      <footer className={styles.footer}><span>A little less buying. A lot more possibility.</span><span>Made for your campus.</span></footer>
    </div>
  );
}
