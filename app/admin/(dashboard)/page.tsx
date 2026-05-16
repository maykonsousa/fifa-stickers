import { AdminMetrics } from "./admin-metrics";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <AdminMetrics />
    </div>
  );
}
