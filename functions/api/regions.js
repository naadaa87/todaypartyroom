// GET /api/regions — 지역 트리 + 노출 공간 수
import { getRegions } from '../../lib/db.js';
import { areaCounts } from '../../lib/page.js';
import { json } from '../../lib/util.js';
export async function onRequestGet({ env }) {
  const regions = await getRegions(env.DB);
  const counts = await areaCounts(env.DB);
  const tree = regions.roots.map(si => ({ id: si.id, slug: si.slug, name: si.name, children: si.children.map(gu => ({ id: gu.id, slug: gu.slug, name: gu.name, children: gu.children.map(a => ({ id: a.id, slug: a.slug, name: a.name, n: counts.get(a.id) || 0, path: `/${si.slug}/${gu.slug}/${a.slug}` })), path: `/${si.slug}/${gu.slug}` })), path: `/${si.slug}` }));
  return json({ ok: true, tree }, 200, { 'cache-control': 'public, max-age=300' });
}
