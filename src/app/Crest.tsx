import { ink, initials, type School } from "@/lib/schoolTheme";

// School crest: the official logo if the school row has one, otherwise a shield with
// initials in school colors (from the design).
export function Crest({ school, className = "crest" }: { school: Pick<School, "name" | "slug" | "colors" | "logo_url">; className?: string }) {
  if (school.logo_url) {
    return <img className={className} src={school.logo_url} alt={`${school.name} logo`} style={{ objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(0,0,0,.28))" }} />;
  }
  const a = initials(school), c = school.colors.primary, c2 = school.colors.secondary ?? "#828A8F", k = ink(c);
  return (
    <svg className={className} viewBox="0 0 96 112" role="img" aria-label={`${school.name} crest`}>
      <path d="M48 4L90 18v42c0 26-18 41-42 48C24 101 6 86 6 60V18z" fill={c2} />
      <path d="M48 12L82 24v36c0 21-14 33-34 40C28 93 14 81 14 60V24z" fill={c} stroke={k} strokeOpacity=".5" strokeWidth="2" />
      <text x="48" y="66" textAnchor="middle" fontFamily="var(--font-serif), Georgia, serif" fontWeight="600" fontSize={a.length > 2 ? 24 : 32} fill={k}>{a}</text>
    </svg>
  );
}

/** The Loop mark: a figure-eight loop. */
export const LoopMark = () => (
  <svg viewBox="0 0 160 80" aria-hidden><path d="M80 40C60 8 14 8 14 40s46 32 66 0 66-32 66 0-46 32-66 0z" /></svg>
);
