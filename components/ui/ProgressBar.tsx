export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-page-bg">
      <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
