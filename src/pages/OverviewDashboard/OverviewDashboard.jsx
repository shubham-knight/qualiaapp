import { FileText } from "lucide-react";
import RevenueCard from "../../components/atoms/RevenueCard/RevenueCard";
import RevenueChart from "../../components/atoms/RevenueChart/RevenueChart";

export default function OverviewDashboard({ report, onExport }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Executive overview across uploaded section reports, monthly revenue
            movement, department mix, and strongest sales days.
          </p>
        </div>

        <div className="header-actions">
          <button className="export-btn" type="button" onClick={onExport}>
            <FileText size={16} strokeWidth={2.2} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="metrics five-cols">
        {report.cards.map((card) => (
          <RevenueCard key={card.title} {...card} />
        ))}
      </div>

      <div className="overview-grid">
        <div className="chart-card">
          <div className="card-header">
            <h2>Monthly Revenue Trend</h2>
            <span>Combined across uploaded sections</span>
          </div>
          <RevenueChart type="trend" data={report.monthlyRevenue} />
        </div>

        <div className="donut-card">
          <h2>Revenue by Department</h2>

          <div className="donut-chart-wrap">
            <RevenueChart type="doughnut" data={report.departmentData} />
          </div>

          <div className="chart-legend overview-legend">
            {report.departmentData.map((row) => (
              <span key={row.name}>
                <span className="dot"></span>
                {row.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="table-card full-width overview-full-table">
        <div className="card-header">
          <h2>Best Sales Days</h2>
          <span>Highest day-wise revenue from uploaded daily reports</span>
        </div>

        <table className="channel-table overview-best-days-table">
          <thead>
            <tr>
              <th>DAY</th>
              <th>SECTION</th>
              <th>TOP DRIVER</th>
              <th>REVENUE</th>
            </tr>
          </thead>
          <tbody>
            {report.bestSalesDays.map((row) => (
              <tr key={`${row.label}-${row.section}`}>
                <td>{row.label}</td>
                <td>{row.section}</td>
                <td>{row.topChannel}</td>
                <td className="revenue">{row.formattedRevenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
