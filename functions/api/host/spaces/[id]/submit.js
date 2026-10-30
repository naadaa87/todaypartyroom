// POST /api/host/spaces/:id/submit — 검수 제출
import { api, requireHost } from '../../../../../lib/auth.js';
import { run, all } from '../../../../../lib/db.js';
import { json, err } from '../../../../../lib/util.js';
import { ownSpace, checkReady } from '../../../../../lib/host-api.js';
export const onRequestPost = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const slots = await all(context.env.DB, 'SELECT * FROM slots WHERE space_id = ? AND active = 1', [s.id]);
  const issues = checkReady(s, slots);
  if (issues.length) return err('아직 채워야 할 항목이 있어요.', 400, { issues });
  if (!['draft', 'revision', 'rejected'].includes(s.status)) return err('이미 제출되었거나 공개 중인 공간입니다.');
  await run(context.env.DB, "UPDATE spaces SET status = 'pending', updated_at = datetime('now') WHERE id = ?", [s.id]);
  return json({ ok: true });
});
