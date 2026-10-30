import { api, requireAdmin } from '../../../../lib/auth.js';
import { run, one } from '../../../../lib/db.js';
import { json, err, readBody } from '../../../../lib/util.js';
export const onRequestPut = api(async (context) => {
  await requireAdmin(context);
  const d = await one(context.env.DB, 'SELECT id FROM deals WHERE id = ?', [Number(context.params.id)]);
  if (!d) return err('딜을 찾을 수 없습니다.', 404);
  const b = await readBody(context.request);
  if (b.action === 'stop') { await run(context.env.DB, "UPDATE deals SET status = 'ENDED', end_reason = 'ADMIN_STOPPED' WHERE id = ?", [d.id]); return json({ ok: true }); }
  return err('알 수 없는 요청입니다.');
});
