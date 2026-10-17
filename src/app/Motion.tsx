"use client";
import { useEffect, useRef, useState } from "react";

/** Counts up from 0 when it scrolls into view. Keeps any prefix/suffix like "$". */
export function CountUp({ value }: { value: string | number }) {
  const m = String(value).match(/^(\D*)([\d,]+)(.*)$/);
  const target = m ? Number(m[2].replace(/,/g, "")) : 0;
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!m || matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(target);
    const el = ref.current!;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / 900);
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <>{value}</>;
  return <span ref={ref}>{m[1]}{n.toLocaleString()}{m[3]}</span>;
}

/** Confetti burst in school colors (from the design), once on mount. */
export function Confetti() {
  const [pieces] = useState(() => Array.from({ length: 46 }, (_, k) => ({
    left: Math.random() * 100, delay: Math.random() * 0.5, dur: 1.4 + Math.random(), alt: k % 2 === 0,
  })));
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setTimeout(() => setOn(false), 2800); return () => clearTimeout(t); }, []);
  if (!on) return null;
  return <>{pieces.map((p, k) => (
    <i key={k} className="cf" aria-hidden style={{ left: `${p.left}vw`, background: p.alt ? "var(--accent)" : "var(--c2)", animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
  ))}</>;
}
