'use client';

import { useMemo, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const recordedDays = [new Date(2026, 7, 2), new Date(2026, 7, 3), new Date(2026, 7, 4)];

export default function TripsPage() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 7, 4));
  const selectedLabel = useMemo(() => date ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(date) : 'تاریخی انتخاب نشده', [date]);
  return <div className="space-y-6"><div><p className="eyebrow">NEXGEN / آرشیو</p><h1 className="text-3xl font-bold">آرشیو سفرها</h1><p className="mt-2 text-text-secondary">تاریخ را انتخاب کنید تا ضبط‌ها، مسیر GPS و رویدادهای همان روز را ببینید.</p></div><div className="archive-grid"><Card className="archive-calendar-card"><CardHeader><CardTitle>تقویم ضبط‌ها</CardTitle><p className="text-sm text-text-secondary">روزهای دارای ضبط با نقطه مشخص شده‌اند.</p></CardHeader><CardContent><Calendar mode="single" selected={date} onSelect={setDate} modifiers={{ recorded: recordedDays }} modifiersClassNames={{ recorded: 'recorded-day' }} className="mx-auto" /></CardContent></Card><Card className="archive-detail-card"><CardHeader><p className="eyebrow">سفرهای انتخاب‌شده</p><CardTitle>{selectedLabel}</CardTitle></CardHeader><CardContent>{date && recordedDays.some(day => day.toDateString() === date.toDateString()) ? <div className="archive-trip"><span className="trip-status" /><div><strong>سفر آزمایشی</strong><p>مسیر GPS آماده بررسی است</p></div><span className="trip-duration">—</span></div> : <div className="archive-empty"><div className="empty-icon">◌</div><strong>ضبطی برای این روز نیست</strong><p>یک روز دیگر را از تقویم انتخاب کنید.</p></div>}</CardContent></Card></div></div>;
}
