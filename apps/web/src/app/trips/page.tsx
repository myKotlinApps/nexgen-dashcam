export default function TripsPage() {
  return (
    <div className="space-y-6">
      <div><p className="eyebrow">NEXGEN / سفرها</p><h1 className="text-3xl font-bold">سفرهای ثبت‌شده</h1><p className="mt-2 text-text-secondary">مسیرها، تله‌متری GPS و رویدادهای پلاک در یک نگاه.</p></div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
          <span className="text-4xl mb-3">🚗</span>
          <p>هنوز سفری ثبت نشده است.</p><p className="text-sm mt-1">ضبط را از اپ موبایل شروع کنید تا سفرها اینجا نمایش داده شوند.</p>
        </div>
      </div>
    </div>
  );
}
