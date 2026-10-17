import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fraunces, Inter_Tight } from "next/font/google";
import { supabaseServer } from "@/lib/supabase/server";
import { themeVars, type School } from "@/lib/schoolTheme";
import { LoopMark } from "./Crest";
import { Nav, SignOut, Intro } from "./HeaderClient";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-serif" });
const sans = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });

export const metadata: Metadata = { title: "Loop: the campus marketplace network", description: "Trade in loops, not pairs." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Retheme the whole site to the signed-in student's school.
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  let school: School | null = null;
  let name = "";
  if (user) {
    const { data: p } = await db.from("profiles")
      .select("display_name, school:schools(id, slug, name, colors, slogan, logo_url)").eq("id", user.id).single();
    school = (p?.school as unknown as School) ?? null;
    name = p?.display_name ?? "";
  }

  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} style={themeVars(school)}>
      <body className="antialiased">
        <Intro />
        <header className="hdr">
          <Link href={school ? `/${school.slug}` : "/"} className="logo" aria-label="Loop home"><LoopMark />Loop</Link>
          {user && school && <Nav slug={school.slug} />}
          <div style={{ flex: 1 }} />
          {user && school
            ? <span className="chip"><i className="dot" />{school.name} · {name}<SignOut /></span>
            : <Link href="/login" className="btn" style={{ padding: "8px 16px" }}>Sign in</Link>}
        </header>
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
