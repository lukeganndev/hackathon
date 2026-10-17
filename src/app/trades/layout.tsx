import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import styles from "./trades.module.css";

export default async function TradesLayout({ children }: { children: React.ReactNode }) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  let displayName = "Student";
  let campus = "/";
  if (user) {
    const { data: profile } = await db.from("profiles").select("display_name, school_id").eq("id", user.id)
      .single<{ display_name: string | null; school_id: string }>();
    displayName = profile?.display_name ?? "Student";
    if (profile) {
      const { data: school } = await db.from("schools").select("slug").eq("id", profile.school_id).single<{ slug: string }>();
      if (school) campus = `/${school.slug}`;
    }
  }
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href={campus} className={styles.brand} aria-label="Loop home">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M24.5 10a10 10 0 1 0 1.3 10M24.5 10V3m0 7h-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>loop<span className={styles.brandDot}>.</span>
        </Link>
        <nav aria-label="Main navigation" className={styles.nav}>
          <Link href={campus}>Marketplace</Link>
          <Link href="/chat">Chat with Loop</Link>
          <Link href="/trades" aria-current="page">My trades</Link>
        </nav>
        {user && <span className={styles.account}><span className={styles.avatar} aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><span>{displayName}</span></span>}
      </header>
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
