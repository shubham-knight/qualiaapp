import { strFromU8, unzipSync } from "fflate";

const CHANNELS = [
  {
    key: "walkIn",
    name: "Walk-in / In-house",
    dot: "green",
    aliases: [
      "walkin",
      "walk in",
      "inhouse",
      "in house",
      "restaurant",
      "n r",
      "nr",
      "n.r.",
      "n.r",
    ],
  },
  {
    key: "zomato",
    name: "Zomato",
    dot: "gold",
    aliases: ["zomato"],
  },
  {
    key: "swiggy",
    name: "Swiggy",
    dot: "orange",
    aliases: ["swiggy"],
  },
  {
    key: "dineout",
    name: "Dineout",
    dot: "blue",
    aliases: ["dineout", "dine out"],
  },
  {
    key: "eazyDinner",
    name: "EazyDinner",
    dot: "sage",
    aliases: ["eazydinner", "eazy dinner", "eazydiner", "eazy diner"],
  },
];

const DEPARTMENTS = [
  "Banquet & Events",
  "Spa & Wellness",
  "Recreation",
  "Laundry & Misc",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ");

const toKey = (value) => normalize(value).replace(/\s/g, "");

const getValue = (row, candidates) => {
  const entries = Object.entries(row);
  const match = entries.find(([key]) =>
    candidates.some((candidate) => toKey(key).includes(toKey(candidate))),
  );

  return match?.[1];
};

const parseNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value || "")
    .replace(/[₹,%\s]/g, "")
    .replace(/,/g, "")
    .replace(/[()]/g, "-")
    .replace(/[^0-9.-]/g, "");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));

const formatCompactCurrency = (value) => {
  const amount = value || 0;

  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }

  return formatCurrency(amount);
};

const inferMonthInfo = (value, fallbackName = "") => {
  const source = `${value || ""} ${fallbackName}`.trim();
  const monthMatch = source.match(
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*/i,
  );
  const yearMatch = source.match(/20\d{2}|\b\d{2}\b/);
  const monthIndex = monthMatch
    ? [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ].findIndex((month) =>
        monthMatch[0].toLowerCase().startsWith(month),
      )
    : new Date().getMonth();
  const rawYear = yearMatch?.[0];
  const year = rawYear
    ? rawYear.length === 2
      ? 2000 + Number(rawYear)
      : Number(rawYear)
    : new Date().getFullYear();
  const monthName = MONTHS[monthIndex] || MONTHS[new Date().getMonth()];

  return {
    monthIndex,
    year,
    monthKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    monthLabel: `${monthName} ${year}`,
    monthShort: `${monthName.slice(0, 3)} ${year}`,
  };
};

const excelSerialToDate = (serial) => {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
};

const formatDay = (value, fallbackIndex = 1) => {
  if (typeof value === "number" && value > 31) {
    return String(excelSerialToDate(value).getUTCDate()).padStart(2, "0");
  }

  if (value instanceof Date) {
    return String(value.getDate()).padStart(2, "0");
  }

  const text = String(value || "").trim();
  const parsed = Date.parse(text);

  if (!Number.isNaN(parsed) && /[a-z/-]/i.test(text)) {
    return String(new Date(parsed).getDate()).padStart(2, "0");
  }

  const numeric = text.match(/\d{1,2}/)?.[0];
  return String(numeric || fallbackIndex).padStart(2, "0");
};

const parseCsv = (text, fileName) => {
  const rows = [];
  let current = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current);
  rows.push(row);

  return {
    rows: gridToObjects(rows),
    meta: inferMonthInfo(rows[0]?.join(" "), fileName),
  };
};

const createHeaders = (headerRow) => {
  let previousTableName = "";
  const seen = new Map();

  return headerRow.map((header, index) => {
    const originalHeader = String(header || `Column ${index + 1}`).trim();
    const normalizedHeader = toKey(originalHeader);
    let resolvedHeader = originalHeader;

    if (normalizedHeader.includes("table")) {
      previousTableName = originalHeader.replace(/table/gi, "").trim();
      resolvedHeader = `${previousTableName || originalHeader} Table`;
    } else if (normalizedHeader.includes("amount")) {
      resolvedHeader = previousTableName
        ? `${previousTableName} Amount`
        : originalHeader;
    }

    const count = seen.get(resolvedHeader) || 0;
    seen.set(resolvedHeader, count + 1);

    return count ? `${resolvedHeader} ${count + 1}` : resolvedHeader;
  });
};

const findHeaderIndex = (rows) => {
  const reportHeaderIndex = rows.findIndex((row) => {
    const normalizedCells = row.map(toKey);

    return (
      normalizedCells.some((cell) => cell.includes("date")) &&
      normalizedCells.some((cell) => cell.includes("table")) &&
      normalizedCells.some((cell) => cell.includes("amount"))
    );
  });

  return reportHeaderIndex >= 0 ? reportHeaderIndex : 0;
};

const gridToObjects = (grid) => {
  const compact = grid.filter((row) =>
    row.some((cell) => String(cell || "").trim()),
  );

  if (compact.length < 2) return [];

  const headerIndex = findHeaderIndex(compact);
  const headers = createHeaders(compact[headerIndex]);

  return compact.slice(headerIndex + 1).map((row) =>
    headers.reduce((object, header, index) => {
      object[header] = row[index] ?? "";
      return object;
    }, {}),
  );
};

const readXml = (files, path) =>
  files[path] ? strFromU8(files[path]) : "";

const parseSharedStrings = (files) => {
  const xml = readXml(files, "xl/sharedStrings.xml");
  if (!xml) return [];

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.querySelectorAll("si")].map((item) =>
    [...item.querySelectorAll("t")].map((node) => node.textContent).join(""),
  );
};

const parseCellValue = (cell, sharedStrings) => {
  const type = cell.getAttribute("t");
  const value = cell.querySelector("v")?.textContent || "";

  if (type === "s") return sharedStrings[Number(value)] || "";
  if (type === "inlineStr") return cell.querySelector("t")?.textContent || "";
  if (type === "b") return value === "1";

  const numeric = Number(value);
  return Number.isFinite(numeric) && value !== "" ? numeric : value;
};

const columnIndex = (cellRef) => {
  const letters = String(cellRef || "A").match(/[A-Z]+/)?.[0] || "A";
  return [...letters].reduce(
    (total, letter) => total * 26 + letter.charCodeAt(0) - 64,
    0,
  ) - 1;
};

const parseXlsx = async (file) => {
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const sharedStrings = parseSharedStrings(files);
  const sheetPaths = Object.keys(files)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
    .sort();

  for (const path of sheetPaths) {
    const xml = readXml(files, path);
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const grid = [...doc.querySelectorAll("sheetData row")].map((row) => {
      const cells = [];

      row.querySelectorAll("c").forEach((cell) => {
        cells[columnIndex(cell.getAttribute("r"))] = parseCellValue(
          cell,
          sharedStrings,
        );
      });

      return cells;
    });
    const rows = gridToObjects(grid);

    if (rows.length) {
      return {
        rows,
        meta: inferMonthInfo(grid[0]?.join(" "), file.name),
      };
    }
  }

  return {
    rows: [],
    meta: inferMonthInfo("", file.name),
  };
};

export const parseUploadedReport = async (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return parseCsv(await file.text(), file.name);
  }

  if (["xlsx", "xlsm", "xltx", "xltm"].includes(extension)) {
    return parseXlsx(file);
  }

  throw new Error("Upload a .xlsx or .csv report file.");
};

const resolveChannel = (value) => {
  const normalized = normalize(value);
  return CHANNELS.find((channel) =>
    [channel.name, ...channel.aliases].some((alias) =>
      normalized.includes(normalize(alias)),
    ),
  );
};

const emptyDay = (day) =>
  CHANNELS.reduce(
    (row, channel) => {
      row[channel.key] = 0;
      return row;
    },
    { day },
  );

const getChannelColumnPairs = (row) =>
  CHANNELS.map((channel) => {
    const entries = Object.entries(row);
    const matchesChannel = (header) =>
      [channel.name, ...channel.aliases].some((alias) =>
        normalize(header).includes(normalize(alias)),
      );

    return {
      ...channel,
      tableKey: entries.find(
        ([header]) => matchesChannel(header) && toKey(header).includes("table"),
      )?.[0],
      amountKey: entries.find(
        ([header]) => matchesChannel(header) && toKey(header).includes("amount"),
      )?.[0],
    };
  }).filter((channel) => channel.tableKey && channel.amountKey);

const isTotalRow = (row) =>
  normalize(getValue(row, ["date", "day"]) || Object.values(row)[0]).includes(
    "total",
  );

const rowHasWideFoodColumns = (row) => getChannelColumnPairs(row).length > 0;

const createWideFoodReport = (rows, sourceName, periodLabel = "Selected period") => {
  const columns = getChannelColumnPairs(rows[0] || {});
  const totalRow = rows.find(isTotalRow) || rows.at(-1) || {};
  const dailyMap = new Map();
  let currentDay = "";

  rows.forEach((row, index) => {
    if (isTotalRow(row)) return;

    const rawDate = getValue(row, ["date", "day"]) || Object.values(row)[0];

    if (rawDate && rawDate !== "-") {
      currentDay = formatDay(rawDate, index + 1);
    }

    if (!currentDay) return;

    const daily = dailyMap.get(currentDay) || emptyDay(currentDay);

    columns.forEach((channel) => {
      daily[channel.key] += parseNumber(row[channel.amountKey]);
    });

    dailyMap.set(currentDay, daily);
  });

  const channelRows = CHANNELS.map((channel) => {
    const pair = columns.find((column) => column.key === channel.key);
    const tables = pair ? parseNumber(totalRow[pair.tableKey]) : 0;
    const revenue = pair ? parseNumber(totalRow[pair.amountKey]) : 0;

    return {
      ...channel,
      tables,
      revenue,
    };
  });
  const totalRevenue = channelRows.reduce((total, row) => total + row.revenue, 0);
  const totalTables = channelRows.reduce((total, row) => total + row.tables, 0);
  const bestChannel =
    [...channelRows].sort((a, b) => b.revenue - a.revenue)[0] || channelRows[0];
  const dailyRows = [...dailyMap.values()].sort(
    (a, b) => Number(a.day) - Number(b.day),
  );
  const peakDay =
    [...dailyRows].sort(
      (a, b) =>
        CHANNELS.reduce((total, channel) => total + b[channel.key], 0) -
        CHANNELS.reduce((total, channel) => total + a[channel.key], 0),
    )[0] || emptyDay("01");
  const peakRevenue = CHANNELS.reduce(
    (total, channel) => total + peakDay[channel.key],
    0,
  );

  return {
    cards: [
      {
        title: "F&B Revenue",
        value: formatCompactCurrency(totalRevenue),
        growth: "Uploaded",
        subtitle: sourceName,
      },
      {
        title: "Total Covers",
        value: String(totalTables),
        growth: "Tables",
        subtitle: "from total row",
      },
      {
        title: "Avg. Cheque",
        value: formatCurrency(totalRevenue / (totalTables || 1)),
        growth: "Revenue / covers",
        subtitle: "",
      },
      {
        title: "Best Channel",
        value: bestChannel.name.split(" / ")[0],
        growth: formatCompactCurrency(bestChannel.revenue),
        subtitle: totalRevenue
          ? `${((bestChannel.revenue / totalRevenue) * 100).toFixed(0)}%`
          : "0%",
      },
      {
        title: "Peak Day",
        value: `${peakDay.day} ${periodLabel.split(" ")[0]}`,
        growth: formatCompactCurrency(peakRevenue),
        subtitle: "daily high",
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
    dailyData: dailyRows,
    periodLabel,
    sourceLabel: `Source: ${sourceName} · ${periodLabel}`,
    totalRow: {
      tables: totalTables,
      avg: formatCurrency(totalRevenue / (totalTables || 1)),
      revenue: formatCurrency(totalRevenue),
    },
  };
};

export const createFoodReport = (
  rows,
  sourceName = "uploaded report",
  periodLabel = "Selected period",
) => {
  if (rowHasWideFoodColumns(rows[0] || {})) {
    return createWideFoodReport(rows, sourceName, periodLabel);
  }

  const dailyMap = new Map();
  const channelMap = new Map(
    CHANNELS.map((channel) => [
      channel.key,
      { ...channel, tables: 0, revenue: 0 },
    ]),
  );

  rows.forEach((row, index) => {
    const day = formatDay(
      getValue(row, ["date", "day", "bill date", "order date"]),
      index + 1,
    );
    const daily = dailyMap.get(day) || emptyDay(day);
    const channelValue = getValue(row, ["channel", "source", "platform"]);
    const explicitChannel = resolveChannel(channelValue);
    const tables = parseNumber(getValue(row, ["tables", "covers", "orders"]));

    if (explicitChannel) {
      const revenue = parseNumber(
        getValue(row, ["revenue", "amount", "sales", "net sales", "total"]),
      );
      const channel = channelMap.get(explicitChannel.key);
      channel.revenue += revenue;
      channel.tables += tables || 1;
      daily[explicitChannel.key] += revenue;
    } else {
      CHANNELS.forEach((channelConfig) => {
        const revenue = parseNumber(
          getValue(row, [channelConfig.name, ...channelConfig.aliases]),
        );

        if (!revenue) return;

        const channel = channelMap.get(channelConfig.key);
        channel.revenue += revenue;
        channel.tables += tables;
        daily[channelConfig.key] += revenue;
      });
    }

    dailyMap.set(day, daily);
  });

  const channelRows = [...channelMap.values()];
  const totalRevenue = channelRows.reduce((total, row) => total + row.revenue, 0);
  const totalTables = channelRows.reduce((total, row) => total + row.tables, 0);
  const bestChannel =
    [...channelRows].sort((a, b) => b.revenue - a.revenue)[0] || channelRows[0];
  const dailyRows = [...dailyMap.values()].sort(
    (a, b) => Number(a.day) - Number(b.day),
  );
  const peakDay =
    [...dailyRows].sort(
      (a, b) =>
        CHANNELS.reduce((total, channel) => total + b[channel.key], 0) -
        CHANNELS.reduce((total, channel) => total + a[channel.key], 0),
    )[0] || emptyDay("01");
  const peakRevenue = CHANNELS.reduce(
    (total, channel) => total + peakDay[channel.key],
    0,
  );

  return {
    cards: [
      {
        title: "F&B Revenue",
        value: formatCompactCurrency(totalRevenue),
        growth: "Uploaded",
        subtitle: sourceName,
      },
      {
        title: "Total Covers",
        value: String(totalTables || rows.length),
        growth: "Rows",
        subtitle: String(rows.length),
      },
      {
        title: "Avg. Cheque",
        value: formatCurrency(totalRevenue / (totalTables || rows.length || 1)),
        growth: "Calculated",
        subtitle: "from upload",
      },
      {
        title: "Best Channel",
        value: bestChannel.name.split(" / ")[0],
        growth: formatCompactCurrency(bestChannel.revenue),
        subtitle: totalRevenue
          ? `${((bestChannel.revenue / totalRevenue) * 100).toFixed(0)}%`
          : "0%",
      },
      {
        title: "Peak Day",
        value: `${peakDay.day} ${periodLabel.split(" ")[0]}`,
        growth: formatCompactCurrency(peakRevenue),
        subtitle: "daily high",
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
    dailyData: dailyRows,
    periodLabel,
    sourceLabel: `Source: ${sourceName} · ${periodLabel}`,
    totalRow: {
      tables: totalTables,
      avg: formatCurrency(totalRevenue / (totalTables || rows.length || 1)),
      revenue: formatCurrency(totalRevenue),
    },
  };
};

const resolveDepartment = (value) => {
  const normalized = normalize(value);
  return (
    DEPARTMENTS.find((department) => normalized.includes(normalize(department))) ||
    value ||
    "Other"
  );
};

export const createAncillaryReport = (
  rows,
  sourceName = "uploaded report",
  periodLabel = "Selected period",
) => {
  const departmentMap = new Map();
  const events = [];

  rows.forEach((row, index) => {
    const department = resolveDepartment(
      getValue(row, ["department", "section", "category", "revenue centre"]),
    );
    const revenue = parseNumber(
      getValue(row, ["revenue", "amount", "sales", "net sales", "total"]),
    );
    const count = parseNumber(
      getValue(row, ["sessions", "pax", "count", "orders", "covers"]),
    );
    const current = departmentMap.get(department) || {
      name: department,
      revenue: 0,
      count: 0,
    };

    current.revenue += revenue;
    current.count += count;
    departmentMap.set(department, current);

    const eventName = getValue(row, ["event", "booking", "function", "name"]);

    if (eventName || department.toLowerCase().includes("banquet")) {
      events.push({
        event: eventName || `${department} row ${index + 1}`,
        pax: count,
        revenue: formatCurrency(revenue),
      });
    }
  });

  const departments = [...departmentMap.values()].sort(
    (a, b) => b.revenue - a.revenue,
  );

  return {
    cards: departments.slice(0, 4).map((department) => ({
      title: department.name,
      value: formatCompactCurrency(department.revenue),
      growth: "Uploaded",
      subtitle: department.count ? `${department.count} records` : sourceName,
    })),
    chartData: departments.map((department) => ({
      name: department.name,
      revenue: Number((department.revenue / 100000).toFixed(2)),
    })),
    events,
    periodLabel,
    sourceLabel: `Source: ${sourceName} · ${periodLabel}`,
  };
};
