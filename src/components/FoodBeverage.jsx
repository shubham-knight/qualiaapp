import RevenueCard from "../components/RevenueCard";
import RevenueChart from "../components/RevenueChart";

const revenueCards = [
  {
    title: "F&B Revenue",
    value: "₹4.78L",
    change: "▼ 3.4%",
    negative: true,
  },
  {
    title: "Total Covers",
    value: "164",
    change: "▲ 11 tables",
  },
  {
    title: "Avg. Cheque",
    value: "₹2,917",
    change: "▲ 4.1%",
  },
  {
    title: "Best Channel",
    value: "Walk-in",
    change: "₹3.20L · 67%",
  },
  {
    title: "Peak Day",
    value: "10 May",
    change: "₹1.08L · 19 covers",
  },
];

const chartData = [
  { name: "01", value: 14000 },
  { name: "02", value: 17000 },
  { name: "03", value: 12000 },
  { name: "04", value: 4000 },
  { name: "05", value: 11000 },
  { name: "06", value: 16000 },
  { name: "07", value: 14000 },
  { name: "08", value: 11000 },
  { name: "09", value: 21000 },
  { name: "10", value: 108000 },
  { name: "11", value: 8000 },
  { name: "12", value: 3000 },
];

const channelRows = [
  {
    name: "Walk-in / In-house",
    tables: 110,
    share: "66.9%",
    avg: "₹2,909",
    revenue: "₹3,19,957",
  },
  {
    name: "Zomato",
    tables: 29,
    share: "17.3%",
    avg: "₹2,855",
    revenue: "₹82,788",
  },
  {
    name: "Swiggy",
    tables: 11,
    share: "7.0%",
    avg: "₹3,055",
    revenue: "₹33,603",
  },
  {
    name: "Dineout",
    tables: 7,
    share: "4.7%",
    avg: "₹2,987",
    revenue: "₹20,909",
  },
];


export default function FoodBeverage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Food & Beverage</h1>
          <p>
            Channel revenue from OTA & restaurant register · May 2026
          </p>
        </div>

        <div className="header-actions">
          <button>May 2026</button>
          <button>01 May – 31 May 2026</button>
          <button className="export-btn">Export</button>
        </div>
      </div>

      <div className="dashboard-cards five-cols">
        {revenueCards.map((card) => (
          <RevenueCard
            key={card.title}
            {...card}
          />
        ))}
      </div>

      <div className="content-grid">
        <div className="chart-card large">
          <div className="card-header">
            <h2>Daily F&B Revenue by Channel</h2>

            <div className="filter-pills">
              <span>Walk-in / In-house</span>
              <span>Zomato</span>
              <span>Swiggy</span>
              <span>Dineout</span>
              <span>EazyDinner</span>
            </div>
          </div>

          <RevenueChart data={chartData} />
        </div>

        <div className="table-card">
          <h2>Revenue Share by Channel</h2>

          <div className="donut-placeholder">
            <div className="donut"></div>
          </div>
        </div>
      </div>

      <div className="table-card full-width">
        <div className="card-header">
          <h2>Channel Performance</h2>

          <span>
            Source: OTA & restaurant register · May 2026
          </span>
        </div>

        <table className="events-table">
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
            {channelRows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.tables}</td>
                <td>{row.share}</td>
                <td>{row.avg}</td>
                <td className="revenue">
                  {row.revenue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
