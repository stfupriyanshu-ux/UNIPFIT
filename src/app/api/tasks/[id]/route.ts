import { item } from '@/lib/crud';
import { taskUpdate } from '@/lib/schemas';
const h = item('tasks', taskUpdate);
export const PATCH = h.PATCH;
export const DELETE = h.DELETE;
