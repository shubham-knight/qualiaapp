export default function LoadingReportState() {
  return (
    <div className="loading-report-page" aria-live="polite" aria-busy="true">
      <div className="loading-spinner"></div>
      <div className="loading-copy">
        <h2>Fetching your reports</h2>
        <p>Hang on while we load the latest uploaded data and prepare the dashboard.</p>
      </div>
    </div>
  );
}
