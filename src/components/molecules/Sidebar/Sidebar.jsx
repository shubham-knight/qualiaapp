import {
  BedDouble,
  Hexagon,
  LayoutDashboard,
  MapPin,
  Menu,
  Settings,
  Sparkles,
  Utensils,
} from "lucide-react";

export default function Sidebar({
  mobileNavOpen,
  onToggleMobileNav,
  selectedPage,
  onChangePage,
  onNavigate,
}) {
  const changePage = (page) => {
    onChangePage(page);
    onNavigate?.();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-topbar">
        <div className="logo">
          <div className="logo-mark">Q</div>
          <div>
            <h2>The Qualia Resort</h2>
            <p>UDAIPUR · RAJASTHAN</p>
          </div>
        </div>

        <button
          className="menu-toggle"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileNavOpen}
          onClick={onToggleMobileNav}
        >
          <Menu size={18} strokeWidth={2.4} />
        </button>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section">Overview</div>

        <div
          className={`sidebar-item ${selectedPage === "dashboard" ? "active" : ""}`}
          onClick={() => changePage("dashboard")}
        >
          <LayoutDashboard size={18} strokeWidth={2.7} />
          <span>Dashboard</span>
        </div>

        <div className="sidebar-section">Departments</div>

        <div
          className={`sidebar-item ${selectedPage === "rooms" ? "active" : ""}`}
          onClick={() => changePage("rooms")}
        >
          <BedDouble size={20} strokeWidth={2.5} />
          <span>Rooms & Occupancy</span>
        </div>

        <div
          className={`sidebar-item ${selectedPage === "food" ? "active" : ""}`}
          onClick={() => changePage("food")}
        >
          <Utensils size={20} strokeWidth={2.5} />
          <span>Food & Beverage</span>
          {selectedPage === "food" ? <span className="live-badge">live</span> : null}
        </div>

        <div
          className={`sidebar-item ${selectedPage === "regions" ? "active" : ""}`}
          onClick={() => changePage("regions")}
        >
          <MapPin size={20} strokeWidth={2.5} />
          <span>Regions & Sources</span>
        </div>

        <div
          className={`sidebar-item ${selectedPage === "spa" ? "active" : ""}`}
          onClick={() => changePage("spa")}
        >
          <Sparkles size={20} strokeWidth={2.5} />
          <span>Spa · Banquet · Other</span>
          {selectedPage === "spa" ? <span className="live-badge">live</span> : null}
        </div>

        <div className="sidebar-section">Manage</div>

        <div
          className={`sidebar-item ${selectedPage === "reports" ? "active" : ""}`}
          onClick={() => changePage("reports")}
        >
          <Hexagon size={19} strokeWidth={2.5} />
          <span>Reports</span>
        </div>

        <div
          className={`sidebar-item ${selectedPage === "settings" ? "active" : ""}`}
          onClick={() => changePage("settings")}
        >
          <Settings size={19} strokeWidth={2.5} />
          <span>Settings</span>
        </div>
      </div>
    </aside>
  );
}
