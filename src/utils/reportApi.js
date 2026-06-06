const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Report API request failed.");
  }

  return response.json();
};

export const fetchStoredReports = async () => {
  const payload = await apiFetch("/api/reports");
  return payload.reports || [];
};

export const saveStoredReport = async (report) => {
  const payload = await apiFetch("/api/reports", {
    method: "POST",
    body: JSON.stringify(report),
  });

  return payload.report;
};

export const deleteStoredReport = async (id) => {
  const payload = await apiFetch(`/api/reports/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  return payload.deleted || 0;
};
