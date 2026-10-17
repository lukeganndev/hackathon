"use client";

import type { School } from "@/lib/schoolTheme";
import { Crest, LoopMark } from "../Crest";
import styles from "./login.module.css";

function ItemIcon({ kind }: { kind: "book" | "shoes" | "fridge" }) {
  return (
    <svg viewBox="0 0 80 72" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {kind === "book" && <><path d="m21 12 32-4 8 46-33 6-7-48Z" fill="currentColor" fillOpacity=".08" /><path d="m28 60-6 1-8-47 7-2M29 23l18-3M31 30l18-3M34 44l12-2M28 56l31-5" /><path d="m52 8 2 9-6-2-4 4-2-10" /></>}
      {kind === "shoes" && <><path d="m14 39 7-20 13 7 9 12 20 7c8 3 9 13 1 14H17c-8 0-9-11-3-20Z" fill="currentColor" fillOpacity=".08" /><path d="M12 51h58M29 31l9-4M34 37l9-4M40 42l8-4M21 19l-1 16 9 6M19 59v4M60 59v4" /></>}
      {kind === "fridge" && <><rect x="19" y="6" width="42" height="59" rx="5" fill="currentColor" fillOpacity=".08" /><path d="M19 25h42M27 15v5M27 33v10M26 65v3M54 65v3" /><path d="m43 12 5 3-2 6-6-1-1-5 4-3Z" /></>}
    </svg>
  );
}

export function LoginShowcase({ schools, onSignIn }: { schools: School[]; onSignIn: () => void }) {
  const featured = ["alabama", "vt", "umich", "lsu"]
    .map((slug) => schools.find((school) => school.slug === slug))
    .filter((school): school is School => Boolean(school));

  return (
    <div className={styles.showcase}>
      <section className={styles.hero} aria-labelledby="loop-intro-title">
        <div className={styles.copy}>
          <p className={styles.eyebrow}><span /> Your campus, on Loop.</p>
          <h1 id="loop-intro-title">Good things<br />come <em>around.</em></h1>
          <p className={styles.description}>The textbook you&apos;re done with. The mini fridge you need. A whole campus of possibilities.</p>
          <p className={styles.support}>Buy, sell, or let AI connect the dots in a trade. All with students from your campus.</p>
          <button className={`btn ${styles.cta}`} onClick={onSignIn}>Sign in <span aria-hidden>↗</span></button>
          <p className={styles.trust}><svg viewBox="0 0 20 20" fill="none" aria-hidden><path d="m10 2 6 3v5c0 4-6 7-6 7s-6-3-6-7V5l6-3Z" stroke="currentColor" strokeWidth="1.4" /><path d="m7 9 2 2 4-4" stroke="currentColor" strokeWidth="1.4" /></svg> Your school email is your way in.</p>
        </div>

        <figure className={styles.example} aria-label="Example trade loop: a textbook goes to one student, shoes to another, and a mini fridge to the third. Everyone gets what they need.">
          <div className={styles.exampleHeading}><span className={styles.liveDot} /> A little campus magic</div>
          <div className={styles.diagram}>
            <svg className={styles.connections} viewBox="0 0 420 420" fill="none" aria-hidden>
              <defs><marker id="login-loop-arrow" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto"><path d="m1 1 4 3-4 3" stroke="currentColor" strokeWidth="1.5" /></marker></defs>
              <path d="M286 112C365 134 386 206 348 259M276 351C226 390 175 385 130 352M68 259C30 191 75 129 129 113" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 6" markerEnd="url(#login-loop-arrow)" />
            </svg>
            <div className={`${styles.item} ${styles.book}`}><div className={styles.itemArt}><ItemIcon kind="book" /></div><div className={styles.itemInfo}><b>A textbook</b><span>Finished the semester.</span></div><span className={styles.student}>A</span></div>
            <div className={`${styles.item} ${styles.shoes}`}><div className={styles.itemArt}><ItemIcon kind="shoes" /></div><div className={styles.itemInfo}><b>A pair of shoes</b><span>Ready for a new home.</span></div><span className={styles.student}>B</span></div>
            <div className={`${styles.item} ${styles.fridge}`}><div className={styles.itemArt}><ItemIcon kind="fridge" /></div><div className={styles.itemInfo}><b>A mini fridge</b><span>Just what you needed.</span></div><span className={styles.student}>C</span></div>
            <div className={styles.loopCenter}><LoopMark /><span>Three people.<br /><b>One happy loop.</b></span></div>
          </div>
          <figcaption>Trade in loops. Everyone gets something they want.</figcaption>
        </figure>
      </section>

      <div className={styles.campuses}>
        <div className={styles.schoolLogos} aria-hidden>{featured.map((school) => <Crest key={school.id} school={school} className={styles.schoolLogo} />)}</div>
        <p>{schools.length > 0 ? <><b>{schools.length} campuses.</b> One Loop.</> : <><b>Your campus.</b> One Loop.</>}</p>
        <span className={styles.campusNote}>Your people. Your school colors. Your marketplace.</span>
      </div>

      <section className={styles.steps} aria-label="How Loop works">
        <article><span className={styles.stepNumber}>01 /</span><h2>Have something?</h2><p>Snap a photo and let AI help turn it into a listing.</p></article>
        <article><span className={styles.stepNumber}>02 /</span><h2>Want something?</h2><p>Ask Loop. It finds listings and connects possible trades.</p></article>
        <article><span className={styles.stepNumber}>03 /</span><h2>Keep it on campus.</h2><p>Meet up, swap handoff codes, and give good things another go.</p></article>
      </section>
      <footer className={styles.footer}><span>A little less waste. A lot more possibility.</span><span>Made for campus life.</span></footer>
    </div>
  );
}
