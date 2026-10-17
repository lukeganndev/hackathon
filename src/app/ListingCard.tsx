import Link from "next/link";
import { ink } from "@/lib/schoolTheme";

// Listing card from the design: photo, or a striped tile in school colors with an icon.
const IC: Record<string, string> = {
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5M8 7h7",
  bike: "M5 18a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19 18a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 14.5l4-7h6l4 7M9 7.5l3 7M7.5 6h3",
  chip: "M5 6h14v10H5zM2 19h20M9 9h6v4H9z",
  chair: "M7 3h10v8H7zM5 11h14v3H5zM7 14v7M17 14v7",
  shirt: "M8 3L3 7l3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 01-8 0z",
  ticket: "M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4zM14 6v12",
  lamp: "M8 3h8l3 9H5zM12 12v8M8 21h8",
  box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  bed: "M3 19V7M3 14h18v5M21 14v-2a3 3 0 00-3-3h-8v5M6.5 11.5h.01",
  car: "M5 16l1.5-5a2 2 0 012-1.5h7a2 2 0 012 1.5L19 16M3 16h18v3H3zM7 19v2M17 19v2M7 13h.01M17 13h.01",
  flask: "M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M8 15h8",
};
const KW: [RegExp, string][] = [
  [/tutor/i, "book"], [/ride|airport/i, "car"], [/ticket/i, "ticket"], [/lamp/i, "lamp"],
  [/book|anthology|calc(ulus)? |chem|text|ed\./i, "book"], [/bike|scooter/i, "bike"],
  [/shirt|hoodie|jacket|jersey|shoe/i, "shirt"], [/fridge|chair|desk|shelf|couch|futon|table/i, "chair"],
  [/laptop|ipad|monitor|keyboard|phone|ti-|calculator|headphone/i, "chip"], [/bedding|mattress|towel/i, "bed"],
];
const BY_CAT: Record<string, string> = { textbooks: "book", clothing: "shirt", tickets: "ticket", furniture: "chair", electronics: "chip", dorm: "bed", lab: "flask", tutoring: "book", rides: "car" };

export function icon(title: string, category?: string | null) {
  return (KW.find(([re]) => re.test(title))?.[1]) ?? BY_CAT[category ?? ""] ?? "box";
}

export type CardListing = { id: string; title: string; price_cents: number | null; photo_url: string | null; category: string | null; kind?: string; status?: string };
export type CardSchool = { name: string; colors: { primary: string; secondary?: string }; email_domains?: string[] };

export function ListingCard({ l, school, seller, delay = 0, mine }: { l: CardListing; school: CardSchool; seller?: string; delay?: number; mine?: boolean }) {
  const c = school.colors.primary, c2 = school.colors.secondary ?? "#828A8F";
  const tileStyle = l.photo_url ? { background: c } : {
    color: ink(c),
    background: `repeating-linear-gradient(135deg,transparent 0 18px,color-mix(in srgb,${c2} 16%,transparent) 18px 36px),${c}`,
    boxShadow: `inset 0 -7px 0 ${c2}`,
  };
  const sold = l.status === "sold" || l.status === "traded";
  return (
    <Link href={`/listings/${l.id}`} className="lcard" style={{ animationDelay: `${delay}ms` }}>
      <div className="tile" style={{ ...tileStyle, filter: sold ? "grayscale(1) opacity(.5)" : undefined }}>
        {l.photo_url
          ? <img src={l.photo_url} alt="" />
          : <svg className="ic" viewBox="0 0 24 24" aria-hidden><path d={IC[icon(l.title, l.category)]} /></svg>}
        <span className="tag">{(school.email_domains?.[0] ?? school.name).toUpperCase()}{mine ? " · YOUR CAMPUS" : ""}</span>
      </div>
      <div className="cb">
        <h3>{l.title}</h3>
        <div className="crow">
          <span>{[l.category?.replace("_", " "), seller].filter(Boolean).join(" · ")}</span>
          <b>{sold ? "Sold" : l.price_cents == null ? "Trade" : `$${(l.price_cents / 100).toFixed(0)}`}</b>
        </div>
      </div>
    </Link>
  );
}
