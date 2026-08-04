'use client';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">تنظیمات</h1><p className="mt-2 text-text-secondary">همگام‌سازی، حریم خصوصی و اعلان‌ها را مدیریت کنید.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">همگام‌سازی ابری</h2><p className="text-sm text-text-secondary">همگام‌سازی ابری به‌صورت پیش‌فرض خاموش است. ضبط‌ها تا زمان فعال‌سازی انتخابی شما روی دستگاه می‌مانند.</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4">نگهداری داده پلاک</h2><p className="text-sm text-text-secondary">داده پلاک‌ها را می‌توان جدا از ویدئوها حذف کرد. حذف خودکار را از این بخش تنظیم کنید.</p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold mb-4 text-destructive">ناحیه خطر</h2><p className="text-sm text-text-secondary mb-4">تمام داده‌های همگام‌شده را حذف کنید. این عملیات قابل بازگشت نیست.</p><button className="px-4 py-2 rounded-md border border-destructive text-destructive text-sm hover:bg-destructive/10 transition-colors" onClick={() => window.confirm('آیا از حذف تمام داده‌ها مطمئن هستید؟')}>حذف تمام داده‌ها</button>
        </div>
      </div>
    </div>
  );
}
