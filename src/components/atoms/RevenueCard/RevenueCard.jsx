export default function RevenueCard({
  title,
  value,
  growth,
  subtitle,
  trendTone,
}) {
  const compactValue =
    title === "Peak Day" || title === "Peak Interval" || title === "Best Channel";

  return (
    <div className="metric-card">
      <div className="metric-title">{title}</div>

      <div className={`metric-value ${compactValue ? "compact" : ""}`.trim()}>
        {value}
      </div>

      <div className={`metric-growth ${trendTone || ""}`.trim()}>
        {growth} {subtitle}
      </div>
    </div>
  );
}
