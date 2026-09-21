import { item } from '@/lib/crud';
import { routineUpdate } from '@/lib/schemas';
const h = item('routines', routineUpdate);
export const PATCH = h.PATCH;
export const DELETE = h.DELETE;
