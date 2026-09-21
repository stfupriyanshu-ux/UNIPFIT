'use client';
import { Textarea } from '@/components/ui';
const REASONS = ['Tired', 'Busy', 'Not feeling well', 'Traveling', 'Forgot', 'Low motivation'];

export default function ReasonPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick reasons">
        {REASONS.map((r) => (
          <button key={r} type="button" onClick={() => onChange(r)} aria-pressed={value === r}
            className={`min-h-9 rounded-full border px-3 text-sm font-semibold ${value === r ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-bg'}`}>{r}</button>
        ))}
      </div>
      <Textarea aria-label="Why did you miss today?" placeholder="What got in the way?" maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} className="min-h-20" />
    </div>
  );
}
