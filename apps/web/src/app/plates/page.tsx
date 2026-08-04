export default function PlatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recognized Plates</h1>
        <p className="mt-2 text-text-secondary">License plates recognized during your drives. Enable ALPR in settings to start capturing.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-4 font-medium text-text-secondary">Plate</th>
                <th className="py-3 px-4 font-medium text-text-secondary">Confidence</th>
                <th className="py-3 px-4 font-medium text-text-secondary">Time</th>
                <th className="py-3 px-4 font-medium text-text-secondary">City</th>
                <th className="py-3 px-4 font-medium text-text-secondary">Trip</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-secondary">
                  <span className="text-3xl block mb-2">🔍</span>
                  No plates recognized yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
