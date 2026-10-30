// GET /api/host/spaces/:id/deals — 딜 목록(진행·예정·최근 종료) / POST 새 딜
import { api, requireHost } from '../../../../../lib/auth.js';
import { run, all, one, insertId, getSettings } from '../../../../../lib/db.js';
import { json, err, readBody, toInt, clamp, todayStr, addDays, nowStr, parseJSON, slotStartDT, minutesBetween, fmtDT } from '../../../../../lib/util.js';
import { ownSpace } from '../../../../../lib/host-api.js';
import { loadDeals, slotBasePrice, applyDiscount, TYPE_LONG } from '../../../../../lib/deals.js';
const D = /^\d{4}-\d{2}-\d{2}$/, DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const settings = await getSettings(context.env.DB);
  const rows = await all(context.env.DB, `SELECT d.*, (SELECT COUNT(*) FROM claims c WHERE c.deal_id = d.id) AS claim_n, (SELECT COUNT(*) FROM claims c WHERE c.deal_id = d.id AND c.status = 'used') AS used_n FROM deals d WHERE d.space_id = ? AND (d.status != 'ENDED' OR d.ends_at >= ?) ORDER BY d.status = 'ENDED', d.ends_at`, [s.id, addDays(todayStr(), -30) + 'T00:00']);
  const live = s.status === 'approved' && ['trial', 'active', 'cancelled'].includes(s.subscription_status) ? await loadDeals(context.env, settings, { spaceIds: [s.id], dateFilter: 'all', includeScheduled: true }) : [];
  const auto = live.filter(c => c.virtual).map(c => ({ id: c.id, type: c.type, origin: 'AUTO', virtual: true, targets: c.targets.map(t => ({ date: t.date, slot_id: t.slot.id, slot: t.slot.name, base: t.base, price: t.price, rate: t.rate })), ends_at: c.endsAt, status: 'ACTIVE' }));
  return json({ ok: true, deals: rows.map(d => ({ ...d, targets: parseJSON(d.targets_json, []) })), auto });
});

export const onRequestPost = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  if (s.status !== 'approved') return err('공개(승인) 상태의 공간에서만 딜을 만들 수 있습니다.');
  if (!(['trial', 'active'].includes(s.subscription_status) || (s.subscription_status === 'cancelled' && s.subscription_until >= todayStr()))) return err('구독이 활성화된 뒤 딜을 만들 수 있습니다.');
  const b = await readBody(context.request);
  const type = ['TIME', 'HOT', 'FLASH', 'EVENT', 'TODAY', 'TOMORROW'].includes(b.type) ? b.type : null;
  if (!type) return err('딜 유형을 선택하세요.');
  const settings = await getSettings(context.env.DB);
  const now = nowStr(), today = todayStr(), tomorrow = addDays(today, 1);
  const slots = await all(context.env.DB, 'SELECT * FROM slots WHERE space_id = ? AND active = 1', [s.id]);
  const slotById = new Map(slots.map(x => [x.id, x]));
  let targets = (Array.isArray(b.targets) ? b.targets : []).map(t => ({ date: String(t.date || ''), slot_id: Number(t.slot_id) })).filter(t => D.test(t.date) && slotById.has(t.slot_id) && t.date >= today);
  targets = targets.filter((t, i, arr) => arr.findIndex(x => x.date === t.date && x.slot_id === t.slot_id) === i).slice(0, 60);
  if (!targets.length) return err('대상 날짜와 슬롯을 1개 이상 선택하세요.');
  if (type === 'TODAY' && targets.some(t => t.date !== today)) return err('당일 할인은 오늘 날짜만 선택할 수 있습니다.');
  if (type === 'TOMORROW' && targets.some(t => t.date !== tomorrow)) return err('전날 할인은 내일 날짜만 선택할 수 있습니다.');
  // 할인
  let mode = ['RATE', 'AMOUNT', 'FIXED'].includes(b.discount_mode) ? b.discount_mode : 'RATE';
  let value = toInt(b.discount_value, 0);
  if (type === 'EVENT') { mode = 'RATE'; value = 0; if (!b.benefit_text || String(b.benefit_text).trim().length < 2) return err('이벤트 혜택 내용을 입력하세요.'); }
  else {
    if (mode === 'RATE' && (value < 1 || value > 90)) return err('할인율은 1~90% 사이로 입력하세요.');
    if (mode !== 'RATE' && value < 1000) return err('금액은 1,000원 이상 입력하세요.');
    if (type === 'HOT' && mode === 'RATE' && value < 10) return err('핫딜은 10% 이상이어야 합니다.');
  }
  const floor = Math.max(0, toInt(b.floor_price, 0));
  // 기간
  const latestStart = targets.map(t => slotStartDT(t.date, slotById.get(t.slot_id).start_time)).sort().slice(-1)[0];
  let starts_at = DT.test(b.starts_at || '') && b.starts_at > now ? b.starts_at : now;
  let ends_at = DT.test(b.ends_at || '') ? b.ends_at : latestStart;
  if (type === 'FLASH') {
    const dur = clamp(toInt(b.duration_min, 120), 60, 180);
    starts_at = now; const d = new Date(now + ':00Z'); d.setUTCMinutes(d.getUTCMinutes() + dur); ends_at = fmtDT(d);
    const todayFlash = await one(context.env.DB, `SELECT COUNT(*) AS n FROM deals WHERE space_id = ? AND type = 'FLASH' AND created_at >= datetime('now', '-1 day')`, [s.id]);
    if (todayFlash.n >= 2) return err('반짝딜은 하루 2회까지 만들 수 있습니다.');
  }
  if (ends_at > latestStart) ends_at = latestStart;
  if (ends_at <= starts_at) return err('종료 시각이 시작 시각보다 늦어야 합니다.');
  if (type === 'TIME' && minutesBetween(starts_at, ends_at) > 24 * 60) return err('타임딜은 최대 24시간입니다.');
  if (type === 'HOT' && minutesBetween(starts_at, ends_at) > 30 * 24 * 60) return err('핫딜은 최대 30일입니다.');
  let quantity = b.quantity === '' || b.quantity == null ? null : clamp(toInt(b.quantity, 1), 1, 999);
  if (type === 'FLASH') quantity = clamp(toInt(b.quantity, 1), 1, 2);
  // 정가 스냅샷 + 30일 기준가 경고
  const snap = {}; let anyDiscount = false;
  for (const t of targets) { const sl = slotById.get(t.slot_id); const base = slotBasePrice(sl, t.date, settings.holidays); snap[`${t.slot_id}|${t.date}`] = base; if (type !== 'EVENT' && applyDiscount(base, mode, value, floor) < base) anyDiscount = true; }
  if (type !== 'EVENT' && !anyDiscount) return err('바닥가가 정가보다 높거나 할인 효과가 없습니다. 값을 확인하세요.');
  const raised = await one(context.env.DB, `SELECT COUNT(*) AS n FROM price_history p JOIN slots sl ON sl.id = p.slot_id WHERE sl.space_id = ? AND p.changed_at >= datetime('now', '-30 day') AND (p.new_weekday > p.old_weekday OR p.new_weekend > p.old_weekend)`, [s.id]);
  const title = String(b.title || '').trim().slice(0, 40) || `${TYPE_LONG[type]} ${[...new Set(targets.map(t => slotById.get(t.slot_id).name))].join('·')}`;
  const id = await insertId(context.env.DB, `INSERT INTO deals (space_id, type, origin, targets_json, discount_mode, discount_value, floor_price, quantity, starts_at, ends_at, status, benefit_text, deal_link, title, base_price_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [s.id, type, 'MANUAL', JSON.stringify(targets), mode, value, floor, quantity, starts_at, ends_at, starts_at > now ? 'SCHEDULED' : 'ACTIVE', String(b.benefit_text || '').slice(0, 200), /^https?:\/\//.test(b.deal_link || '') ? String(b.deal_link).slice(0, 500) : '', title, JSON.stringify(snap)]);
  // 같은 대상의 오토딜(실체화된 것) 종료
  const autos = await all(context.env.DB, `SELECT id, targets_json FROM deals WHERE space_id = ? AND origin = 'AUTO' AND status != 'ENDED'`, [s.id]);
  for (const a of autos) { const at = parseJSON(a.targets_json, []); if (at.some(x => targets.some(t => t.date === x.date && t.slot_id === Number(x.slot_id)))) await run(context.env.DB, `UPDATE deals SET status = 'ENDED', end_reason = 'REPLACED' WHERE id = ?`, [a.id]); }
  return json({ ok: true, id, warning: raised.n > 0 ? '최근 30일 안에 정가를 올린 기록이 있습니다. 할인 표시 기준가가 검토 대상이 될 수 있습니다.' : null });
});
