import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Trash2 } from "lucide-react";

import Sidebar from "./components/molecules/Sidebar/Sidebar";
import EmptyReportState from "./components/molecules/EmptyReportState/EmptyReportState";
import LoadingReportState from "./components/molecules/LoadingReportState/LoadingReportState";
import FoodDashboard from "./pages/FoodDashboard/FoodDashboard";
import AncillaryDashboard from "./pages/AncillaryDashboard/AncillaryDashboard";
import OverviewDashboard from "./pages/OverviewDashboard/OverviewDashboard";
import ReportsPage from "./pages/ReportsPage/ReportsPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import UnderConstructionPage from "./pages/UnderConstructionPage/UnderConstructionPage";

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

const APP_PAGE_OPTIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Executive cumulative overview across uploaded sections.",
    status: "Live",
    detail: "Shows cumulative KPIs, monthly revenue, department mix, and best sales days.",
  },
  {
    key: "rooms",
    label: "Rooms & Occupancy",
    description: "Occupancy, ADR, RevPAR, and room-mix monitoring.",
    status: "Under construction",
    detail: "This page is prepared in navigation and settings, ready for upload-backed room metrics.",
  },
  {
    key: "food",
    label: "Food & Beverage",
    description: "Channel revenue, covers, cheque size, and interval views.",
    status: "Live",
    detail: "Supports single-month and multi-month interval defaults from settings.",
  },
  {
    key: "regions",
    label: "Regions & Sources",
    description: "Geography, source mix, and contribution analysis.",
    status: "Under construction",
    detail: "Navigation is ready, with data views to be connected when region/source uploads are added.",
  },
  {
    key: "spa",
    label: "Spa · Banquet · Other",
    description: "Department revenue and ancillary event performance.",
    status: "Live",
    detail: "Uses uploaded ancillary reports for cards, charts, and event tables.",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Upload, review, filter, and delete stored reports.",
    status: "Live",
    detail: "Controls the persisted report inventory powering all live dashboards.",
  },
  {
    key: "settings",
    label: "Settings",
    description: "Navigation defaults, export behavior, and storage controls.",
    status: "Live",
    detail: "The operational control center for the app shell and report handling.",
  },
];

const SINGLE_MONTH_INTERVAL_OPTIONS = [
  { value: 1, label: "Daily" },
  { value: 2, label: "2-day intervals" },
  { value: 7, label: "Weekly intervals" },
  { value: 10, label: "10-day intervals" },
];

const MULTI_MONTH_INTERVAL_OPTIONS = [
  { value: 10, label: "10-day intervals" },
  { value: 15, label: "15-day intervals" },
  { value: 31, label: "Monthly intervals" },
];

const DEFAULT_SETTINGS = {
  landingPage: "food",
  singleMonthInterval: 1,
  multiMonthInterval: 15,
  replaceOnUpload: "replace",
  includeExecutiveSummary: true,
  includeSourceLabels: true,
  includeExportTimestamp: true,
};

const SETTINGS_STORAGE_KEY = "qualia-dashboard-settings";

const readDashboardSettings = () => {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

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

const formatTrendRangeLabel = (reports = []) => {
  if (!reports.length) return "";

  const first = reports[0];
  const last = reports.at(-1);

  if (!first || !last) return "";

  const firstMonth = (first.monthShort || first.monthLabel || "").split(" ")[0];
  const lastMonth = (last.monthShort || last.monthLabel || "").split(" ")[0];

  if (first.year === last.year) {
    return `${firstMonth}-${lastMonth} ${last.year}`;
  }

  return `${firstMonth} ${first.year}-${lastMonth} ${last.year}`;
};

const formatPercentDelta = (value) => {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
  const trimmed = rounded.endsWith(".0") ? rounded.slice(0, -2) : rounded;
  return `${value >= 0 ? "+" : ""}${trimmed}%`;
};

const calculatePercentDelta = (current, previous) => {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  if (!Number.isFinite(current)) return null;

  return ((current - previous) / previous) * 100;
};

const extractFoodMetrics = (report) => {
  const revenue = (report?.channelRows || []).reduce(
    (total, row) => total + (row.revenue || 0),
    0,
  );
  const tables = (report?.channelRows || []).reduce(
    (total, row) => total + (row.tables || 0),
    0,
  );
  const avgCheque = revenue / (tables || 1);

  return {
    revenue,
    tables,
    avgCheque,
  };
};

const buildTrendMeta = (current, previous, label) => {
  const delta = calculatePercentDelta(current, previous);

  if (delta === null) {
    return {
      growth: "No prior month",
      subtitle: "",
      trendTone: "muted",
    };
  }

  return {
    growth: formatPercentDelta(delta),
    subtitle: label,
    trendTone: delta < 0 ? "negative" : delta > 0 ? "positive" : "muted",
  };
};

const applyFoodCardTrends = (report, reports, selection) => {
  if (!report) return report;

  const selectedReports = getSelectedReports(reports, selection);
  if (!selectedReports.length) return report;

  const currentMetrics = extractFoodMetrics(report);
  let comparisonReport;
  let comparisonLabel;

  if (selectedReports.length === 1) {
    const currentMonthKey = selectedReports[0].monthKey;
    comparisonReport = sortReports(reports)
      .filter((item) => item.monthKey < currentMonthKey)
      .at(-1);
    comparisonLabel = comparisonReport
      ? `vs ${comparisonReport.monthShort || comparisonReport.monthLabel}`
      : "";
  } else {
    comparisonReport = selectedReports[0];
    comparisonLabel = formatTrendRangeLabel(selectedReports);
  }

  const comparisonMetrics = comparisonReport
    ? extractFoodMetrics(comparisonReport.report)
    : null;

  const revenueTrend = buildTrendMeta(
    currentMetrics.revenue,
    comparisonMetrics?.revenue,
    selectedReports.length === 1 ? comparisonLabel : `trend ${comparisonLabel}`,
  );
  const coversTrend = buildTrendMeta(
    currentMetrics.tables,
    comparisonMetrics?.tables,
    selectedReports.length === 1 ? comparisonLabel : `trend ${comparisonLabel}`,
  );
  const avgTrend = buildTrendMeta(
    currentMetrics.avgCheque,
    comparisonMetrics?.avgCheque,
    selectedReports.length === 1 ? comparisonLabel : `trend ${comparisonLabel}`,
  );

  return {
    ...report,
    cards: report.cards.map((card) => {
      if (card.title === "F&B Revenue") {
        return {
          ...card,
          ...revenueTrend,
        };
      }

      if (card.title === "Total Covers") {
        return {
          ...card,
          ...coversTrend,
        };
      }

      if (card.title === "Avg. Cheque") {
        return {
          ...card,
          ...avgTrend,
        };
      }

      return card;
    }),
  };
};

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

const bucketSingleFoodDailyData = (dailyData, channelRows, intervalDays, periodLabel) => {
  if (!Array.isArray(dailyData) || !dailyData.length) return [];

  const bucketMap = new Map();
  const monthToken = (periodLabel || "").split(" ")[0] || "Period";

  dailyData.forEach((row) => {
    const dayNumber = Number(String(row.day).match(/\d{1,2}/)?.[0] || 1);
    const bucketStart = Math.floor((dayNumber - 1) / intervalDays) * intervalDays + 1;
    const bucketEnd = Math.min(bucketStart + intervalDays - 1, 31);
    const bucketKey = `${bucketStart}-${bucketEnd}`;
    const bucket = bucketMap.get(bucketKey) || {
      day: `${monthToken} ${bucketStart}-${bucketEnd}`,
    };

    channelRows.forEach((channel) => {
      bucket[channel.key] = (bucket[channel.key] || 0) + (row[channel.key] || 0);
    });

    bucketMap.set(bucketKey, bucket);
  });

  return [...bucketMap.values()];
};

const getFoodReportRevenue = (report) =>
  (report?.channelRows || []).reduce((total, row) => total + (row.revenue || 0), 0);

const getAncillaryReportRevenue = (report) =>
  (report?.chartData || []).reduce(
    (total, row) => total + (Number(row.revenue || 0) * 100000 || 0),
    0,
  );

const buildOverviewReport = (uploads) => {
  const foodReports = sortReports(uploads.food || []);
  const spaReports = sortReports(uploads.spa || []);

  if (!foodReports.length && !spaReports.length) return null;

  const totalFoodRevenue = foodReports.reduce(
    (total, uploadedReport) => total + getFoodReportRevenue(uploadedReport.report),
    0,
  );
  const totalAncillaryRevenue = spaReports.reduce(
    (total, uploadedReport) => total + getAncillaryReportRevenue(uploadedReport.report),
    0,
  );
  const totalRevenue = totalFoodRevenue + totalAncillaryRevenue;

  const sectionRows = [
    {
      key: "food",
      name: "Food & Beverage",
      revenue: totalFoodRevenue,
      share: totalRevenue ? (totalFoodRevenue / totalRevenue) * 100 : 0,
    },
    {
      key: "spa",
      name: "Spa · Banquet · Other",
      revenue: totalAncillaryRevenue,
      share: totalRevenue ? (totalAncillaryRevenue / totalRevenue) * 100 : 0,
    },
  ].filter((row) => row.revenue > 0);

  const topSection =
    [...sectionRows].sort((a, b) => b.revenue - a.revenue)[0] || sectionRows[0];

  const monthlyMap = new Map();

  foodReports.forEach((uploadedReport) => {
    const revenue = getFoodReportRevenue(uploadedReport.report);
    const current = monthlyMap.get(uploadedReport.monthKey) || {
      name: uploadedReport.monthShort || uploadedReport.monthLabel,
      revenue: 0,
    };

    current.revenue += revenue;
    monthlyMap.set(uploadedReport.monthKey, current);
  });

  spaReports.forEach((uploadedReport) => {
    const revenue = getAncillaryReportRevenue(uploadedReport.report);
    const current = monthlyMap.get(uploadedReport.monthKey) || {
      name: uploadedReport.monthShort || uploadedReport.monthLabel,
      revenue: 0,
    };

    current.revenue += revenue;
    monthlyMap.set(uploadedReport.monthKey, current);
  });

  const monthlyRevenue = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
  const bestMonth =
    [...monthlyRevenue].sort((a, b) => b.revenue - a.revenue)[0] || monthlyRevenue[0];

  const departmentMap = new Map();
  if (totalFoodRevenue > 0) {
    departmentMap.set("Food & Beverage", totalFoodRevenue);
  }

  spaReports.forEach((uploadedReport) => {
    uploadedReport.report.chartData.forEach((row) => {
      departmentMap.set(
        row.name,
        (departmentMap.get(row.name) || 0) + Number(row.revenue || 0) * 100000,
      );
    });
  });

  const departmentData = [...departmentMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const bestSalesDays = foodReports
    .flatMap((uploadedReport) =>
      (uploadedReport.report.dailyData || []).map((row) => {
        const revenue = (uploadedReport.report.channelRows || []).reduce(
          (total, channel) => total + (row[channel.key] || 0),
          0,
        );
        const topChannel =
          [...(uploadedReport.report.channelRows || [])].sort(
            (a, b) => (row[b.key] || 0) - (row[a.key] || 0),
          )[0] || {};

        return {
          label: `${row.day} ${uploadedReport.monthShort || uploadedReport.monthLabel}`,
          section: "Food & Beverage",
          revenue,
          topChannel: topChannel.name || "-",
          formattedRevenue: formatCurrency(revenue),
        };
      }),
    )
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    cards: [
      {
        title: "Total Revenue",
        value: formatCompactCurrency(totalRevenue),
        growth: `${foodReports.length + spaReports.length} uploaded reports`,
        subtitle: "",
        trendTone: "muted",
      },
      {
        title: "Food & Beverage",
        value: formatCompactCurrency(totalFoodRevenue),
        growth: totalRevenue
          ? `${((totalFoodRevenue / totalRevenue) * 100).toFixed(1)}% share`
          : "No contribution yet",
        subtitle: "",
        trendTone: "muted",
      },
      {
        title: "Spa · Banquet · Other",
        value: formatCompactCurrency(totalAncillaryRevenue),
        growth: totalRevenue
          ? `${((totalAncillaryRevenue / totalRevenue) * 100).toFixed(1)}% share`
          : "No contribution yet",
        subtitle: "",
        trendTone: "muted",
      },
      {
        title: "Leading Section",
        value: topSection?.name || "-",
        growth: topSection ? formatCurrency(topSection.revenue) : "No data yet",
        subtitle: topSection ? `${topSection.share.toFixed(1)}% of total` : "",
        trendTone: "muted",
      },
      {
        title: "Best Month",
        value: bestMonth?.name || "-",
        growth: bestMonth ? formatCurrency(bestMonth.revenue) : "No data yet",
        subtitle: "highest combined revenue",
        trendTone: "muted",
      },
    ],
    monthlyRevenue,
    sectionRows,
    departmentData,
    bestSalesDays,
  };
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
  if (selected.length === 1) {
    const baseReport = selected[0].report;

    if (type !== "food") return baseReport;

    return {
      ...baseReport,
      dailyData: bucketSingleFoodDailyData(
        baseReport.dailyData,
        baseReport.channelRows,
        intervalDays,
        baseReport.periodLabel,
      ),
      sourceLabel: `${baseReport.sourceLabel} · ${formatIntervalLabel(intervalDays)}`,
    };
  }

  const periodLabel = getSelectionLabel(reports, selection);
  return type === "food"
    ? sumFoodReports(selected, periodLabel, intervalDays)
    : sumAncillaryReports(selected, periodLabel);
};

function App() {
  const [settings, setSettings] = useState(readDashboardSettings);
  const [page, setPage] = useState(() => readDashboardSettings().landingPage);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [uploads, setUploads] = useState({
    food: [],
    spa: [],
  });
  const [uploadStatus, setUploadStatus] = useState({});
  const [databaseStatus, setDatabaseStatus] = useState("Loading saved reports...");
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [selections, setSelections] = useState({
    food: "",
    spa: "",
  });
  const [aggregateIntervalDays, setAggregateIntervalDays] = useState(
    () => readDashboardSettings().singleMonthInterval,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

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
        setIsLoadingReports(false);
      } catch (error) {
        if (!isMounted) return;

        setDatabaseStatus(
          `Report database is not available yet. Start it with npm run server. (${error.message})`,
        );
        setIsLoadingReports(false);
      }
    }

    loadStoredReports();

    return () => {
      isMounted = false;
    };
  }, []);

  const foodReport = useMemo(() => {
    const report = createActiveReport(
      uploads.food,
      selections.food,
      "food",
      aggregateIntervalDays,
    );

    return applyFoodCardTrends(report, uploads.food, selections.food);
  }, [uploads.food, selections.food, aggregateIntervalDays]);

  const ancillaryReport = useMemo(() => {
    return createActiveReport(uploads.spa, selections.spa, "spa");
  }, [uploads.spa, selections.spa]);

  const overviewReport = useMemo(() => buildOverviewReport(uploads), [uploads]);

  const activeReport =
    page === "dashboard"
      ? overviewReport
      : page === "food"
        ? foodReport
        : ancillaryReport;
  const canExport =
    page !== "reports" && page !== "settings" && Boolean(activeReport);

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
          const existingMonth = (uploads[target] || []).find(
            (storedReport) => storedReport.monthKey === meta.monthKey,
          );

          if (
            existingMonth &&
            settings.replaceOnUpload === "confirm" &&
            !window.confirm(
              `Replace the existing ${meta.monthLabel} report for ${
                target === "food" ? "Food & Beverage" : "Spa · Banquet · Other"
              }?`,
            )
          ) {
            failedUploads.push(`${file.name}: skipped replacement`);
            continue;
          }

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

  const handleClearReports = async (section) => {
    const scopedReports = section
      ? uploads[section] || []
      : [...(uploads.food || []), ...(uploads.spa || [])];

    if (!scopedReports.length) {
      setDatabaseStatus("No saved reports to clear.");
      return;
    }

    const label =
      section === "food"
        ? "all Food & Beverage reports"
        : section === "spa"
          ? "all Spa · Banquet · Other reports"
          : "all saved reports";

    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(
        scopedReports.map((report) =>
          deleteStoredReport(report.id || `${report.section}-${report.monthKey}`),
        ),
      );

      if (section) {
        setUploads((current) => ({
          ...current,
          [section]: [],
        }));
        setSelections((current) => ({
          ...current,
          [section]: "",
        }));
      } else {
        setUploads({ food: [], spa: [] });
        setSelections({ food: "", spa: "" });
      }

      setDatabaseStatus(`Cleared ${label}.`);
    } catch (error) {
      setDatabaseStatus(`Unable to clear reports. ${error.message}`);
    }
  };

  const isFood = page === "food";
  const isReports = page === "reports";
  const isSettings = page === "settings";
  const isConstructionPage = ["rooms", "regions"].includes(page);
  const activeKey = isFood ? "food" : "spa";
  const activeUploads = uploads[activeKey] || [];
  const activeSelection =
    selections[activeKey] || sortReports(activeUploads).at(-1)?.monthKey || "";
  const activePeriodLabel = activeReport?.periodLabel || "No report selected";
  const pageViewKey = isReports ? "reports" : page;
  const isFoodAggregateSelection = isFood && activeSelection.startsWith("last-");
  const foodIntervalOptions = isFoodAggregateSelection
    ? MULTI_MONTH_INTERVAL_OPTIONS
    : SINGLE_MONTH_INTERVAL_OPTIONS;
  const reportCounts = {
    food: uploads.food.length,
    spa: uploads.spa.length,
    total: uploads.food.length + uploads.spa.length,
  };

  useEffect(() => {
    if (!isFood) return;

    const fallbackValue = isFoodAggregateSelection
      ? settings.multiMonthInterval
      : settings.singleMonthInterval;
    const allowedValues = new Set(foodIntervalOptions.map((option) => option.value));

    if (!allowedValues.has(aggregateIntervalDays) && fallbackValue) {
      setAggregateIntervalDays(fallbackValue);
    }
  }, [
    aggregateIntervalDays,
    foodIntervalOptions,
    isFood,
    isFoodAggregateSelection,
    settings.multiMonthInterval,
    settings.singleMonthInterval,
  ]);

  return (
    <div className={`app ${isMobileNavOpen ? "mobile-nav-open" : ""}`}>
      <Sidebar
        mobileNavOpen={isMobileNavOpen}
        onToggleMobileNav={() => setIsMobileNavOpen((open) => !open)}
        selectedPage={page}
        onChangePage={setPage}
        onNavigate={() => setIsMobileNavOpen(false)}
      />

      <main className="main">
        <div className="page-transition" key={pageViewKey}>
          {isReports ? (
            <ReportsPage
              uploads={uploads}
              uploadStatus={uploadStatus}
              databaseStatus={databaseStatus}
              onUpload={handleUpload}
              renderDeleteAction={(report) => (
                <button
                  className="danger-btn icon-only-btn"
                  aria-label={`Delete ${report.monthLabel} report`}
                  title={`Delete ${report.monthLabel} report`}
                  type="button"
                  onClick={() => handleDeleteReport(report)}
                >
                  <Trash2 size={16} strokeWidth={2.2} />
                </button>
              )}
            />
          ) : isSettings ? (
            <SettingsPage
              settings={settings}
              databaseStatus={databaseStatus}
              reportCounts={reportCounts}
              pageOptions={APP_PAGE_OPTIONS}
              onChangeSetting={(key, value) =>
                setSettings((current) => ({
                  ...current,
                  [key]: value,
                }))
              }
              onClearAllReports={() => handleClearReports()}
              onClearSectionReports={handleClearReports}
            />
          ) : page === "dashboard" ? (
            isLoadingReports ? (
              <LoadingReportState />
            ) : overviewReport ? (
              <OverviewDashboard report={overviewReport} onExport={handleExport} />
            ) : (
              <EmptyReportState
                title="Dashboard"
                onOpenReports={() => setPage("reports")}
              />
            )
          ) : isConstructionPage ? (
            <UnderConstructionPage
              title={
                page === "rooms" ? "Rooms & Occupancy" : "Regions & Sources"
              }
              punchline={
                page === "rooms"
                  ? "This wing is being readied for check-in."
                  : "The map room is still pinning the routes."
              }
              detail={
                page === "rooms"
                  ? "Occupancy, ADR, RevPAR, and room mix views will appear here."
                  : "Geography, source mix, and channel contribution views will appear here."
              }
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

                  <button className="date-btn">
                    <CalendarDays size={16} strokeWidth={2.2} />
                    <span>{activePeriodLabel}</span>
                  </button>

                  <button
                    className="export-btn"
                    disabled={!canExport}
                    onClick={handleExport}
                  >
                    <FileText size={16} strokeWidth={2.2} />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              {isFood && foodReport ? (
                <FoodDashboard
                  report={foodReport}
                  aggregateIntervalDays={aggregateIntervalDays}
                  intervalOptions={foodIntervalOptions}
                  includeExecutiveSummary={settings.includeExecutiveSummary}
                  includeExportTimestamp={settings.includeExportTimestamp}
                  includeSourceLabels={settings.includeSourceLabels}
                  onChangeAggregateInterval={setAggregateIntervalDays}
                />
              ) : null}

              {!isFood && ancillaryReport ? (
                <AncillaryDashboard
                  report={ancillaryReport}
                  includeExecutiveSummary={settings.includeExecutiveSummary}
                  includeExportTimestamp={settings.includeExportTimestamp}
                  includeSourceLabels={settings.includeSourceLabels}
                />
              ) : null}

              {isLoadingReports ? <LoadingReportState /> : null}

              {isFood && !foodReport && !isLoadingReports ? (
                <EmptyReportState
                  title="Food & Beverage"
                  onOpenReports={() => setPage("reports")}
                />
              ) : null}

              {!isFood && !ancillaryReport && !isLoadingReports ? (
                <EmptyReportState
                  title="Spa · Banquet · Other"
                  onOpenReports={() => setPage("reports")}
                />
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
