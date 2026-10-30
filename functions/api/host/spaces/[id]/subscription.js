// POST /api/host/spaces/:id/subscription — {action:'request'|'cancel'}
import { api, requireHost } from '../../../../../lib/auth.js';
import { run, insertId } from '../../../../../lib/db.js';
import { json, err, readBody } from '../../../../../lib/util.js';
import { ownSpace } from '../../../../../lib/host-api.js';
export const onRequestPost = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const b = await readBody(context.request);
  if (b.action === 'request') {
    await insertId(context.env.DB, `INSERT INTO reports (kind, target_type, target_id, contact, content) VALUES ('inquiry', 'space', ?, ?, ?)`, [s.id, `${host.name} / ${host.phone} / ${host.email}`, `[구독 결제 요청] 공간 #${s.id} ${s.name} — ${String(b.memo || '').slice(0, 300)}`]);
    return json({ ok: true, message: '결제 요청을 접수했습니다. 입금 확인 후 구독이 활성화됩니다.' });
  }
  if (b.action === 'cancel') {
    if (!['trial', 'active', 'past_due'].includes(s.subscription_status)) return err('해지할 구독이 없습니다.');
    await run(context.env.DB, "UPDATE spaces SET subscription_status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [s.id]);
    return json({ ok: true, message: '해지되었습니다. 남은 기간까지는 노출이 유지됩니다.' });
  }
  return err('알 수 없는 요청입니다.');
});
