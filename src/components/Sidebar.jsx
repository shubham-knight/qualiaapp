import {
  BedDouble,
  Hexagon,
  LayoutDashboard,
  MapPin,
  Settings,
  Sparkles,
  Utensils,
} from "lucide-react";

export default function Sidebar({
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
      <div className="logo">
        <div className="logo-mark">Q</div>
        <div>
          <h2>The Qualia Resort</h2>
          <p>UDAIPUR · RAJASTHAN</p>
        </div>
      </div>

      <div className="sidebar-section">Overview</div>

      <div className="sidebar-item">
        <LayoutDashboard size={18} strokeWidth={2.7} />
        <span>Dashboard</span>
      </div>

      <div className="sidebar-section">Departments</div>

      <div className="sidebar-item">
        <BedDouble size={20} strokeWidth={2.5} />
        <span>Rooms & Occupancy</span>
      </div>

      <div
        className={`sidebar-item ${
          selectedPage === "food"
            ? "active"
            : ""
        }`}
        onClick={() =>
          changePage("food")
        }
      >
        <Utensils size={20} strokeWidth={2.5} />
        <span>Food & Beverage</span>
        {selectedPage === "food" ? (
          <span className="live-badge">live</span>
        ) : null}
      </div>

      <div className="sidebar-item">
        <MapPin size={20} strokeWidth={2.5} />
        <span>Regions & Sources</span>
      </div>

      <div
        className={`sidebar-item ${
          selectedPage === "spa"
            ? "active"
            : ""
        }`}
        onClick={() =>
          changePage("spa")
        }
      >
        <Sparkles size={20} strokeWidth={2.5} />
        <span>Spa · Banquet · Other</span>
        {selectedPage === "spa" ? (
          <span className="live-badge">live</span>
        ) : null}
      </div>

      <div className="sidebar-section">Manage</div>

      <div
        className={`sidebar-item ${
          selectedPage === "reports"
            ? "active"
            : ""
        }`}
        onClick={() =>
          changePage("reports")
        }
      >
        <Hexagon size={19} strokeWidth={2.5} />
        <span>Reports</span>
      </div>

      <div className="sidebar-item">
        <Settings size={19} strokeWidth={2.5} />
        <span>Settings</span>
      </div>
    </aside>
  );
}
