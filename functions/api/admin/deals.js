// GET /api/admin/deals — 진행 중 딜 + 이상 플래그
import { api, requireAdmin } from '../../../lib/auth.js';
import { all } from '../../../lib/db.js';
import { json, parseJSON } from '../../../lib/util.js';
import { tick } from '../../../lib/deals.js';
export const onRequestGet = api(async (context) => {
  await requireAdmin(context);
  await tick(context.env);
  const db = context.env.DB;
  const rows = await all(db, `SELECT d.*, s.name AS space_name, s.slug, h.name AS host_name, (SELECT COUNT(*) FROM price_history p JOIN slots sl ON sl.id = p.slot_id WHERE sl.space_id = s.id AND p.changed_at >= datetime('now','-30 day') AND (p.new_weekday > p.old_weekday OR p.new_weekend > p.old_weekend)) AS raised_n, (SELECT COUNT(*) FROM deals d2 WHERE d2.space_id = s.id AND d2.type='FLASH' AND d2.created_at >= datetime('now','-1 day')) AS flash_today, (SELECT COUNT(*) FROM deals d3 WHERE d3.space_id = s.id AND d3.end_reason = 'HOST_CANCELLED' AND d3.created_at >= datetime('now','-7 day')) AS cancel7 FROM deals d JOIN spaces s ON s.id = d.space_id JOIN hosts h ON h.id = s.host_id WHERE d.status != 'ENDED' ORDER BY d.ends_at LIMIT 500`);
  const deals = rows.map(d => {
    const flags = [];
    if (d.discount_mode === 'RATE' && d.discount_value >= 70) flags.push('할인율 70% 이상');
    if (d.raised_n > 0) flags.push('30일 내 정가 인상');
    if (d.flash_today > 2) flags.push('반짝딜 상한 초과');
    if (d.cancel7 >= 3) flags.push('7일 내 취소 3회 이상');
    return { ...d, targets: parseJSON(d.targets_json, []), flags };
  });
  return json({ ok: true, deals });
});
