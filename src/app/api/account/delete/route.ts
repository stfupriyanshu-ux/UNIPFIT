import { route, readBody, json, ApiError } from '@/lib/api';
import { accountDelete } from '@/lib/schemas';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKETS = ['promises', 'photos', 'future-self'];
const FOLDERS = ['promise', 'strict_photo', 'note_photo', 'avatar', 'future_photo', 'future_media'];

/** Permanently deletes the caller's files and auth user; every table row cascades from auth.users. */
export const POST = route(async ({ user, req }) => {
  await readBody(req, accountDelete);
  const admin = createAdminClient();
  for (const bucket of BUCKETS) {
    for (const f of FOLDERS) {
      for (;;) {
        const { data } = await admin.storage.from(bucket).list(`${user.id}/${f}`, { limit: 1000 });
        if (!data?.length) break;
        await admin.storage.from(bucket).remove(data.map((o) => `${user.id}/${f}/${o.name}`));
        if (data.length < 1000) break;
      }
    }
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) { console.error('[delete-account]', error); throw new ApiError(500, 'Could not delete your account. Nothing else was changed.'); }
  return json({ ok: true });
});
