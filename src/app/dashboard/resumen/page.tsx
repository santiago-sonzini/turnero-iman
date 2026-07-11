"use server"
// Page.tsx - Server Component
import { getMonthlyStatsComparisonRange, getRecentActivities } from "@/app/actions/dashboard-metrics";
import DashboardOverview from "@/components/features/overview";
import { getDemoPackInfo } from "@/server/demo/current";

export default async function Page() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const months: [number, number] = [month === 0 ? 11 : month - 1, month];

  const [metrics, activities, demoPack] = await Promise.all([
    getMonthlyStatsComparisonRange(months, year),
    getRecentActivities(5),
    getDemoPackInfo(),
  ]);

  return (
    <div className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden">
      <DashboardOverview
        months={months}
        year={year}
        weeklyStats={[]}
        metrics={metrics}
        activities={activities}
        labelCliente={demoPack?.labels.clienteSingular}
      />
    </div>
  );
}
