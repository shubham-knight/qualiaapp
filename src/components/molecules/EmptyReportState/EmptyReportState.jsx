export default function EmptyReportState({ title, onOpenReports }) {
  return (
    <div className="empty-report">
      <h2>{title} report not uploaded</h2>
      <p>
        Upload the Excel file from Reports to generate KPI cards, charts, and
        performance tables.
      </p>
      <button className="export-btn" onClick={onOpenReports}>
        Go to Reports
      </button>
    </div>
  );
}
