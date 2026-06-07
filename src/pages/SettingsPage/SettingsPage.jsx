import { CalendarDays, Database, MonitorCog, Printer, ShieldAlert, Trash2 } from "lucide-react";

export default function SettingsPage({
  settings,
  databaseStatus,
  reportCounts,
  pageOptions,
  onChangeSetting,
  onClearAllReports,
  onClearSectionReports,
}) {
  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Configure dashboard defaults, export behavior, and saved report handling.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-panel">
          <div className="settings-panel-header">
            <MonitorCog size={18} strokeWidth={2.2} />
            <h2>Pages & Navigation</h2>
          </div>

          <div className="settings-field">
            <label htmlFor="landing-page">Default landing page</label>
            <select
              id="landing-page"
              className="month-select settings-select"
              value={settings.landingPage}
              onChange={(event) => onChangeSetting("landingPage", event.target.value)}
            >
              {pageOptions.map((pageOption) => (
                <option key={pageOption.key} value={pageOption.key}>
                  {pageOption.label}
                </option>
              ))}
            </select>
            <p>Used on the next app load.</p>
          </div>

          <div className="settings-page-list">
            {pageOptions.map((pageOption) => (
              <div className="settings-page-row" key={pageOption.key}>
                <div className="settings-page-copy">
                  <strong>{pageOption.label}</strong>
                  <span>{pageOption.description}</span>
                  <small>{pageOption.detail}</small>
                </div>
                <span
                  className={`settings-page-badge ${
                    pageOption.status === "Live" ? "is-live" : "is-soon"
                  }`.trim()}
                >
                  {pageOption.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel-header">
            <CalendarDays size={18} strokeWidth={2.2} />
            <h2>Reports</h2>
          </div>

          <div className="settings-field">
            <label htmlFor="single-interval">Default single-month interval</label>
            <select
              id="single-interval"
              className="month-select settings-select"
              value={settings.singleMonthInterval}
              onChange={(event) =>
                onChangeSetting("singleMonthInterval", Number(event.target.value))
              }
            >
              <option value={1}>Daily</option>
              <option value={2}>2-day intervals</option>
              <option value={7}>Weekly intervals</option>
              <option value={10}>10-day intervals</option>
            </select>
          </div>

          <div className="settings-field">
            <label htmlFor="multi-interval">Default multi-month interval</label>
            <select
              id="multi-interval"
              className="month-select settings-select"
              value={settings.multiMonthInterval}
              onChange={(event) =>
                onChangeSetting("multiMonthInterval", Number(event.target.value))
              }
            >
              <option value={10}>10-day intervals</option>
              <option value={15}>15-day intervals</option>
              <option value={31}>Monthly intervals</option>
            </select>
          </div>

          <div className="settings-field">
            <label htmlFor="replace-upload">When uploading an existing month</label>
            <select
              id="replace-upload"
              className="month-select settings-select"
              value={settings.replaceOnUpload}
              onChange={(event) => onChangeSetting("replaceOnUpload", event.target.value)}
            >
              <option value="replace">Replace automatically</option>
              <option value="confirm">Ask before replacing</option>
            </select>
            <p>Controls whether same-month uploads overwrite saved reports immediately.</p>
          </div>
        </section>

        <section className="settings-panel">
          <div className="settings-panel-header">
            <Printer size={18} strokeWidth={2.2} />
            <h2>Export</h2>
          </div>

          <label className="settings-toggle">
            <input
              checked={settings.includeExecutiveSummary}
              type="checkbox"
              onChange={(event) =>
                onChangeSetting("includeExecutiveSummary", event.target.checked)
              }
            />
            <span>
              <strong>Executive summary</strong>
              <small>Include the narrative summary in print/PDF exports.</small>
            </span>
          </label>

          <label className="settings-toggle">
            <input
              checked={settings.includeSourceLabels}
              type="checkbox"
              onChange={(event) => onChangeSetting("includeSourceLabels", event.target.checked)}
            />
            <span>
              <strong>Source labels</strong>
              <small>Show uploaded filename and report period on dashboard sections.</small>
            </span>
          </label>

          <label className="settings-toggle">
            <input
              checked={settings.includeExportTimestamp}
              type="checkbox"
              onChange={(event) =>
                onChangeSetting("includeExportTimestamp", event.target.checked)
              }
            />
            <span>
              <strong>Export timestamp</strong>
              <small>Include a print timestamp in exported reports.</small>
            </span>
          </label>
        </section>

        <section className="settings-panel">
          <div className="settings-panel-header">
            <Database size={18} strokeWidth={2.2} />
            <h2>Data & Storage</h2>
          </div>

          <div className="settings-status">
            <span className="status-label">Backend</span>
            <p>{databaseStatus}</p>
          </div>

          <div className="settings-stats">
            <div>
              <strong>{reportCounts.food}</strong>
              <span>F&B reports</span>
            </div>
            <div>
              <strong>{reportCounts.spa}</strong>
              <span>Spa reports</span>
            </div>
            <div>
              <strong>{reportCounts.total}</strong>
              <span>Total saved</span>
            </div>
          </div>

          <div className="settings-actions">
            <button
              className="danger-btn settings-danger"
              type="button"
              onClick={() => onClearSectionReports("food")}
            >
              <Trash2 size={16} strokeWidth={2.2} />
              <span>Clear F&B</span>
            </button>

            <button
              className="danger-btn settings-danger"
              type="button"
              onClick={() => onClearSectionReports("spa")}
            >
              <Trash2 size={16} strokeWidth={2.2} />
              <span>Clear Spa</span>
            </button>

            <button
              className="danger-btn settings-danger wide"
              type="button"
              onClick={onClearAllReports}
            >
              <ShieldAlert size={16} strokeWidth={2.2} />
              <span>Clear all saved reports</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
