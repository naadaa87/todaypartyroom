// D1 접근 헬퍼
import { parseJSON } from './util.js';

export async function all(db, sql, params = []) {
  const r = await db.prepare(sql).bind(...params).all();
  return r.results || [];
}
export async function one(db, sql, params = []) {
  return await db.prepare(sql).bind(...params).first();
}
export async function run(db, sql, params = []) {
  return await db.prepare(sql).bind(...params).run();
}
export async function insertId(db, sql, params = []) {
  const r = await db.prepare(sql).bind(...params).run();
  return r.meta?.last_row_id;
}

/** 설정 전체를 객체로 (JSON 값은 파싱) */
export async function getSettings(db) {
  const rows = await all(db, 'SELECT key, value FROM settings');
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  s.holidays = parseJSON(s.holidays, []);
  s.footer_links = parseJSON(s.footer_links, []);
  s.amenities = parseJSON(s.amenities, []);
  s.index_min_spaces = parseInt(s.index_min_spaces || '1', 10);
  s.deal_cutoff_minutes = parseInt(s.deal_cutoff_minutes || '60', 10);
  s.trial_days = parseInt(s.trial_days || '30', 10);
  return s;
}

/** 지역 전체 트리 로드 */
export async function getRegions(db) {
  const rows = await all(db, 'SELECT * FROM regions ORDER BY sort, id');
  const byId = new Map(rows.map(r => [r.id, { ...r, children: [] }]));
  const roots = [];
  for (const r of byId.values()) {
    if (r.parent_id && byId.has(r.parent_id)) byId.get(r.parent_id).children.push(r); else roots.push(r);
  }
  return { rows, byId, roots };
}

/** 지역 경로 배열 → 지역 (예: ['seoul','mapo','hongdae']) */
export function findRegionByPath(regions, parts) {
  let parent = null, node = null;
  for (const slug of parts) {
    const cand = regions.rows.find(r => r.slug === slug && (r.parent_id || null) === (parent ? parent.id : null));
    if (!cand) return null;
    node = regions.byId.get(cand.id); parent = node;
  }
  return node;
}
export function regionPath(regions, region) {
  const parts = []; let cur = region;
  while (cur) { parts.unshift(cur); cur = cur.parent_id ? regions.byId.get(cur.parent_id) : null; }
  return parts;
}
export function regionUrl(regions, region) {
  return '/' + regionPath(regions, region).map(r => r.slug).join('/');
}
/** 하위 area id 목록 (자기 자신이 area면 자신만) */
export function descendantAreaIds(regions, region) {
  const out = [];
  const walk = n => { if (n.level === 'area') out.push(n.id); (n.children || []).forEach(walk); };
  walk(region); return out;
}
