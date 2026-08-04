export default function PlatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">پلاک‌های شناسایی‌شده</h1><p className="mt-2 text-text-secondary">پلاک‌هایی که هنگام رانندگی شناسایی شده‌اند. برای شروع، ALPR را در تنظیمات فعال کنید.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-4 font-medium text-text-secondary">پلاک</th><th className="py-3 px-4 font-medium text-text-secondary">اطمینان</th><th className="py-3 px-4 font-medium text-text-secondary">زمان</th><th className="py-3 px-4 font-medium text-text-secondary">شهر</th><th className="py-3 px-4 font-medium text-text-secondary">سفر</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-secondary">
                  <span className="text-3xl block mb-2">🔍</span>
                  هنوز پلاکی شناسایی نشده است
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
