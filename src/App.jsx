import { useEffect, useMemo, useState } from "react";

import Sidebar from "./components/Sidebar";
import RevenueCard from "./components/RevenueCard";
import RevenueChart from "./components/RevenueChart";
import EventTable from "./components/EventTable";

import "./styles/dashboard.scss";

import {
  createAncillaryReport,
  createFoodReport,
  parseUploadedReport,
} from "./utils/reportParser";
import {
  deleteStoredReport,
  fetchStoredReports,
  saveStoredReport,
} from "./utils/reportApi";

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

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));

const formatCompactCurrency = (value) => {
  if (Math.abs(value || 0) >= 100000) {
    return `₹${((value || 0) / 100000).toFixed(2)}L`;
  }

  return formatCurrency(value);
};

const formatIntervalLabel = (intervalDays) =>
  intervalDays >= 31 ? "monthly intervals" : `${intervalDays}-day intervals`;

const sortReports = (reports = []) =>
  [...reports].sort((a, b) => a.monthKey.localeCompare(b.monthKey));

const groupReportsBySection = (reports = []) => ({
  food: sortReports(reports.filter((report) => report.section === "food")),
  spa: sortReports(reports.filter((report) => report.section === "spa")),
});

const latestMonthKey = (reports = []) => sortReports(reports).at(-1)?.monthKey || "";

const getSelectedReports = (reports, selection) => {
  const sorted = sortReports(reports);

  if (!sorted.length) return [];

  if (selection?.startsWith("last-")) {
    const count = Number(selection.replace("last-", ""));
    return sorted.slice(-count);
  }

  return [sorted.find((report) => report.monthKey === selection) || sorted.at(-1)];
};

const getSelectionLabel = (reports, selection) => {
  const selected = getSelectedReports(reports, selection);

  if (!selected.length) return "";
  if (selected.length === 1) return selected[0].monthLabel;

  return `${selected[0].monthLabel} - ${selected.at(-1).monthLabel}`;
};

const bucketFoodDailyData = (reports, intervalDays) => {
  const bucketMap = new Map();

  reports.forEach((uploadedReport) => {
    uploadedReport.report.dailyData.forEach((row) => {
      const dayNumber = Number(String(row.day).match(/\d{1,2}/)?.[0] || 1);
      const bucketStart =
        Math.floor((dayNumber - 1) / intervalDays) * intervalDays + 1;
      const bucketEnd = Math.min(bucketStart + intervalDays - 1, 31);
      const bucketKey = `${uploadedReport.monthKey}-${bucketStart}`;
      const bucketLabel = `${uploadedReport.monthShort} ${bucketStart}-${bucketEnd}`;
      const bucket = bucketMap.get(bucketKey) || {
        day: bucketLabel,
      };

      uploadedReport.report.channelRows.forEach((channel) => {
        bucket[channel.key] = (bucket[channel.key] || 0) + (row[channel.key] || 0);
      });

      bucketMap.set(bucketKey, bucket);
    });
  });

  return [...bucketMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
};

const sumFoodReports = (reports, periodLabel, intervalDays) => {
  const channelMap = new Map();

  reports.forEach((uploadedReport) => {
    uploadedReport.report.channelRows.forEach((row) => {
      const current = channelMap.get(row.key) || {
        ...row,
        tables: 0,
        revenue: 0,
      };

      current.tables += row.tables;
      current.revenue += row.revenue;
      channelMap.set(row.key, current);
    });
  });

  const channelRows = [...channelMap.values()];
  const dailyData = bucketFoodDailyData(reports, intervalDays);
  const totalRevenue = channelRows.reduce((total, row) => total + row.revenue, 0);
  const totalTables = channelRows.reduce((total, row) => total + row.tables, 0);
  const bestChannel =
    [...channelRows].sort((a, b) => b.revenue - a.revenue)[0] || channelRows[0];
  const peakDay =
    [...dailyData].sort(
      (a, b) =>
        channelRows.reduce((total, row) => total + (b[row.key] || 0), 0) -
        channelRows.reduce((total, row) => total + (a[row.key] || 0), 0),
    )[0] || {};
  const peakRevenue = channelRows.reduce(
    (total, row) => total + (peakDay[row.key] || 0),
    0,
  );

  return {
    periodLabel,
    cards: [
      {
        title: "F&B Revenue",
        value: formatCompactCurrency(totalRevenue),
        growth: "Aggregate",
        subtitle: periodLabel,
      },
      {
        title: "Total Covers",
        value: String(totalTables),
        growth: "Tables",
        subtitle: `${reports.length} reports`,
      },
      {
        title: "Avg. Cheque",
        value: formatCurrency(totalRevenue / (totalTables || 1)),
        growth: "Revenue / covers",
        subtitle: "",
      },
      {
        title: "Best Channel",
        value: bestChannel?.name?.split(" / ")[0] || "-",
        growth: formatCompactCurrency(bestChannel?.revenue || 0),
        subtitle: totalRevenue
          ? `${(((bestChannel?.revenue || 0) / totalRevenue) * 100).toFixed(0)}%`
          : "0%",
      },
      {
        title: "Peak Interval",
        value: peakDay.day || "-",
        growth: formatCompactCurrency(peakRevenue),
        subtitle: "period high",
      },
    ],
    channelData: channelRows
      .filter((row) => row.revenue > 0)
      .map((row) => ({ name: row.name, value: row.revenue })),
    channelRows: channelRows.map((row) => ({
      ...row,
      share: totalRevenue ? `${((row.revenue / totalRevenue) * 100).toFixed(1)}%` : "0%",
      avg: formatCurrency(row.revenue / (row.tables || 1)),
      formattedRevenue: formatCurrency(row.revenue),
    })),
    dailyData,
    sourceLabel: `Source: ${reports.length} uploaded F&B reports · ${periodLabel} · ${formatIntervalLabel(intervalDays)}`,
    totalRow: {
      tables: totalTables,
      avg: formatCurrency(totalRevenue / (totalTables || 1)),
      revenue: formatCurrency(totalRevenue),
    },
  };
};

const sumAncillaryReports = (reports, periodLabel) => {
  const departmentMap = new Map();
  const events = [];

  reports.forEach((uploadedReport) => {
    uploadedReport.report.chartData.forEach((row) => {
      departmentMap.set(row.name, (departmentMap.get(row.name) || 0) + row.revenue);
    });

    uploadedReport.report.events.forEach((event) => {
      events.push({
        ...event,
        event: `${uploadedReport.monthShort} · ${event.event}`,
      });
    });
  });

  const chartData = [...departmentMap.entries()]
    .map(([name, revenue]) => ({ name, revenue: Number(revenue.toFixed(2)) }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    periodLabel,
    cards: chartData.slice(0, 4).map((department) => ({
      title: department.name,
      value: `₹${department.revenue.toFixed(2)}L`,
      growth: "Aggregate",
      subtitle: `${reports.length} reports`,
    })),
    chartData,
    events,
    sourceLabel: `Source: ${reports.length} uploaded ancillary reports · ${periodLabel}`,
  };
};

const createActiveReport = (reports, selection, type, intervalDays) => {
  const selected = getSelectedReports(reports, selection);

  if (!selected.length) return null;
  if (selected.length === 1) return selected[0].report;

  const periodLabel = getSelectionLabel(reports, selection);
  return type === "food"
    ? sumFoodReports(selected, periodLabel, intervalDays)
    : sumAncillaryReports(selected, periodLabel);
};

function ReportsPage({
  uploads,
  uploadStatus,
  databaseStatus,
  onUpload,
  onDelete,
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
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            Upload Excel or CSV files to refresh dashboard charts and tables.
          </p>
          {databaseStatus ? (
            <p className="page-subtitle">{databaseStatus}</p>
          ) : null}
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

        <table className="channel-table">
          <thead>
            <tr>
              <th>SECTION</th>
              <th>MONTH</th>
              <th>FILE</th>
              <th>ROWS</th>
              <th>ACTION</th>
            </tr>
          </thead>

          <tbody>
            {visibleReports.map((report) => (
              <tr key={report.id || `${report.section}-${report.monthKey}`}>
                <td>{report.sectionTitle}</td>
                <td>{report.monthLabel}</td>
                <td>{report.fileName}</td>
                <td>{report.rows.length}</td>
                <td>
                  <button
                    className="danger-btn"
                    type="button"
                    onClick={() => onDelete(report)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {!visibleReports.length ? (
              <tr>
                <td colSpan="5">No reports uploaded for this filter</td>
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
    </>
  );
}

function getCard(report, title) {
  return report.cards.find((card) => card.title === title);
}

function PrintSummary({ report, type }) {
  if (type === "food") {
    const revenue = getCard(report, "F&B Revenue")?.value;
    const covers = getCard(report, "Total Covers")?.value;
    const avgCheque = getCard(report, "Avg. Cheque")?.value;
    const bestChannel = getCard(report, "Best Channel");
    const peakPeriod = getCard(report, "Peak Day") || getCard(report, "Peak Interval");

    return (
      <section className="print-summary">
        <h2>Executive Summary</h2>
        <p>
          This Food & Beverage report summarizes uploaded channel revenue,
          covers, average cheque, channel contribution, and day-wise revenue
          movement. Total F&B revenue is {revenue}, generated from {covers}{" "}
          covers at an average cheque of {avgCheque}. The strongest channel is{" "}
          {bestChannel?.value} with {bestChannel?.growth}, while the peak sales
          period is {peakPeriod?.value} at {peakPeriod?.growth}.
        </p>
      </section>
    );
  }

  const topDepartment = report.cards[0];

  return (
    <section className="print-summary">
      <h2>Executive Summary</h2>
      <p>
        This ancillary revenue report summarizes department performance and
        banquet activity from the uploaded file. The highest contributing
        revenue centre is {topDepartment?.title} at {topDepartment?.value}.
        The chart below compares revenue across departments, followed by the
        detailed event table where available.
      </p>
    </section>
  );
}

function EmptyReportState({ title, onOpenReports }) {
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

function FoodDashboard({ report }) {
  return (
    <>
      <PrintSummary report={report} type="food" />

      <div className="metrics five-cols">
        {report.cards.map((card) => (
          <RevenueCard key={card.title} {...card} />
        ))}
      </div>

      <div className="food-grid">
        <div className="chart-card">
          <div className="card-header">
            <h2>Daily F&B Revenue by Channel</h2>
          </div>

          <RevenueChart data={report.dailyData} />

          <div className="channel-filters chart-channel-legend">
            {report.channelRows.map((row) => (
              <button
                className={`channel-pill ${row.dot}`}
                key={row.key || row.name}
              >
                {row.name}
              </button>
            ))}
          </div>
        </div>

        <div className="donut-card">
          <h2>Revenue Share by Channel</h2>

          <RevenueChart type="doughnut" data={report.channelData} />

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
          <span>{report.sourceLabel}</span>
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
                <td>
                  <span className={`dot ${row.dot}`}></span>
                  {row.name}
                </td>
                <td>{row.tables}</td>
                <td>{row.share}</td>
                <td>{row.avg}</td>
                <td className="revenue">{row.formattedRevenue}</td>
              </tr>
            ))}

            <tr className="total-row">
              <td>Total</td>
              <td>{report.totalRow.tables}</td>
              <td>100%</td>
              <td>{report.totalRow.avg}</td>
              <td className="revenue">{report.totalRow.revenue}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function AncillaryDashboard({ report }) {
  return (
    <>
      <PrintSummary report={report} type="ancillary" />

      <div className="metrics">
        {report.cards.map((card) => (
          <RevenueCard key={card.title} {...card} />
        ))}
      </div>

      <div className="content-grid">
        <div className="chart-card">
          <div className="card-header">
            <h2 className="card-title">Ancillary Revenue by Department</h2>
            <span>{report.sourceLabel}</span>
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

function App() {
  const [page, setPage] = useState("food");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [uploads, setUploads] = useState({
    food: [],
    spa: [],
  });
  const [uploadStatus, setUploadStatus] = useState({});
  const [databaseStatus, setDatabaseStatus] = useState("Loading saved reports...");
  const [selections, setSelections] = useState({
    food: "",
    spa: "",
  });
  const [aggregateIntervalDays, setAggregateIntervalDays] = useState(15);

  useEffect(() => {
    let isMounted = true;

    async function loadStoredReports() {
      try {
        const reports = await fetchStoredReports();
        const groupedReports = groupReportsBySection(reports);

        if (!isMounted) return;

        setUploads(groupedReports);
        setSelections({
          food: latestMonthKey(groupedReports.food),
          spa: latestMonthKey(groupedReports.spa),
        });
        setDatabaseStatus(
          reports.length
            ? `${reports.length} saved report(s) loaded from the database.`
            : "Database connected. No saved reports yet.",
        );
      } catch (error) {
        if (!isMounted) return;

        setDatabaseStatus(
          `Report database is not available yet. Start it with npm run server. (${error.message})`,
        );
      }
    }

    loadStoredReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const foodReport = useMemo(() => {
    return createActiveReport(
      uploads.food,
      selections.food,
      "food",
      aggregateIntervalDays,
    );
  }, [uploads.food, selections.food, aggregateIntervalDays]);

  const ancillaryReport = useMemo(() => {
    return createActiveReport(uploads.spa, selections.spa, "spa");
  }, [uploads.spa, selections.spa]);

  const activeReport = page === "food" ? foodReport : ancillaryReport;
  const canExport = page !== "reports" && Boolean(activeReport);

  const handleExport = () => {
    if (!canExport) return;

    window.print();
  };

  const handleUpload = async (target, event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadStatus((current) => ({
      ...current,
      [target]: `Uploading ${files.length} file(s)...`,
    }));

    const savedReports = [];
    const failedUploads = [];

    try {
      for (const file of files) {
        try {
          const parsed = await parseUploadedReport(file);
          const { rows, meta } = parsed;

          if (!rows.length) {
            throw new Error("No data rows were found in the first worksheet.");
          }

          const report =
            target === "food"
              ? createFoodReport(rows, file.name, meta.monthLabel)
              : createAncillaryReport(rows, file.name, meta.monthLabel);
          const uploadRecord = {
            ...meta,
            section: target,
            fileName: file.name,
            rows,
            report,
          };
          const storedReport = await saveStoredReport(uploadRecord);

          savedReports.push(storedReport);
        } catch (error) {
          failedUploads.push(`${file.name}: ${error.message}`);
        }
      }

      if (!savedReports.length) {
        throw new Error(failedUploads.join(" | ") || "No files were saved.");
      }

      setUploads((current) => ({
        ...current,
        [target]: sortReports([
          ...(current[target] || []).filter(
            (reportRecord) =>
              !savedReports.some(
                (storedReport) =>
                  storedReport.monthKey === reportRecord.monthKey,
              ),
          ),
          ...savedReports,
        ]),
      }));
      setSelections((current) => ({
        ...current,
        [target]: sortReports(savedReports).at(-1)?.monthKey || current[target],
      }));
      setUploadStatus((current) => ({
        ...current,
        [target]: failedUploads.length
          ? `${savedReports.length} saved, ${failedUploads.length} failed`
          : `${savedReports.length} file(s) saved`,
      }));
      setDatabaseStatus(`${savedReports.length} report(s) saved to the database.`);
      setPage(target);
    } catch (error) {
      setUploadStatus((current) => ({
        ...current,
        [target]: error.message,
      }));
    } finally {
      event.target.value = "";
    }
  };

  const handleDeleteReport = async (report) => {
    const reportId = report.id || `${report.section}-${report.monthKey}`;

    try {
      await deleteStoredReport(reportId);

      setUploads((current) => {
        const nextReports = (current[report.section] || []).filter(
          (storedReport) =>
            (storedReport.id || `${storedReport.section}-${storedReport.monthKey}`) !==
            reportId,
        );

        return {
          ...current,
          [report.section]: nextReports,
        };
      });
      setSelections((current) => {
        if (current[report.section] !== report.monthKey) return current;

        const remainingReports = (uploads[report.section] || []).filter(
          (storedReport) =>
            (storedReport.id || `${storedReport.section}-${storedReport.monthKey}`) !==
            reportId,
        );

        return {
          ...current,
          [report.section]: latestMonthKey(remainingReports),
        };
      });
      setDatabaseStatus(`${report.monthLabel} deleted from the database.`);
    } catch (error) {
      setDatabaseStatus(`Unable to delete report. ${error.message}`);
    }
  };

  const isFood = page === "food";
  const isReports = page === "reports";
  const activeKey = isFood ? "food" : "spa";
  const activeUploads = uploads[activeKey] || [];
  const activeSelection =
    selections[activeKey] || sortReports(activeUploads).at(-1)?.monthKey || "";
  const activePeriodLabel = activeReport?.periodLabel || "No report selected";
  const isAggregateFoodView =
    isFood && activeSelection.startsWith("last-") && Boolean(foodReport);

  return (
    <div className={`app ${isSidebarOpen ? "sidebar-open" : ""}`}>
      <button
        className="menu-toggle"
        type="button"
        aria-label="Open navigation"
        aria-expanded={isSidebarOpen}
        onClick={() => setIsSidebarOpen((open) => !open)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <button
        className="sidebar-backdrop"
        type="button"
        aria-label="Close navigation"
        onClick={() => setIsSidebarOpen(false)}
      ></button>

      <Sidebar
        selectedPage={page}
        onChangePage={setPage}
        onNavigate={() => setIsSidebarOpen(false)}
      />

      <main className="main">
        {isReports ? (
          <ReportsPage
            uploads={uploads}
            uploadStatus={uploadStatus}
            databaseStatus={databaseStatus}
            onUpload={handleUpload}
            onDelete={handleDeleteReport}
          />
        ) : (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">
                  {isFood ? "Food & Beverage" : "Spa · Banquet · Other"}
                </h1>

                <p className="page-subtitle">
                  {isFood
                    ? "Upload the F&B report to generate channel revenue"
                    : "Upload the ancillary report to generate department revenue"}
                </p>
              </div>

              <div className="header-actions">
                <select
                  className="month-select"
                  disabled={!activeUploads.length}
                  value={activeSelection}
                  onChange={(event) =>
                    setSelections((current) => ({
                      ...current,
                      [activeKey]: event.target.value,
                    }))
                  }
                >
                  {!activeUploads.length ? (
                    <option>No reports uploaded</option>
                  ) : null}

                  {sortReports(activeUploads).map((report) => (
                    <option key={report.monthKey} value={report.monthKey}>
                      {report.monthLabel}
                    </option>
                  ))}

                  {activeUploads.length ? (
                    <>
                      <option value="last-3">Last 3 months</option>
                      <option value="last-6">Last 6 months</option>
                      <option value="last-12">Last 1 year</option>
                    </>
                  ) : null}
                </select>

                {isAggregateFoodView ? (
                  <select
                    className="month-select"
                    value={aggregateIntervalDays}
                    onChange={(event) =>
                      setAggregateIntervalDays(Number(event.target.value))
                    }
                  >
                    <option value={10}>10-day intervals</option>
                    <option value={15}>15-day intervals</option>
                    <option value={31}>Monthly intervals</option>
                  </select>
                ) : null}

                <button className="date-btn">{activePeriodLabel}</button>

                <button
                  className="export-btn"
                  disabled={!canExport}
                  onClick={handleExport}
                >
                  Export PDF
                </button>
              </div>
            </div>

            {isFood && foodReport ? (
              <FoodDashboard report={foodReport} />
            ) : null}

            {!isFood && ancillaryReport ? (
              <AncillaryDashboard report={ancillaryReport} />
            ) : null}

            {isFood && !foodReport ? (
              <EmptyReportState
                title="Food & Beverage"
                onOpenReports={() => setPage("reports")}
              />
            ) : null}

            {!isFood && !ancillaryReport ? (
              <EmptyReportState
                title="Spa · Banquet · Other"
                onOpenReports={() => setPage("reports")}
              />
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
