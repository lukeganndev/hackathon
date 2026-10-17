// Read-only star display: "★★★★☆ 4.2 (12)" or "New seller".
export function Stars({ avg, count }: { avg: number | null; count: number }) {
  if (!count || avg == null) return <span className="text-sm opacity-70">New seller, no reviews yet</span>;
  const full = Math.round(avg);
  return (
    <span className="text-sm" aria-label={`${avg} out of 5 stars from ${count} review${count === 1 ? "" : "s"}`}>
      <span className="text-amber-500" aria-hidden>{"★".repeat(full)}{"☆".repeat(5 - full)}</span>{" "}
      {avg} ({count})
    </span>
  );
}
