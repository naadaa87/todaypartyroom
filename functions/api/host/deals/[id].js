// PUT /api/host/deals/:id — {action:'end'|'raise'|'extend'|'quantity', ...}
import { api, requireHost } from '../../../../lib/auth.js';
import { run, one } from '../../../../lib/db.js';
import { json, err, readBody, toInt, clamp, nowStr } from '../../../../lib/util.js';
export const onRequestPut = api(async (context) => {
  const host = await requireHost(context);
  const d = await one(context.env.DB, 'SELECT d.* FROM deals d JOIN spaces s ON s.id = d.space_id WHERE d.id = ? AND s.host_id = ?', [Number(context.params.id), host.id]);
  if (!d) return err('딜을 찾을 수 없습니다.', 404);
  if (d.status === 'ENDED') return err('이미 종료된 딜입니다.');
  const b = await readBody(context.request);
  if (b.action === 'end') { await run(context.env.DB, `UPDATE deals SET status = 'ENDED', end_reason = 'HOST_CANCELLED' WHERE id = ?`, [d.id]); return json({ ok: true }); }
  if (b.action === 'raise') {
    if (d.type === 'EVENT') return err('이벤트는 할인율을 바꿀 수 없습니다.');
    const v = toInt(b.discount_value, 0);
    if (d.discount_mode === 'RATE' && v <= d.discount_value) return err('진행 중인 딜은 할인율을 올리는 것만 가능합니다.');
    if (d.discount_mode === 'FIXED' && v >= d.discount_value) return err('진행 중인 딜은 가격을 내리는 것만 가능합니다.');
    if (d.discount_mode === 'AMOUNT' && v <= d.discount_value) return err('진행 중인 딜은 할인액을 올리는 것만 가능합니다.');
    await run(context.env.DB, 'UPDATE deals SET discount_value = ? WHERE id = ?', [clamp(v, 1, 9000000), d.id]); return json({ ok: true });
  }
  if (b.action === 'quantity') {
    const q = b.quantity === '' || b.quantity == null ? null : toInt(b.quantity, 1);
    if (q != null && q < (d.quantity || 0)) return err('수량은 늘리는 것만 가능합니다.');
    await run(context.env.DB, 'UPDATE deals SET quantity = ? WHERE id = ?', [q, d.id]); return json({ ok: true });
  }
  if (b.action === 'extend') {
    const e = String(b.ends_at || '');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(e) || e <= d.ends_at) return err('종료 시각은 현재보다 뒤로만 늘릴 수 있습니다.');
    await run(context.env.DB, 'UPDATE deals SET ends_at = ? WHERE id = ?', [e, d.id]); return json({ ok: true });
  }
  return err('알 수 없는 요청입니다.');
});
