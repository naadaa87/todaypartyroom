// 페이지 공통 컨텍스트 + 자주 쓰는 조회
import { all, getSettings, getRegions } from './db.js';
import { cookies, siteUrl, todayStr } from './util.js';

export async function pageCtx(context) {
  const { env, request } = context;
  const [settings, regions, themes] = await Promise.all([getSettings(env.DB), getRegions(env.DB), all(env.DB, 'SELECT * FROM themes ORDER BY sort, id')]);
  const c = cookies(request);
  const region = c.tpr_region ? regions.byId.get(Number(c.tpr_region)) || null : null;
  return { env, db: env.DB, request, settings, regions, themes, region, site: siteUrl(env, request), url: new URL(request.url) };
}

/** 노출 가능한 공간 조건 */
export const LIVE_SQL = `s.status = 'approved' AND ((s.subscription_status IN ('trial','active') AND (s.subscription_until IS NULL OR s.subscription_until >= ?)) OR (s.subscription_status = 'cancelled' AND s.subscription_until >= ?))`;
export const LIVE_PARAMS = () => [todayStr(), todayStr()];

export async function liveSpaces(db, { areaIds, themeId, limit = 60 } = {}) {
  const params = LIVE_PARAMS();
  let where = LIVE_SQL;
  if (areaIds && areaIds.length) { where += ` AND s.region_id IN (${areaIds.map(() => '?').join(',')})`; params.push(...areaIds); }
  if (themeId) { where += ` AND s.id IN (SELECT space_id FROM space_themes WHERE theme_id = ?)`; params.push(themeId); }
  return await all(db, `SELECT s.*, r.name AS region_name, (SELECT MIN(price_weekday) FROM slots sl WHERE sl.space_id = s.id AND sl.active = 1) AS min_price FROM spaces s LEFT JOIN regions r ON r.id = s.region_id WHERE ${where} ORDER BY s.updated_at DESC LIMIT ${Number(limit)}`, params);
}

/** 지역(area)별 노출 공간 수 */
export async function areaCounts(db) {
  const rows = await all(db, `SELECT s.region_id AS id, COUNT(*) AS n FROM spaces s WHERE ${LIVE_SQL} GROUP BY s.region_id`, LIVE_PARAMS());
  return new Map(rows.map(r => [r.id, r.n]));
}
export function countInRegion(regions, region, counts) {
  let n = 0; const walk = r => { if (r.level === 'area') n += counts.get(r.id) || 0; (r.children || []).forEach(walk); }; walk(region); return n;
}
