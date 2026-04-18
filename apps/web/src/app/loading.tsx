export default function RootLoading(): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-6 py-10">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg border border-border bg-card"
        />
      ))}
    </div>
  );
}
