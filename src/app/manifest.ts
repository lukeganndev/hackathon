import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Loop",
    short_name: "Loop",
    description: "Your campus marketplace. Buy, sell, and trade in loops.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#9e1b32",
    icons: [
      { src: "/icons/loop-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/loop-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
