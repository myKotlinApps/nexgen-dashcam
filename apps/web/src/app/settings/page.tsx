export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-text-secondary">Configure cloud sync, privacy, and notification preferences.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">Cloud Sync</h2>
          <p className="text-sm text-text-secondary">
            Cloud sync is off by default. All recordings stay on-device unless you opt in.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">Plate Data Retention</h2>
          <p className="text-sm text-text-secondary">
            Recognized plate data can be deleted independently from video recordings.
            Configure auto-deletion below.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
          <p className="text-sm text-text-secondary mb-4">
            Delete all synced data or your entire account. These actions cannot be undone.
          </p>
          <button className="px-4 py-2 rounded-md border border-destructive text-destructive text-sm hover:bg-destructive/10 transition-colors">
            Delete All Data
          </button>
        </div>
      </div>
    </div>
  );
}
