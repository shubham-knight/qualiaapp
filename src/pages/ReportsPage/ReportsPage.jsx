import { useState } from "react";

const uploadTargets = [
  {
    key: "food",
    title: "Food & Beverage",
    description: "Daily revenue by channel, covers, and platform mix.",
  },
  {
    key: "spa",
    title: "Spa · Banquet · Other",
    description: "Department revenue, sessions, pax, and banquet events.",
  },
];

const sortReports = (reports = []) =>
  [...reports].sort((a, b) => a.monthKey.localeCompare(b.monthKey));

export default function ReportsPage({
  uploads,
  uploadStatus,
  databaseStatus,
  onUpload,
  renderDeleteAction,
}) {
  const [sectionFilter, setSectionFilter] = useState("all");
  const visibleTargets =
    sectionFilter === "all"
      ? uploadTargets
      : uploadTargets.filter((target) => target.key === sectionFilter);
  const visibleReports = visibleTargets.flatMap((target) =>
    sortReports(uploads[target.key] || []).map((report) => ({
      ...report,
      sectionTitle: target.title,
    })),
  );

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            Upload Excel or CSV files to refresh dashboard charts and tables.
          </p>
          {databaseStatus ? <p className="page-subtitle">{databaseStatus}</p> : null}
        </div>
      </div>

      <div className="upload-grid">
        {uploadTargets.map((target) => (
          <section className="upload-card" key={target.key}>
            <div>
              <h2>{target.title}</h2>
              <p>{target.description}</p>
            </div>

            <label className="upload-button">
              Upload file
              <input
                accept=".xlsx,.xlsm,.xltx,.xltm,.csv"
                multiple
                type="file"
                onChange={(event) => onUpload(target.key, event)}
              />
            </label>

            <div className="upload-status">
              {uploadStatus[target.key] ||
                (uploads[target.key]?.length
                  ? `${uploads[target.key].length} monthly report(s) uploaded`
                  : "No uploaded file yet")}
            </div>
          </section>
        ))}
      </div>

      <div className="table-card full-width">
        <div className="card-header">
          <h2>Uploaded Reports</h2>
          <div className="table-tools">
            <select
              className="month-select"
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
            >
              <option value="all">All sections</option>
              {uploadTargets.map((target) => (
                <option key={target.key} value={target.key}>
                  {target.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table className="channel-table reports-table">
          <thead>
            <tr>
              <th>SECTION</th>
              <th>MONTH</th>
              <th>ACTION</th>
            </tr>
          </thead>

          <tbody>
            {visibleReports.map((report) => (
              <tr key={report.id || `${report.section}-${report.monthKey}`}>
                <td>{report.sectionTitle}</td>
                <td>{report.monthLabel}</td>
                <td>{renderDeleteAction(report)}</td>
              </tr>
            ))}

            {!visibleReports.length ? (
              <tr>
                <td colSpan="3">No reports uploaded for this filter</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="table-card full-width schema-card">
        <h2>Accepted columns</h2>

        <div className="schema-grid">
          <div>
            <h3>Food & Beverage</h3>
            <p>
              Date/Day, paired channel columns such as Zomato Table + Amount,
              Swiggy Table + Amount, and a TOTAL row. The final total row drives
              KPI totals and channel performance.
            </p>
          </div>

          <div>
            <h3>Spa · Banquet · Other</h3>
            <p>
              Department/Section/Category, Revenue/Amount/Sales, optional
              Sessions/Pax/Count, and Event/Booking/Function for banquet rows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
