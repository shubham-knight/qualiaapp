import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
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