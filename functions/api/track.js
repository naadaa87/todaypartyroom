// POST /api/track — 노출·클릭 이벤트
import { logEvent } from '../../lib/deals.js';
import { json, readBody } from '../../lib/util.js';
export async function onRequestPost({ env, request }) {
  const b = await readBody(request);
  const type = ['view_space', 'click_deal', 'click_channel'].includes(b.type) ? b.type : null;
  if (type) await logEvent(env, type, { space_id: b.space_id ? Number(b.space_id) : null, deal_id: b.deal_id || null, region_id: b.region_id ? Number(b.region_id) : null, channel: b.channel ? String(b.channel).slice(0, 20) : null, source: b.source ? String(b.source).slice(0, 40) : null });
  return json({ ok: true });
}
