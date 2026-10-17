import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Loop", description: "Campus trade loops" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans max-w-6xl mx-auto min-h-screen px-6 py-8">{children}</body>
    </html>
  );
}
