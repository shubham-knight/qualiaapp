import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const distDir = join(dirname(__dirname), "dist");
const dbPath = process.env.REPORTS_DB_PATH || join(dataDir, "reports.json");
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "127.0.0.1";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

async function readReports() {
  try {
    const contents = await readFile(dbPath, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeReports(reports) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dbPath, JSON.stringify(reports, null, 2));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

async function sendStaticFile(response, filePath) {
  const extension = extname(filePath);
  const content = await readFile(filePath);

  response.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
  });
  response.end(content);
}

async function handleStaticRequest(url, response) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = join(distDir, safePath);

  try {
    const requestedStat = await stat(requestedPath);

    if (requestedStat.isFile()) {
      await sendStaticFile(response, requestedPath);
      return true;
    }
  } catch {
    // Fall back to index.html for SPA routes or missing assets.
  }

  try {
    await sendStaticFile(response, join(distDir, "index.html"));
    return true;
  } catch {
    return false;
  }
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 50 * 1024 * 1024) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function normalizeReport(payload) {
  if (!payload.section || !payload.monthKey || !payload.report) {
    throw new Error("section, monthKey, and report are required.");
  }

  const now = new Date().toISOString();

  return {
    id: `${payload.section}-${payload.monthKey}`,
    section: payload.section,
    monthKey: payload.monthKey,
    monthLabel: payload.monthLabel,
    monthShort: payload.monthShort,
    monthIndex: payload.monthIndex,
    year: payload.year,
    fileName: payload.fileName,
    rows: payload.rows || [],
    report: payload.report,
    createdAt: payload.createdAt || now,
    updatedAt: now,
  };
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    sendJson(response, 200, {});
    return;
  }

  try {
    if (request.method === "GET" && url.pathname === "/api/reports") {
      const section = url.searchParams.get("section");
      const reports = await readReports();
      const filtered = section
        ? reports.filter((report) => report.section === section)
        : reports;

      sendJson(response, 200, { reports: filtered });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reports") {
      const body = await readRequestBody(request);
      const payload = JSON.parse(body || "{}");
      const report = normalizeReport(payload);
      const reports = await readReports();
      const nextReports = [
        ...reports.filter(
          (existing) =>
            existing.section !== report.section ||
            existing.monthKey !== report.monthKey,
        ),
        report,
      ].sort((a, b) =>
        `${a.section}-${a.monthKey}`.localeCompare(`${b.section}-${b.monthKey}`),
      );

      await writeReports(nextReports);
      sendJson(response, 200, { report });
      return;
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/reports/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/reports/", ""));
      const reports = await readReports();
      const nextReports = reports.filter((report) => report.id !== id);

      await writeReports(nextReports);
      sendJson(response, 200, { deleted: reports.length - nextReports.length });
      return;
    }

    const served = await handleStaticRequest(url, response);

    if (!served) {
      sendJson(response, 404, { error: "Not found" });
    }
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}

createServer(handleRequest).listen(port, host, () => {
  console.log(`Report API listening on http://${host}:${port}`);
});
