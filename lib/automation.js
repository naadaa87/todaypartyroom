// 자동 운영 — 반복 딜 생성, 캘린더(iCal) 연동, 7일 미리보기, 주기 실행
import { all, one, run, getSettings } from './db.js';
import { nowStr, todayStr, addDays, dayOfWeek, parseJSON, fmtDT, minutesBetween, minusMinutes, slotStartDT } from './util.js';
import { slotBasePrice, applyDiscount, rateOf, slotDeadline, slotEnd, computeAuto, loadDeals, tick, endDealsForSlots, TYPE_LONG } from './deals.js';
import { getAutomationMap, getVacancyMap, effStatus, isPaused, autoExcluded, parsePattern, DOW_KO } from './availability.js';

export const SCHEDULE_HORIZON_DAYS = 10;

const LIVE = `s.status = 'approved' AND ((s.subscription_status IN ('trial','active') AND (s.subscription_until IS NULL OR s.subscription_until >= ?)) OR (s.subscription_status = 'cancelled' AND s.subscription_until >= ?))`;

function addMinutes(dt, m) { const d = new Date(dt + ':00Z'); d.setUTCMinutes(d.getUTCMinutes() + m); return fmtDT(d); }

/** 반복 딜 1건이 특정 이용일에 만들 딜 계산 (DB 쓰기 없음) */
export function planScheduleDeal(sch, date, ctx) {
  const { now, slotById, vacMap, auto, settings } = ctx;
  const days = parseJSON(sch.days_json, []);
  if (!days.includes(dayOfWeek(date))) return null;
  if (sch.start_date && date < sch.start_date) return null;
  if (sch.end_date && date > sch.end_date) return null;
  if (parseJSON(sch.skip_dates_json, []).includes(date)) return null;
  if (isPaused(auto, date)) return { skip: '일시정지' };
  const pattern = auto ? auto.pattern : {};
  const targets = [];
  for (const id of parseJSON(sch.slot_ids_json, [])) {
    const slot = slotById.get(Number(id)); if (!slot || slot.space_id !== sch.space_id) continue;
    const st = effStatus(vacMap, pattern, sch.space_id, slot.id, date).status;
    if (st === 'booked' || st === 'closed') continue;
    if (sch.only_vacant && st !== 'vacant') continue;
    targets.push(slot);
  }
  if (!targets.length) return { skip: sch.only_vacant ? '비어 있는 슬롯 없음' : '대상 없음' };
  const cutoff = settings.deal_cutoff_minutes || 60;
  const opensAt = `${addDays(date, -Number(sch.lead_days || 0))}T${sch.open_time || '10:00'}`;
  const deadline = targets.map(sl => slotDeadline(sl, date, cutoff)).sort().slice(-1)[0];
  let endsAt = sch.duration_min ? addMinutes(opensAt, Number(sch.duration_min)) : deadline;
  if (endsAt > deadline) endsAt = deadline;
  if (endsAt <= opensAt) return { skip: '여는 시각이 마감 이후' };
  if (endsAt <= now) return { skip: '이미 지남' };
  const startsAt = opensAt < now ? now : opensAt;
  const snap = {}; let discounted = false; const prices = [];
  for (const sl of targets) {
    const base = slotBasePrice(sl, date, settings.holidays);
    snap[`${sl.id}|${date}`] = base;
    const price = sch.type === 'EVENT' ? base : applyDiscount(base, sch.discount_mode, sch.discount_value, sch.floor_price);
    if (price < base) discounted = true;
    prices.push({ slot: sl.name, slot_id: sl.id, base, price, rate: rateOf(base, price) });
  }
  if (sch.type !== 'EVENT' && !discounted) return { skip: '바닥가 때문에 할인 없음' };
  return { date, targets: targets.map(sl => ({ date, slot_id: sl.id })), startsAt, endsAt, snap, prices };
}

/**
 * 반복 딜 생성: 오늘부터 SCHEDULE_HORIZON_DAYS 안에서 아직 만들지 않은 날짜의 딜을 만듭니다.
 * opts: { spaceIds, scheduleIds, limit }
 */
export async function runSchedules(env, settings, opts = {}) {
  const db = env.DB;
  const now = nowStr(), today = todayStr(), until = addDays(today, SCHEDULE_HORIZON_DAYS);
  const params = [today, today];
  let where = `ds.enabled = 1 AND ${LIVE}`;
  if (opts.spaceIds && opts.spaceIds.length) { where += ` AND ds.space_id IN (${opts.spaceIds.map(() => '?').join(',')})`; params.push(...opts.spaceIds); }
  if (opts.scheduleIds && opts.scheduleIds.length) { where += ` AND ds.id IN (${opts.scheduleIds.map(() => '?').join(',')})`; params.push(...opts.scheduleIds); }
  let schedules;
  try { schedules = await all(db, `SELECT ds.* FROM deal_schedules ds JOIN spaces s ON s.id = ds.space_id WHERE ${where}`, params); }
  catch (e) { if (/no such table/i.test(String(e.message || e))) return 0; throw e; }
  if (!schedules.length) return 0;
  const spaceIds = [...new Set(schedules.map(x => x.space_id))];
  const ph = spaceIds.map(() => '?').join(',');
  const [slots, autoMap, vacMap, runs] = await Promise.all([
    all(db, `SELECT * FROM slots WHERE active = 1 AND space_id IN (${ph})`, spaceIds),
    getAutomationMap(db, spaceIds),
    getVacancyMap(db, spaceIds, today, until),
    all(db, `SELECT schedule_id, date FROM schedule_runs WHERE date >= ? AND schedule_id IN (${schedules.map(() => '?').join(',')})`, [today, ...schedules.map(x => x.id)]),
  ]);
  const slotById = new Map(slots.map(s => [s.id, s]));
  const done = new Set(runs.map(r => `${r.schedule_id}|${r.date}`));
  const stmts = [];
  const limit = opts.limit || 120;
  let made = 0;
  for (const sch of schedules) {
    const ctx = { now, slotById, vacMap, auto: autoMap.get(sch.space_id) || null, settings };
    for (let d = today; d <= until; d = addDays(d, 1)) {
      if (made >= limit) break;
      if (done.has(`${sch.id}|${d}`)) continue;
      const plan = planScheduleDeal(sch, d, ctx);
      if (!plan || plan.skip) continue;
      const title = (sch.name || TYPE_LONG[sch.type]).slice(0, 40);
      stmts.push(db.prepare(`INSERT INTO deals (space_id, type, origin, targets_json, discount_mode, discount_value, floor_price, quantity, starts_at, ends_at, status, benefit_text, deal_link, title, base_price_snapshot) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(sch.space_id, sch.type, 'SCHEDULE', JSON.stringify(plan.targets), sch.type === 'EVENT' ? 'RATE' : sch.discount_mode, sch.type === 'EVENT' ? 0 : sch.discount_value, sch.floor_price || 0, sch.quantity ?? null, plan.startsAt, plan.endsAt, plan.startsAt > now ? 'SCHEDULED' : 'ACTIVE', sch.benefit_text || '', sch.deal_link || '', title, JSON.stringify(plan.snap)));
      // 같은 트랜잭션 안에서 방금 만든 딜 id 기록 — 동시에 두 번 실행되면 기본키 충돌로 전체가 취소돼 중복이 생기지 않습니다
      stmts.push(db.prepare(`INSERT INTO schedule_runs (schedule_id, date, deal_id) VALUES (?, ?, last_insert_rowid())`).bind(sch.id, d));
      made += 1;
    }
  }
  if (stmts.length) {
    try { await db.batch(stmts); }
    catch (e) { if (/UNIQUE|constraint/i.test(String(e.message || e))) return 0; throw e; }
  }
  return made;
}

/**
 * 반복 딜로 만든 딜 정리. 아직 열리지 않은(예정) 딜과, 코드가 발급되지 않은 진행 중 딜(includeActive)을 지웁니다.
 */
export async function clearScheduleDeals(env, { scheduleIds = null, spaceId = null, includeActive = false } = {}) {
  const db = env.DB;
  let where = '1=1'; const params = [];
  if (scheduleIds && scheduleIds.length) { where += ` AND r.schedule_id IN (${scheduleIds.map(() => '?').join(',')})`; params.push(...scheduleIds); }
  if (spaceId) { where += ` AND d.space_id = ?`; params.push(spaceId); }
  const rows = await all(db, `SELECT r.schedule_id, r.date, d.id AS deal_id, d.status, d.claimed FROM schedule_runs r JOIN deals d ON d.id = r.deal_id WHERE ${where} AND d.status != 'ENDED'`, params);
  const stmts = [];
  for (const r of rows) {
    if (r.claimed > 0) continue;
    if (r.status === 'SCHEDULED') {
      stmts.push(db.prepare(`DELETE FROM deals WHERE id = ?`).bind(r.deal_id));
      stmts.push(db.prepare(`DELETE FROM schedule_runs WHERE schedule_id = ? AND date = ?`).bind(r.schedule_id, r.date));
    } else if (includeActive) {
      stmts.push(db.prepare(`UPDATE deals SET status = 'ENDED', end_reason = 'SCHEDULE_OFF' WHERE id = ?`).bind(r.deal_id));
      stmts.push(db.prepare(`DELETE FROM schedule_runs WHERE schedule_id = ? AND date = ?`).bind(r.schedule_id, r.date));
    }
  }
  if (stmts.length) await db.batch(stmts);
  return stmts.length;
}

/* ---------------- 캘린더(iCal) 연동 ---------------- */

function unfold(text) { return String(text || '').replace(/\r\n/g, '\n').replace(/\n[ \t]/g, ''); }
function icsDate(prop, value) {
  const v = String(value || '').trim();
  const isDate = /VALUE=DATE(?!-)/i.test(prop) || /^\d{8}$/.test(v);
  let m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (isDate && m) return { dt: `${m[1]}-${m[2]}-${m[3]}T00:00`, allDay: true };
  m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  if (m[7]) { // UTC → 한국 시간
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + 9 * 3600 * 1000);
    return { dt: fmtDT(d), allDay: false };
  }
  return { dt: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`, allDay: false }; // TZID 지정·지역 시간은 한국 시간으로 간주
}
/** .ics 문자열 → [{start, end, allDay, summary}] (취소된 일정 제외) */
export function parseIcs(text) {
  const lines = unfold(text).split('\n');
  const out = []; let ev = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (line === 'END:VEVENT') {
      if (ev && ev.start && ev.status !== 'CANCELLED') {
        let end = ev.end;
        if (!end) end = ev.allDay ? { dt: addDays(ev.start.dt.slice(0, 10), 1) + 'T00:00' } : { dt: addMinutes(ev.start.dt, 60) };
        out.push({ start: ev.start.dt, end: end.dt, allDay: !!ev.start.allDay, summary: ev.summary || '' });
      }
      ev = null; continue;
    }
    if (!ev) continue;
    const i = line.indexOf(':'); if (i < 0) continue;
    const prop = line.slice(0, i), val = line.slice(i + 1), name = prop.split(';')[0].toUpperCase();
    if (name === 'DTSTART') { ev.start = icsDate(prop, val); if (ev.start) ev.allDay = ev.start.allDay; }
    else if (name === 'DTEND') ev.end = icsDate(prop, val);
    else if (name === 'STATUS') ev.status = val.trim().toUpperCase();
    else if (name === 'SUMMARY') ev.summary = val.slice(0, 80);
  }
  return out;
}

/** 일정 목록 → 예약으로 볼 (slot_id, date) 집합. 시간제 슬롯은 부분 예약이 가능해서 제외합니다 */
export function bookedFromEvents(events, slots, from, to, includeAllDay = true) {
  const booked = new Set();
  const evs = events.filter(e => includeAllDay || !e.allDay);
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const sl of slots) {
      if (sl.kind === 'hourly') continue;
      const s = slotStartDT(d, sl.start_time), e = slotEnd(sl, d);
      // 종일 일정은 그 날짜의 슬롯만, 시간 일정은 시간이 겹치는 슬롯을 예약으로 봅니다
      if (evs.some(ev => ev.allDay ? (d >= ev.start.slice(0, 10) && d < ev.end.slice(0, 10)) : (ev.start < e && ev.end > s))) booked.add(`${sl.id}|${d}`);
    }
  }
  return booked;
}

export async function syncIcal(env, settings, spaceId) {
  const db = env.DB;
  const auto = (await getAutomationMap(db, [spaceId])).get(spaceId);
  if (!auto || !auto.ical_url) return { ok: false, message: '연동 주소가 없습니다.' };
  const stamp = nowStr();
  const save = (msg) => run(db, `UPDATE space_automation SET ical_last_sync = ?, ical_last_result = ? WHERE space_id = ?`, [stamp, msg.slice(0, 300), spaceId]);
  let text;
  try {
    const res = await fetch(auto.ical_url, { headers: { accept: 'text/calendar, text/plain, */*' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) { const m = `캘린더 주소에서 오류 응답(${res.status})을 받았습니다.`; await save(m); return { ok: false, message: m }; }
    text = await res.text();
  } catch (e) { const m = '캘린더 주소에 연결하지 못했습니다. 주소가 맞는지, 공개(비공개 iCal) 주소인지 확인하세요.'; await save(m); return { ok: false, message: m }; }
  if (!/BEGIN:VCALENDAR/i.test(text)) { const m = '캘린더(.ics) 형식이 아닙니다. iCal 주소를 넣어 주세요.'; await save(m); return { ok: false, message: m }; }
  if (text.length > 3_000_000) text = text.slice(0, 3_000_000);
  const events = parseIcs(text);
  const today = todayStr(), to = addDays(today, 45);
  const slots = await all(db, `SELECT * FROM slots WHERE space_id = ? AND active = 1`, [spaceId]);
  const booked = bookedFromEvents(events, slots, today, to, !!auto.ical_allday);
  const existing = await all(db, `SELECT slot_id, date, status, source FROM vacancies WHERE space_id = ? AND date BETWEEN ? AND ?`, [spaceId, today, to]);
  const exMap = new Map(existing.map(r => [`${r.slot_id}|${r.date}`, r]));
  const stmts = []; const newlyBooked = [];
  for (const key of booked) {
    const ex = exMap.get(key);
    if (ex && (ex.status === 'booked' || (ex.status === 'closed' && ex.source !== 'ical'))) continue;
    const [slotId, date] = key.split('|');
    stmts.push(db.prepare(`INSERT INTO vacancies (space_id, slot_id, date, status, source, updated_at) VALUES (?,?,?,'booked','ical',datetime('now')) ON CONFLICT(space_id, slot_id, date) DO UPDATE SET status = 'booked', source = 'ical', updated_at = datetime('now')`).bind(spaceId, Number(slotId), date));
    newlyBooked.push({ slot_id: Number(slotId), date });
  }
  let released = 0;
  for (const r of existing) {
    if (r.source === 'ical' && !booked.has(`${r.slot_id}|${r.date}`)) { stmts.push(db.prepare(`DELETE FROM vacancies WHERE space_id = ? AND slot_id = ? AND date = ?`).bind(spaceId, r.slot_id, r.date)); released++; }
  }
  for (let i = 0; i < stmts.length; i += 80) await db.batch(stmts.slice(i, i + 80));
  if (newlyBooked.length) await endDealsForSlots(env, spaceId, newlyBooked);
  const msg = `일정 ${events.length}건 확인 · 예약됨 ${booked.size}칸${newlyBooked.length ? ` (새로 ${newlyBooked.length}칸)` : ''}${released ? ` · 풀림 ${released}칸` : ''}`;
  await save(msg);
  return { ok: true, message: msg, events: events.length, booked: booked.size, added: newlyBooked.length, released };
}

/* ---------------- 7일 미리보기 ---------------- */

export async function buildPreview(env, settings, space, days = 7) {
  const db = env.DB;
  const now = nowStr(), today = todayStr(), until = addDays(today, days - 1);
  const [slots, autoMap, vacMap, rule, schedules] = await Promise.all([
    all(db, `SELECT * FROM slots WHERE space_id = ? AND active = 1 ORDER BY sort, id`, [space.id]),
    getAutomationMap(db, [space.id]),
    getVacancyMap(db, [space.id], today, until),
    one(db, `SELECT * FROM auto_rules WHERE space_id = ?`, [space.id]),
    all(db, `SELECT * FROM deal_schedules WHERE space_id = ? AND enabled = 1`, [space.id]),
  ]);
  const auto = autoMap.get(space.id) || null;
  const pattern = auto ? auto.pattern : {};
  const cards = await loadDeals(env, settings, { spaceIds: [space.id], dateFilter: 'all', includeScheduled: true, keepAll: true });
  const dealByKey = new Map();
  for (const c of cards) for (const t of c.targets) { if (!dealByKey.has(t.key)) dealByKey.set(t.key, []); dealByKey.get(t.key).push({ type: c.type, origin: c.origin, price: t.price, base: t.base, rate: t.rate, startsAt: t.startsAt, endsAt: t.endsAt, scheduled: t.scheduled, title: c.title }); }
  const slotById = new Map(slots.map(s => [s.id, s]));
  const live = space.status === 'approved';
  const dates = []; for (let d = today; d <= until; d = addDays(d, 1)) dates.push(d);
  const grid = slots.map(sl => ({
    slot: { id: sl.id, name: sl.name, start: sl.start_time, end: sl.end_time },
    cells: dates.map(d => {
      const st = effStatus(vacMap, pattern, space.id, sl.id, d);
      const key = `${space.id}|${sl.id}|${d}`;
      const items = (dealByKey.get(key) || []).slice();
      const notes = [];
      const paused = isPaused(auto, d);
      const past = d <= addDays(today, 1) && slotDeadline(sl, d, settings.deal_cutoff_minutes) <= now;
      if (past) notes.push('마감됨');
      // 아직 열리지 않은 날짜의 자동 할인 계획
      if (rule && rule.enabled && st.status === 'vacant' && !paused && !autoExcluded(rule, sl.id, d) && !items.some(i => i.origin === 'AUTO')) {
        const base = slotBasePrice(sl, d, settings.holidays);
        const floors = parseJSON(rule.floor_json, {}); const floor = Number(floors[sl.id] || 0);
        if (d > addDays(today, 1)) {
          const p1 = applyDiscount(base, 'RATE', rule.tomorrow_rate, floor), p0 = applyDiscount(base, 'RATE', rule.today_rate, floor);
          items.push({ type: 'PLAN', origin: 'AUTO', base, plan: `전날 ${won(p1)}(${rateOf(base, p1)}%) → 당일 ${won(p0)}(${rateOf(base, p0)}%)` });
        }
      } else if (rule && rule.enabled && st.status === 'vacant' && !paused && autoExcluded(rule, sl.id, d)) notes.push('자동 할인 제외');
      // 반복 딜 중 아직 만들어지지 않은 계획
      for (const sch of schedules) {
        const plan = planScheduleDeal(sch, d, { now, slotById, vacMap, auto, settings });
        if (!plan || plan.skip) continue;
        if (items.some(i => i.origin === 'SCHEDULE' && i.title === (sch.name || TYPE_LONG[sch.type]).slice(0, 40))) continue;
        const pr = plan.prices.find(p => p.slot_id === sl.id); if (!pr) continue;
        items.push({ type: sch.type, origin: 'SCHEDULE', base: pr.base, price: pr.price, rate: pr.rate, startsAt: plan.startsAt, endsAt: plan.endsAt, scheduled: true, title: sch.name, planned: true });
      }
      if (paused) notes.push('일시정지');
      // 손님에게 실제로 보일 딜(우선순위 → 낮은 가격)
      const ORDER = { FLASH: 6, TIME: 5, HOT: 4, TODAY: 3, TOMORROW: 2 };
      let win = null;
      for (const it of items) { if (!ORDER[it.type]) continue; if (!win || ORDER[it.type] > ORDER[win.type] || (ORDER[it.type] === ORDER[win.type] && it.price < win.price)) win = it; }
      if (win) win.shown = true; else { const plan = items.find(i => i.type === 'PLAN'); if (plan) plan.shown = true; }
      return { date: d, status: st.status, source: st.source, items, notes };
    }),
  }));
  return { live, dates: dates.map(d => ({ date: d, dow: DOW_KO[dayOfWeek(d)], today: d === today })), grid, rule: rule ? { enabled: !!rule.enabled, today_rate: rule.today_rate, tomorrow_rate: rule.tomorrow_rate } : null, paused_until: auto ? auto.paused_until : null };
}
function won(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }

/* ---------------- 주기 실행 (요청이 들어올 때 백그라운드로) ---------------- */
let memLast = 0;
export async function maybeRunAutomation(env) {
  if (Date.now() - memLast < 5 * 60 * 1000) return;
  memLast = Date.now();
  const db = env.DB;
  try {
    const now = nowStr();
    const row = await one(db, `SELECT value FROM settings WHERE key = 'automation_last_run'`);
    if (row && row.value && minutesBetween(row.value, now) < 10) return;
    await run(db, `INSERT INTO settings (key, value) VALUES ('automation_last_run', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [now]);
    const settings = await getSettings(db);
    await tick(env);
    await runSchedules(env, settings, {});
    const due = await all(db, `SELECT space_id FROM space_automation WHERE ical_url != '' AND (ical_last_sync IS NULL OR ical_last_sync < ?) LIMIT 5`, [minusMinutes(now, 30)]);
    for (const d of due) { try { await syncIcal(env, settings, d.space_id); } catch (e) { console.error('ical', e); } }
  } catch (e) {
    if (!/no such table/i.test(String(e.message || e))) console.error('automation', e);
  }
}
