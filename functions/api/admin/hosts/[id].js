import { api, requireAdmin } from '../../../../lib/auth.js';
import { run, one } from '../../../../lib/db.js';
import { json, err, readBody } from '../../../../lib/util.js';
export const onRequestPut = api(async (context) => {
  await requireAdmin(context);
  const h = await one(context.env.DB, 'SELECT id, status FROM hosts WHERE id = ?', [Number(context.params.id)]);
  if (!h) return err('호스트를 찾을 수 없습니다.', 404);
  const b = await readBody(context.request);
  if (b.action === 'suspend') { await run(context.env.DB, "UPDATE hosts SET status = 'suspended' WHERE id = ?", [h.id]); await run(context.env.DB, "UPDATE spaces SET status = 'hidden' WHERE host_id = ? AND status = 'approved'", [h.id]); }
  else if (b.action === 'activate') await run(context.env.DB, "UPDATE hosts SET status = 'active' WHERE id = ?", [h.id]);
  else return err('알 수 없는 요청입니다.');
  return json({ ok: true });
});
