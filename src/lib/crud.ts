import type { ZodTypeAny } from 'zod';
import { route, readBody, unwrap, unwrapList, json, type Ctx } from '@/lib/api';

/** Generic list/create handlers for a user-owned table. user_id always comes from the session. */
export function collection(table: string, create: ZodTypeAny, order: { column: string; ascending: boolean } = { column: 'created_at', ascending: false }) {
  return {
    GET: route(async ({ supabase }) =>
      json(unwrapList(await supabase.from(table).select('*').order(order.column, { ascending: order.ascending })))),
    POST: route(async ({ supabase, user, req }) => {
      const body = await readBody(req, create);
      return json(unwrap(await supabase.from(table).insert({ ...body, user_id: user.id }).select().single()), 201);
    }),
  };
}

/** PATCH/DELETE by id. RLS guarantees the row belongs to the caller. */
export function item(table: string, update: ZodTypeAny, after?: (ctx: Ctx, row: Record<string, any>) => Promise<void>) {
  return {
    PATCH: route(async (ctx) => {
      const body = await readBody(ctx.req, update);
      const row = unwrap(await ctx.supabase.from(table).update(body).eq('id', ctx.params.id).select().single());
      if (after) await after(ctx, row);
      return json(row);
    }),
    DELETE: route(async ({ supabase, params }) => {
      unwrap(await supabase.from(table).delete().eq('id', params.id).select('id').single());
      return json({ ok: true });
    }),
  };
}
