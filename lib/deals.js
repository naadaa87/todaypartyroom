// 딜 엔진 — 수동 딜 + 오토딜(공실 기반 가상 딜) 계산, 우선순위, 정렬
import { all, one, run, insertId } from './db.js';
import { todayStr, nowStr, addDays, parseJSON, isWeekendOrHoliday, slotStartDT, minusMinutes, fmtDT, dayOfWeek } from './util.js';
import { getAutomationMap, getVacancyMap, effStatus, isPaused, autoExcluded } from './availability.js';

export const TYPE_ORDER = { FLASH: 6, TIME: 5, HOT: 4, TODAY: 3, TOMORROW: 2, EVENT: 1 };
export const ORIGIN_LABEL = { AUTO: '자동', SCHEDULE: '반복', MANUAL: '직접' };
export const TYPE_LABEL = { TODAY: '당일', TOMORROW: '전날', TIME: '타임딜', HOT: '핫딜', FLASH: '반짝', EVENT: '이벤트' };
export const TYPE_LONG = { TODAY: '당일예약할인', TOMORROW: '전날예약할인', TIME: '타임딜', HOT: '핫딜', FLASH: '반짝딜', EVENT: '이벤트' };
export const TYPE_ABBR = { TODAY: 'TD', TOMORROW: 'TM', TIME: 'TI', HOT: 'HT', FLASH: 'FL', EVENT: 'EV' };
export const TYPES = Object.keys(TYPE_ORDER);

export function slotBasePrice(slot, dateStr, holidays) {
  return isWeekendOrHoliday(dateStr, holidays) ? slot.price_weekend : slot.price_weekday;
}
export function roundPrice(p) { return Math.max(0, Math.round(p / 1000) * 1000); }
export function applyDiscount(base, mode, value, floor = 0) {
  let p = base;
  if (mode === 'RATE') p = base * (100 - value) / 100;
  else if (mode === 'AMOUNT') p = base - value;
  else if (mode === 'FIXED') p = value;
  p = roundPrice(p);
  if (floor && p < floor) p = floor;
  return Math.min(p, base);
}
export function rateOf(base, price) { return base > 0 ? Math.round((base - price) / base * 100) : 0; }

/** 공간 필터 SQL 조각 */
function spaceFilter({ areaIds, spaceIds, themeId, hostId }, today) {
  const sql = [`s.status = 'approved'`, `((s.subscription_status IN ('trial','active') AND (s.subscription_until IS NULL OR s.subscription_until >= ?)) OR (s.subscription_status = 'cancelled' AND s.subscription_until >= ?))`];
  const params = [today, today];
  if (areaIds && areaIds.length) { sql.push(`s.region_id IN (${areaIds.map(() => '?').join(',')})`); params.push(...areaIds); }
  if (spaceIds && spaceIds.length) { sql.push(`s.id IN (${spaceIds.map(() => '?').join(',')})`); params.push(...spaceIds); }
  if (themeId) { sql.push(`s.id IN (SELECT space_id FROM space_themes WHERE theme_id = ?)`); params.push(themeId); }
  if (hostId) { sql.push(`s.host_id = ?`); params.push(hostId); }
  return { sql: sql.join(' AND '), params };
}

/** 딜 노출 마감 시각: 패키지 슬롯은 시작 N분 전, 시간제 슬롯은 운영 종료 2시간 전(최소 이용 시간 감안) */
export function slotDeadline(slot, dateStr, cutoff = 60) {
  if (slot.kind === 'hourly') return minusMinutes(slotEnd(slot, dateStr), Math.max(cutoff, 120));
  return minusMinutes(slotStartDT(dateStr, slot.start_time), cutoff);
}
export function slotEnd(slot, dateStr) {
  // 종료가 시작보다 이르면 익일
  const end = slot.end_time <= slot.start_time ? `${addDays(dateStr, 1)}T${slot.end_time}` : `${dateStr}T${slot.end_time}`;
  return end;
}

/** 오토딜 가격 계산. 불가하면 null */
export function computeAuto(rule, slot, dateStr, now, settings) {
  if (!rule || !rule.enabled) return null;
  const today = now.slice(0, 10);
  const tomorrow = addDays(today, 1);
  if (dateStr !== today && dateStr !== tomorrow) return null;
  const exDays = parseJSON(rule.exclude_days_json, []);
  const exSlots = parseJSON(rule.exclude_slots_json, []);
  if (exDays.includes(dayOfWeek(dateStr))) return null;
  if (exSlots.includes(slot.id)) return null;
  if (rule.exclude_from && rule.exclude_to && dateStr >= rule.exclude_from && dateStr <= rule.exclude_to) return null;
  let rate = dateStr === today ? rule.today_rate : rule.tomorrow_rate;
  if (dateStr === today) {
    const steps = parseJSON(rule.steps_json, []).filter(s => s && s.from && s.rate).sort((a, b) => a.from.localeCompare(b.from));
    const t = now.slice(11, 16);
    for (const st of steps) if (st.from <= t) rate = Math.max(rate, Number(st.rate));
  }
  if (!rate || rate <= 0) return null;
  const base = slotBasePrice(slot, dateStr, settings.holidays);
  const floors = parseJSON(rule.floor_json, {});
  const floor = Number(floors[slot.id] || floors[String(slot.id)] || 0);
  const price = applyDiscount(base, 'RATE', rate, floor);
  if (price >= base) return null;
  return { base, price, rate: rateOf(base, price) };
}

/**
 * 딜 조회. opts: { areaIds, spaceIds, themeId, hostId, dateFilter: 'today'|'tomorrow'|'upcoming'|'all', types, includeScheduled, limit }
 * 반환: 카드 배열 (딜 단위, 유효 대상 목록 포함)
 */
export async function loadDeals(env, settings, opts = {}) {
  const db = env.DB;
  const now = nowStr();
  const today = now.slice(0, 10);
  const tomorrow = addDays(today, 1);
  const cutoff = settings.deal_cutoff_minutes || 60;
  const f = spaceFilter(opts, today);

  const spaces = await all(db, `SELECT s.*, r.name AS region_name, r.slug AS region_slug, r.parent_id AS region_parent FROM spaces s LEFT JOIN regions r ON r.id = s.region_id WHERE ${f.sql}`, f.params);
  if (!spaces.length) return [];
  const spaceById = new Map(spaces.map(s => [s.id, s]));
  const slots = await all(db, `SELECT sl.* FROM slots sl JOIN spaces s ON s.id = sl.space_id WHERE sl.active = 1 AND ${f.sql} ORDER BY sl.sort, sl.id`, f.params);
  const slotById = new Map(slots.map(s => [s.id, s]));
  const entries = []; // 대상 단위 항목

  // 1) 수동 딜(+이미 실체화된 오토딜)
  const deals = await all(db, `SELECT d.* FROM deals d JOIN spaces s ON s.id = d.space_id WHERE d.status != 'ENDED' AND d.ends_at > ? AND ${f.sql}`, [now, ...f.params]);
  const seenAuto = new Set();
  for (const d of deals) {
    const targets = parseJSON(d.targets_json, []);
    const snap = parseJSON(d.base_price_snapshot, {});
    if (d.quantity != null && d.claimed >= d.quantity) continue;
    for (const t of targets) {
      const slot = slotById.get(Number(t.slot_id)); if (!slot) continue;
      const start = slotStartDT(t.date, slot.start_time);
      const endEff = [d.ends_at, slotDeadline(slot, t.date, cutoff)].sort()[0];
      if (endEff <= now) continue;
      const base = snap[`${slot.id}|${t.date}`] || snap[slot.id] || slotBasePrice(slot, t.date, settings.holidays);
      const price = d.type === 'EVENT' ? base : applyDiscount(base, d.discount_mode, d.discount_value, d.floor_price);
      const key = `${d.space_id}|${slot.id}|${t.date}`;
      if (d.origin === 'AUTO') seenAuto.add(key);
      entries.push({ key, dealId: d.id, deal: d, type: d.type, origin: d.origin, space: spaceById.get(d.space_id), slot, date: t.date, base, price, rate: rateOf(base, price), startsAt: d.starts_at, endsAt: endEff, scheduled: d.starts_at > now, slotStart: start });
    }
  }

  // 2) 오토딜(가상) — 공실은 캘린더 표시 > 캘린더 연동 > 매주 반복 패턴 순으로 판단
  const rules = await all(db, `SELECT a.* FROM auto_rules a JOIN spaces s ON s.id = a.space_id WHERE a.enabled = 1 AND ${f.sql}`, f.params);
  if (rules.length) {
    const ruleSpaceIds = rules.map(r => r.space_id);
    const monthStart = today.slice(0, 7) + '-01';
    const [autoMap, vacMap] = await Promise.all([getAutomationMap(db, ruleSpaceIds), getVacancyMap(db, ruleSpaceIds, monthStart, tomorrow)]);
    const slotsBySpace = new Map();
    for (const sl of slots) { if (!slotsBySpace.has(sl.space_id)) slotsBySpace.set(sl.space_id, []); slotsBySpace.get(sl.space_id).push(sl); }
    for (const rule of rules) {
      const auto = autoMap.get(rule.space_id) || null;
      const pattern = auto ? auto.pattern : {};
      const ruleDay = (rule.updated_at || '').slice(0, 10);
      const countFrom = ruleDay > monthStart ? (ruleDay > today ? today : ruleDay) : monthStart;
      let n = 0;
      for (let d = countFrom; d <= tomorrow; d = addDays(d, 1)) {
        for (const slot of slotsBySpace.get(rule.space_id) || []) {
          if (effStatus(vacMap, pattern, rule.space_id, slot.id, d).status !== 'vacant') continue;
          if (isPaused(auto, d) || autoExcluded(rule, slot.id, d)) continue;
          n += 1; // 월 한도: 이번 달(규칙 저장일 이후) 자동 할인 대상이 된 칸 수
          if (rule.monthly_cap && n > rule.monthly_cap) continue;
          if (d !== today && d !== tomorrow) continue;
          const key = `${rule.space_id}|${slot.id}|${d}`;
          if (seenAuto.has(key)) continue;
          const calc = computeAuto(rule, slot, d, now, settings); if (!calc) continue;
          const start = slotStartDT(d, slot.start_time);
          const endEff = slotDeadline(slot, d, cutoff);
          if (endEff <= now) continue;
          const type = d === today ? 'TODAY' : 'TOMORROW';
          entries.push({ key, dealId: `A-${rule.space_id}-${slot.id}-${d}`, virtual: true, deal: null, type, origin: 'AUTO', space: spaceById.get(rule.space_id), slot, date: d, base: calc.base, price: calc.price, rate: calc.rate, startsAt: now, endsAt: endEff, scheduled: false, slotStart: start });
        }
      }
    }
  }

  // 3) 날짜/유형 필터
  const df = opts.dateFilter || 'all';
  const upTo = addDays(today, 14);
  const filtered = entries.filter(e => {
    if (!opts.includeScheduled && e.scheduled) return false;
    if (df === 'today' && e.date !== today) return false;
    if (df === 'tomorrow' && e.date !== tomorrow) return false;
    if (df === 'upcoming' && (e.date < today || e.date > upTo)) return false;
    if (opts.types && opts.types.length && !opts.types.includes(e.type)) return false;
    return true;
  });

  // 4) 같은 슬롯·날짜에 여러 딜 → 우선순위, 이벤트는 별도 부착
  const bestByKey = new Map(); const eventsByKey = new Map();
  for (const e of filtered) {
    if (e.type === 'EVENT') { if (!eventsByKey.has(e.key)) eventsByKey.set(e.key, []); eventsByKey.get(e.key).push(e); continue; }
    if (opts.keepAll) { bestByKey.set(e.key + '#' + e.dealId, e); continue; } // 미리보기용: 겹치는 딜도 모두
    const cur = bestByKey.get(e.key);
    if (!cur || TYPE_ORDER[e.type] > TYPE_ORDER[cur.type] || (TYPE_ORDER[e.type] === TYPE_ORDER[cur.type] && e.price < cur.price)) bestByKey.set(e.key, e);
  }
  // 5) 딜 단위 카드로 재조립
  const cards = new Map();
  const push = (e) => {
    const id = String(e.dealId);
    if (!cards.has(id)) cards.set(id, { id, virtual: !!e.virtual, type: e.type, origin: e.origin, deal: e.deal, space: e.space, targets: [], events: [] });
    const c = cards.get(id);
    c.targets.push({ key: e.key, slot: e.slot, date: e.date, base: e.base, price: e.price, rate: e.rate, endsAt: e.endsAt, startsAt: e.startsAt, scheduled: e.scheduled, slotStart: e.slotStart, events: eventsByKey.get(e.key) || [] });
  };
  for (const e of bestByKey.values()) push(e);
  for (const list of eventsByKey.values()) for (const e of list) push(e);
  const out = [];
  for (const c of cards.values()) {
    c.targets.sort((a, b) => a.slotStart.localeCompare(b.slotStart));
    c.next = c.targets[0];
    c.minPrice = Math.min(...c.targets.map(t => t.price));
    c.maxRate = Math.max(...c.targets.map(t => t.rate));
    c.endsAt = c.next.endsAt; c.scheduled = c.next.scheduled;
    c.quantity = c.deal ? c.deal.quantity : null; c.claimed = c.deal ? c.deal.claimed : 0;
    c.remaining = c.quantity != null ? Math.max(0, c.quantity - c.claimed) : null;
    c.benefit = c.deal ? c.deal.benefit_text : ''; c.dealLink = (c.deal && c.deal.deal_link) || c.space.deal_link || '';
    c.title = c.deal && c.deal.title ? c.deal.title : '';
    out.push(c);
  }
  out.sort((a, b) => (a.scheduled - b.scheduled) || a.endsAt.localeCompare(b.endsAt) || (b.maxRate - a.maxRate));
  return opts.limit ? out.slice(0, opts.limit) : out;
}

/** 단일 카드 조회 (실제 id 또는 가상 id) */
export async function loadDealById(env, settings, id) {
  const sid = String(id);
  let spaceId;
  if (sid.startsWith('A-')) spaceId = Number(sid.split('-')[1]);
  else { const d = await one(env.DB, 'SELECT space_id FROM deals WHERE id = ?', [Number(sid)]); if (!d) return null; spaceId = d.space_id; }
  const cards = await loadDeals(env, settings, { spaceIds: [spaceId], dateFilter: 'all', includeScheduled: true });
  const found = cards.find(c => c.id === sid);
  if (found || !sid.startsWith('A-')) return found || null;
  // 가상 오토딜이 이미 실체화된 경우 → 실제 딜 카드
  const [, , slotId, y, m, d] = sid.split('-');
  const key = `${spaceId}|${slotId}|${y}-${m}-${d}`;
  return cards.find(c => c.origin === 'AUTO' && c.targets.some(t => t.key === key)) || null;
}

/** 가상 오토딜을 실제 deals 행으로 실체화 → deal id */
export async function materializeAuto(env, settings, virtualId) {
  const [, spaceId, slotId, y, m, d] = virtualId.split('-');
  const date = `${y}-${m}-${d}`;
  const existing = await one(env.DB, `SELECT id FROM deals WHERE space_id = ? AND origin = 'AUTO' AND status != 'ENDED' AND targets_json = ?`, [Number(spaceId), JSON.stringify([{ date, slot_id: Number(slotId) }])]);
  if (existing) return existing.id;
  const card = await loadDealById(env, settings, virtualId);
  if (!card) return null;
  const t = card.next;
  return await insertId(env.DB, `INSERT INTO deals (space_id, type, origin, targets_json, discount_mode, discount_value, floor_price, quantity, starts_at, ends_at, status, base_price_snapshot, title) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [Number(spaceId), card.type, 'AUTO', JSON.stringify([{ date, slot_id: Number(slotId) }]), 'FIXED', t.price, 0, null, nowStr(), t.endsAt, 'ACTIVE', JSON.stringify({ [`${slotId}|${date}`]: t.base }), `${TYPE_LONG[card.type]} ${t.slot.name}`]);
}

/** 만료 딜 상태 정리(요청 시 가볍게 실행) */
export async function tick(env) {
  const now = nowStr();
  await run(env.DB, `UPDATE deals SET status = 'ENDED', end_reason = 'EXPIRED' WHERE status != 'ENDED' AND ends_at <= ?`, [now]);
  await run(env.DB, `UPDATE deals SET status = 'ACTIVE' WHERE status = 'SCHEDULED' AND starts_at <= ?`, [now]);
  await run(env.DB, `UPDATE claims SET status = 'expired' WHERE status = 'issued' AND expires_at <= ?`, [now]);
}

/** 슬롯이 예약됨·휴무로 바뀌면 해당 대상 딜 종료/대상 제거 */
export async function endDealsForSlot(env, spaceId, slotId, date) {
  return endDealsForSlots(env, spaceId, [{ slot_id: slotId, date }]);
}
/** 여러 칸을 한 번에 처리 (캘린더 일괄 변경·캘린더 연동용) */
export async function endDealsForSlots(env, spaceId, items) {
  if (!items || !items.length) return 0;
  const keys = new Set(items.map(i => `${Number(i.slot_id)}|${i.date}`));
  const deals = await all(env.DB, `SELECT id, targets_json FROM deals WHERE space_id = ? AND status != 'ENDED'`, [spaceId]);
  const stmts = [];
  for (const d of deals) {
    const targets = parseJSON(d.targets_json, []);
    const rest = targets.filter(t => !keys.has(`${Number(t.slot_id)}|${t.date}`));
    if (rest.length === targets.length) continue;
    if (rest.length === 0) stmts.push(env.DB.prepare(`UPDATE deals SET status = 'ENDED', end_reason = 'SLOT_BOOKED' WHERE id = ?`).bind(d.id));
    else stmts.push(env.DB.prepare(`UPDATE deals SET targets_json = ? WHERE id = ?`).bind(JSON.stringify(rest), d.id));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return stmts.length;
}

export async function logEvent(env, type, { space_id = null, deal_id = null, region_id = null, channel = null, source = null } = {}) {
  try {
    const did = (deal_id != null && /^\d+$/.test(String(deal_id))) ? Number(deal_id) : null;
    await run(env.DB, `INSERT INTO event_log (type, space_id, deal_id, region_id, channel, source) VALUES (?,?,?,?,?,?)`, [type, space_id, did, region_id, channel, source]);
  } catch (e) { console.error('logEvent', e); }
}
