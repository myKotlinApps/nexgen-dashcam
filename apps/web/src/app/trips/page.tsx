export default function TripsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trips</h1>
        <p className="mt-2 text-text-secondary">Recorded trips with segments, GPS tracks, and plate events.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
          <span className="text-4xl mb-3">🚗</span>
          <p>No trips recorded yet.</p>
          <p className="text-sm mt-1">Start recording from the mobile app to see your trips here.</p>
        </div>
      </div>
    </div>
  );
}
