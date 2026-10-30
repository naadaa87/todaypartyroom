// 공실 판단 — 캘린더에 직접 표시한 값 > 캘린더 연동(iCal) > 매주 반복 패턴 순으로 적용
import { all } from './db.js';
import { dayOfWeek, parseJSON } from './util.js';

export const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** pattern_json → { [slotId]: ['vacant'|'closed'|'', x7] } */
export function parsePattern(json) {
  const p = parseJSON(json, {});
  const out = {};
  if (p && typeof p === 'object') {
    for (const [k, v] of Object.entries(p)) {
      if (!Array.isArray(v)) continue;
      out[String(k)] = Array.from({ length: 7 }, (_, i) => (['vacant', 'closed'].includes(v[i]) ? v[i] : ''));
    }
  }
  return out;
}

export function patternStatus(pattern, slotId, date) {
  const row = pattern && pattern[String(slotId)];
  return row ? row[dayOfWeek(date)] || '' : '';
}

/**
 * 실제 공실 상태
 * vacMap: Map(`${spaceId}|${slotId}|${date}` → {status, source})
 * 반환: { status: 'vacant'|'booked'|'closed'|'', source: 'manual'|'ical'|'pattern'|'' }
 */
export function effStatus(vacMap, pattern, spaceId, slotId, date) {
  const v = vacMap.get(`${spaceId}|${slotId}|${date}`);
  if (v) return { status: v.status, source: v.source || 'manual' };
  const p = patternStatus(pattern, slotId, date);
  return p ? { status: p, source: 'pattern' } : { status: '', source: '' };
}

export function isPaused(auto, date) {
  return !!(auto && auto.paused_until && date <= auto.paused_until);
}

/** 자동 할인 규칙의 제외 조건(요일·슬롯·기간)에 걸리는지 */
export function autoExcluded(rule, slotId, date) {
  const exDays = parseJSON(rule.exclude_days_json, []);
  const exSlots = parseJSON(rule.exclude_slots_json, []);
  if (exDays.includes(dayOfWeek(date))) return true;
  if (exSlots.map(Number).includes(Number(slotId))) return true;
  if (rule.exclude_from && rule.exclude_to && date >= rule.exclude_from && date <= rule.exclude_to) return true;
  return false;
}

export async function getAutomationMap(db, spaceIds) {
  const map = new Map();
  if (!spaceIds || !spaceIds.length) return map;
  let rows = [];
  try {
    rows = await all(db, `SELECT * FROM space_automation WHERE space_id IN (${spaceIds.map(() => '?').join(',')})`, spaceIds);
  } catch (e) {
    if (!/no such table/i.test(String(e.message || e))) throw e; // 업데이트 전 DB
  }
  for (const r of rows) map.set(r.space_id, { ...r, pattern: parsePattern(r.pattern_json) });
  return map;
}

export async function getVacancyMap(db, spaceIds, from, to) {
  const map = new Map();
  if (!spaceIds || !spaceIds.length) return map;
  const rows = await all(db, `SELECT space_id, slot_id, date, status, source FROM vacancies WHERE space_id IN (${spaceIds.map(() => '?').join(',')}) AND date BETWEEN ? AND ?`, [...spaceIds, from, to]);
  for (const v of rows) map.set(`${v.space_id}|${v.slot_id}|${v.date}`, v);
  return map;
}

/** 패턴에서 '비어 있음'으로 열린 칸 수 (주당) */
export function patternOpenCount(pattern) {
  let n = 0; for (const row of Object.values(pattern || {})) for (const v of row) if (v === 'vacant') n++;
  return n;
}
