// Placeholder home page until the dashboard (F6).
export default function Home() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">TradeLens</h1>
      <p className="max-w-prose opacity-80">
        An AI trade journal. Log closed trades, see win rate and drawdown per currency, and get a short AI review of each
        trading day.
      </p>
    </div>
  );
}
