import PrintSummary from "../../components/molecules/PrintSummary/PrintSummary";
import RevenueCard from "../../components/atoms/RevenueCard/RevenueCard";
import RevenueChart from "../../components/atoms/RevenueChart/RevenueChart";

export default function FoodDashboard({
  report,
  aggregateIntervalDays = 15,
  intervalOptions = [],
  includeExecutiveSummary = true,
  includeExportTimestamp = true,
  includeSourceLabels = true,
  onChangeAggregateInterval,
}) {
  return (
    <>
      {includeExecutiveSummary ? (
        <PrintSummary
          report={report}
          type="food"
          includeTimestamp={includeExportTimestamp}
        />
      ) : null}

      <div className="metrics five-cols">
        {report.cards.map((card) => (
          <RevenueCard key={card.title} {...card} />
        ))}
      </div>

      <div className="food-grid">
        <div className="chart-card">
          <div className="card-header">
            <h2>Daily F&B Revenue by Channel</h2>

            {report?.dailyData?.length ? (
              <div className="card-tools">
                <select
                  className="month-select chart-interval-select"
                  value={aggregateIntervalDays}
                  onChange={(event) =>
                    onChangeAggregateInterval?.(Number(event.target.value))
                  }
                >
                  {intervalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <RevenueChart data={report.dailyData} />

          <div className="channel-filters chart-channel-legend">
            {report.channelRows.map((row) => (
              <button className={`channel-pill ${row.dot}`} key={row.key || row.name}>
                {row.name}
              </button>
            ))}
          </div>
        </div>

        <div className="donut-card">
          <h2>Revenue Share by Channel</h2>

          <div className="donut-chart-wrap">
            <RevenueChart type="doughnut" data={report.channelData} />
          </div>

          <div className="chart-legend">
            {report.channelRows
              .filter((row) => row.revenue > 0)
              .map((row) => (
                <span key={row.key || row.name}>
                  <span className={`dot ${row.dot}`}></span>
                  {row.name}
                </span>
              ))}
          </div>
        </div>
      </div>

      <div className="table-card full-width">
        <div className="card-header">
          <h2>Channel Performance</h2>
          {includeSourceLabels ? <span>{report.sourceLabel}</span> : null}
        </div>

        <table className="channel-table">
          <thead>
            <tr>
              <th>CHANNEL</th>
              <th>TABLES</th>
              <th>SHARE</th>
              <th>AVG / TABLE</th>
              <th>REVENUE</th>
            </tr>
          </thead>

          <tbody>
            {report.channelRows.map((row) => (
              <tr key={row.key || row.name}>
                <td data-label="Channel">
                  <span className={`dot ${row.dot}`}></span>
                  {row.name}
                </td>
                <td data-label="Tables">{row.tables}</td>
                <td data-label="Share">{row.share}</td>
                <td data-label="Avg / Table">{row.avg}</td>
                <td className="revenue" data-label="Revenue">
                  {row.formattedRevenue}
                </td>
              </tr>
            ))}

            <tr className="total-row">
              <td data-label="Channel">Total</td>
              <td data-label="Tables">{report.totalRow.tables}</td>
              <td data-label="Share">100%</td>
              <td data-label="Avg / Table">{report.totalRow.avg}</td>
              <td className="revenue" data-label="Revenue">
                {report.totalRow.revenue}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
