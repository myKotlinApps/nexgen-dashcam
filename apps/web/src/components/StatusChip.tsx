'use client';

export function StatusChip({ tone = 'neutral', children, dot = true }: { tone?: 'neutral' | 'violet' | 'green' | 'amber' | 'red'; children: React.ReactNode; dot?: boolean }) {
  return <span className={`status-chip ${tone}`}>{dot && <i />}{children}</span>;
}
