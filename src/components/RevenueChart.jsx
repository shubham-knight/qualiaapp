import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

const COLORS = {
  walkIn: "#1f3d2f",
  zomato: "#c2a14d",
  swiggy: "#d98b4a",
  dineout: "#6b7b9c",
  eazyDinner: "#8aa893",
};

const PIE_COLORS = [
  "#1f3d2f",
  "#c2a14d",
  "#d98b4a",
  "#6b7b9c",
  "#8aa893",
];

const formatAxisCurrency = (value) => {
  if (!Number.isFinite(value)) return value;

  if (Math.abs(value) >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }

  if (Math.abs(value) >= 1000) {
    return `₹${Math.round(value / 1000)}k`;
  }

  return `₹${Math.round(value)}`;
};

const formatTooltipCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));

export default function RevenueChart({
  data = [],
  type = "bar",
  xKey,
  yKey,
}) {
  const resolvedXKey =
    xKey || (data[0]?.day ? "day" : "name");

  const resolvedYKey =
    yKey || (data[0]?.value ? "value" : "revenue");

  if (type === "doughnut") {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Tooltip />

          <Pie
            data={data}
            dataKey={resolvedYKey}
            nameKey={resolvedXKey}
            innerRadius={85}
            outerRadius={130}
            paddingAngle={2}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "trend") {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#224737" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#224737" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="#e6decd" strokeDasharray="3 3" />
          <XAxis dataKey={resolvedXKey} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={formatAxisCurrency}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip formatter={(value) => formatTooltipCurrency(value)} />

          <Area
            type="monotone"
            dataKey={resolvedYKey}
            stroke="#224737"
            strokeWidth={3}
            fill="url(#trendFill)"
            activeDot={{ r: 5, fill: "#224737", stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  const isFoodChart =
    data[0]?.walkIn !== undefined;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey={resolvedXKey} />
        <YAxis />
        <Tooltip />

        {isFoodChart ? (
          <>
            <Bar
              dataKey="walkIn"
              stackId="food"
              fill={COLORS.walkIn}
            />
            <Bar
              dataKey="zomato"
              stackId="food"
              fill={COLORS.zomato}
            />
            <Bar
              dataKey="swiggy"
              stackId="food"
              fill={COLORS.swiggy}
            />
            <Bar
              dataKey="dineout"
              stackId="food"
              fill={COLORS.dineout}
            />
            <Bar
              dataKey="eazyDinner"
              stackId="food"
              fill={COLORS.eazyDinner}
              radius={[6, 6, 0, 0]}
            />
          </>
        ) : (
          <Bar
            dataKey={resolvedYKey}
            fill="#1f3d2f"
            radius={[6, 6, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
