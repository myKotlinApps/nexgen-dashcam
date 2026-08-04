export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-text-secondary">
          Overview of your dash cam recordings, trips, and recognized plates.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Trips" value="0" subtitle="No trips yet" />
        <StatCard title="Recorded Hours" value="0h" subtitle="Start recording" />
        <StatCard title="Plates Recognized" value="0" subtitle="Enable ALPR" />
        <StatCard title="Storage Used" value="0 GB" subtitle="of 8 GB" />
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
          <span className="text-4xl mb-3">📹</span>
          <p>No recordings yet. Start your first trip from the mobile app.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-sm text-text-secondary">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{subtitle}</p>
    </div>
  );
}
