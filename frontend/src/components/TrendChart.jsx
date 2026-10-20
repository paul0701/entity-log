import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const TrendChart = ({ data }) => (
  <div data-testid="trend-chart" className="panel p-4">
    <p className="eyebrow">Escape rate trend</p>
    {data.length < 2 ? (
      <p className="py-8 text-center text-sm text-stone-500">Log trials on a couple of days to see your trend.</p>
    ) : (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="#1A1D2C" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#57534E" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#57534E" fontSize={11} />
            <Tooltip contentStyle={{ background: "#0F111A", border: "1px solid #7F1D1D", borderRadius: 8, color: "#F5F5F4" }}
              formatter={(v, n) => [`${v}%`, n === "overall_rate" ? "Overall" : "That day"]} />
            <Line type="monotone" dataKey="escape_rate" stroke="#F59E0B" strokeWidth={1.5} dot={{ r: 3, fill: "#F59E0B" }} />
            <Line type="monotone" dataKey="overall_rate" stroke="#DC2626" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);
