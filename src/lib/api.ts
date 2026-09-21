import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { todayIn } from '@/lib/dates';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface Ctx {
  req: NextRequest;
  supabase: SupabaseClient;   // runs as the user -> RLS enforced
  user: User;                 // user id ALWAYS comes from the verified session, never from the client
  params: Record<string, string>;
  today: string;              // user's local date
  timezone: string;
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export async function readBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try { raw = await req.json(); } catch { throw new ApiError(400, 'Request body must be valid JSON.'); }
  return schema.parse(raw);
}

/** Throw a friendly error for Postgres/PostgREST failures. */
export function unwrap<T>(res: { data: T | null; error: { code?: string; message: string } | null }): NonNullable<T> {
  if (res.error) {
    const c = res.error.code;
    if (c === '23505') throw new ApiError(409, 'That already exists.');
    if (c === '23503' || c === '23514') throw new ApiError(422, 'Those values are not allowed.');
    if (c === '42501') throw new ApiError(403, 'You do not have access to that.');
    if (c === 'PGRST116') throw new ApiError(404, 'Not found.');
    console.error('[db]', res.error);
    throw new ApiError(500, 'Something went wrong saving your data. Try again.');
  }
  return res.data as NonNullable<T>;
}
export const unwrapList = <T>(res: { data: T[] | null; error: { code?: string; message: string } | null }): T[] => unwrap(res) ?? [];

export function route(fn: (ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, routeCtx: { params: Promise<Record<string, string>> }) => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new ApiError(401, 'Sign in to continue.');
      const { data: profile } = await supabase.from('profiles').select('timezone').eq('user_id', user.id).maybeSingle();
      const timezone = profile?.timezone ?? 'UTC';
      const params = routeCtx?.params ? await routeCtx.params : {};
      return await fn({ req, supabase, user, params, timezone, today: todayIn(timezone) });
    } catch (e) {
      if (e instanceof ZodError) {
        const i = e.issues[0];
        return json({ error: `${i.path.join('.') || 'input'}: ${i.message}` }, 422);
      }
      if (e instanceof ApiError) return json({ error: e.message }, e.status);
      console.error('[api]', e);
      return json({ error: 'Unexpected server error.' }, 500);
    }
  };
}

/** PostgREST caps responses (1000 rows by default), so page through big tables. */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const rows = unwrapList(await build(from, from + size - 1));
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}
