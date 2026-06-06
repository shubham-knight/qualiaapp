export default function RevenueCard({
  title,
  value,
  growth,
  subtitle,
}) {
  return (
    <div className="metric-card">
      <div className="metric-title">
        {title}
      </div>

      <div className="metric-value">
        {value}
      </div>

      <div className="metric-growth">
        {growth} {subtitle}
      </div>
    </div>
  );
}