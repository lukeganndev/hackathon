// School branding helpers, ported from the Loop design.
export type School = { id: string; slug: string; name: string; colors: { primary: string; secondary?: string }; slogan?: string | null; logo_url?: string | null };

const lum = (hex: string) => {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return (parseInt(n.slice(0, 2), 16) * 299 + parseInt(n.slice(2, 4), 16) * 587 + parseInt(n.slice(4, 6), 16) * 114) / 1000;
};
/** Readable text color on top of a school color. */
export const ink = (hex: string) => (lum(hex) > 150 ? "#1a1a1a" : "#fff");

/** CSS variables that retheme the whole site to a school. */
export const themeVars = (s?: Pick<School, "colors"> | null): React.CSSProperties => {
  const c = s?.colors.primary ?? "#9E1B32";
  return { "--accent": c, "--school": c, "--c2": s?.colors.secondary ?? "#828A8F", "--on": ink(c) } as React.CSSProperties;
};

/** Short name for headlines: "University of Alabama" -> "Alabama". */
export const shortName = (name: string) => name.replace(/^The /, "").replace("University of ", "").replace(" University", "");

/** 1-3 letters for the generated crest. */
export function initials(s: Pick<School, "name" | "slug">) {
  const words = shortName(s.name).split(/\s+/);
  if (/&/.test(s.name)) return "A&M";
  if (/^[A-Z]{2,4}$/.test(words[0])) return words[0];
  if (s.slug.length <= 3) return s.slug.toUpperCase();
  return words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2).toUpperCase();
}
