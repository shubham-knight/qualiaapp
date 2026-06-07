import PrintSummary from "../../components/molecules/PrintSummary/PrintSummary";
import RevenueCard from "../../components/atoms/RevenueCard/RevenueCard";
import RevenueChart from "../../components/atoms/RevenueChart/RevenueChart";
import EventTable from "../../components/molecules/EventTable/EventTable";

export default function AncillaryDashboard({
  report,
  includeExecutiveSummary = true,
  includeExportTimestamp = true,
  includeSourceLabels = true,
}) {
  return (
    <>
      {includeExecutiveSummary ? (
        <PrintSummary
          report={report}
          type="ancillary"
          includeTimestamp={includeExportTimestamp}
        />
      ) : null}

      <div className="metrics">
        {report.cards.map((card) => (
          <RevenueCard key={card.title} {...card} />
        ))}
      </div>

      <div className="content-grid">
        <div className="chart-card">
          <div className="card-header">
            <h2 className="card-title">Ancillary Revenue by Department</h2>
            {includeSourceLabels ? <span>{report.sourceLabel}</span> : null}
          </div>

          <RevenueChart data={report.chartData} />
        </div>

        <div className="table-card">
          <EventTable events={report.events} />
        </div>
      </div>
    </>
  );
}
