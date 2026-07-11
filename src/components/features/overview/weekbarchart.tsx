import { WeekStats2 } from "@/app/actions/dashboard-metrics";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

export function WeekBarChart({ weeklyStats }: { weeklyStats: WeekStats2[] }) {
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  const data = days.map((d, i) => ({
    day: d,
    total: i <= todayIdx ? (weeklyStats[i]?.total ?? 0) : null,
    isCurrent: i === todayIdx,
  }));

  return (
    <div className="flex flex-col border-b border-[var(--border)] sm:border-b-0 sm:border-r">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <span className="font-['DM_Mono'] text-[10px] uppercase tracking-widest text-[var(--muted)]">
          Esta semana
        </span>
      </div>

      <div className="flex-1 px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap="8%"
            barSize={40}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fontFamily: "DM Mono",
                fontSize: 10,
                fill: "var(--muted)",
              }}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length || payload[0]?.value == null)
                  return null;
                return (
                  <div className="rounded-sm bg-[var(--fg)] px-2.5 py-1.5 font-['DM_Mono'] text-[11px] text-white">
                    ${Number(payload[0]?.value).toLocaleString("es-AR")}
                  </div>
                );
              }}
            />
            <Bar dataKey="total" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.total === null
                      ? "var(--border)"
                      : entry.isCurrent
                        ? "var(--fg)"
                        : "var(--fg)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}