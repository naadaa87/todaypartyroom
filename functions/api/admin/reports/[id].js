import { api, requireAdmin } from '../../../../lib/auth.js';
import { run } from '../../../../lib/db.js';
import { json, readBody } from '../../../../lib/util.js';
export const onRequestPut = api(async (context) => {
  await requireAdmin(context);
  const b = await readBody(context.request);
  await run(context.env.DB, 'UPDATE reports SET status = ?, admin_note = ? WHERE id = ?', [b.status === 'resolved' ? 'resolved' : 'open', String(b.admin_note || '').slice(0, 1000), Number(context.params.id)]);
  return json({ ok: true });
});
