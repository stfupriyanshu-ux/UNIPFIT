import { z } from 'zod';

export const uuid = z.string().uuid();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const text = (max: number) => z.string().trim().max(max);
const dow = z.array(z.number().int().min(0).max(6)).max(7);

export const challengeCreate = z.object({
  title: text(120).min(1, 'Give your challenge a name'),
  description: text(1000).default(''),
  day_one_message: text(2000).default(''),
  start_date: isoDate.optional(),
  duration_days: z.number().int().min(1).max(3650),
  strict_mode: z.boolean().default(false),
});
export const challengeUpdate = z.object({
  title: text(120).min(1).optional(),
  description: text(1000).optional(),
  day_one_message: text(2000).optional(),
  strict_mode: z.boolean().optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  end_date: isoDate.optional(),
}).strict();

export const checkInCreate = z.object({
  challenge_id: uuid,
  date: isoDate.optional(),
  status: z.enum(['yes', 'no', 'skipped']),
  reason: text(500).optional(),
}).refine((v) => v.status !== 'no' || (v.reason && v.reason.length > 0), { message: 'Tell us why you missed today', path: ['reason'] });

export const noteUpsert = z.object({
  challenge_id: uuid.nullable().default(null),
  note_date: isoDate,
  content: text(5000).min(1, 'Write something first'),
});

export const goalCreate = z.object({
  title: text(120).min(1), description: text(1000).default(''),
  target_value: z.number().positive().max(1e9).default(100),
  current_value: z.number().min(0).max(1e9).default(0),
  unit: text(20).default(''), deadline: isoDate.nullable().optional(),
});
export const goalUpdate = goalCreate.partial().extend({ status: z.enum(['active', 'completed', 'archived']).optional() }).strict();

export const milestoneCreate = z.object({
  goal_id: uuid.nullable().optional(), title: text(120).min(1),
  target_value: z.number().min(0).max(1e9).nullable().optional(), target_date: isoDate.nullable().optional(),
  kind: z.enum(['goal', 'custom']).default('goal'),
});
export const milestoneUpdate = z.object({
  title: text(120).min(1).optional(), target_value: z.number().min(0).nullable().optional(),
  target_date: isoDate.nullable().optional(), achieved: z.boolean().optional(),
}).strict();

export const routineCreate = z.object({
  title: text(120).min(1), frequency: z.enum(['daily', 'weekly']).default('daily'),
  days_of_week: dow.default([]), time_of_day: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  active: z.boolean().default(true),
});
export const routineUpdate = routineCreate.partial().strict();

export const taskCreate = z.object({
  title: text(200).min(1), notes: text(1000).default(''), due_date: isoDate.nullable().optional(),
  repeat: z.enum(['none', 'daily', 'weekly']).default('none'), repeat_days: dow.default([]),
});
export const taskUpdate = taskCreate.partial().extend({ archived: z.boolean().optional(), position: z.number().int().optional() }).strict();

export const timerAction = z.object({
  action: z.enum(['start', 'pause', 'resume', 'stop']),
  task_id: uuid.nullable().optional(),
});

export const futureCreate = z.object({
  title: text(120).default('A note to future me'), message: text(5000).min(1, 'Write your message'),
  deliver_on: isoDate, challenge_id: uuid.nullable().optional(),
  photo_media_id: uuid.nullable().optional(), media_id: uuid.nullable().optional(),
});

export const mediaCreate = z.object({
  purpose: z.enum(['promise', 'strict_photo', 'note_photo', 'avatar', 'future_photo', 'future_media']),
  mime: z.string().max(100), size: z.number().int().positive(),
  challenge_id: uuid.nullable().optional(), note_date: isoDate.nullable().optional(),
});
export const mediaConfirm = z.object({ duration_seconds: z.number().int().min(0).max(600).nullable().optional() });

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
export const profileUpdate = z.object({
  display_name: text(80).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  timezone: z.string().max(60).optional(),
  ai_personality: z.enum(['supportive', 'coach', 'strict', 'friend']).optional(),
  privacy: z.object({ ai_uses_my_data: z.boolean() }).optional(),
  notification_prefs: z.object({
    enabled: z.boolean(),
    morning: z.object({ enabled: z.boolean(), time: hhmm }),
    check_in: z.object({ enabled: z.boolean(), time: hhmm }),
    goal: z.boolean(), streak: z.boolean(), milestone: z.boolean(), future_self: z.boolean(),
    quiet_hours: z.object({ enabled: z.boolean(), start: hhmm, end: hhmm }),
    weekends: z.boolean(), snooze_until: z.string().datetime().nullable(),
  }).optional(),
}).strict();

export const aiChat = z.object({ message: text(2000).min(1), personality: z.enum(['supportive', 'coach', 'strict', 'friend']).optional() });
export const accountDelete = z.object({ confirm: z.literal('DELETE') });
