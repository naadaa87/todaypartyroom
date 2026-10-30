// GET/POST/PUT /api/admin/regions
import { api, requireAdmin } from '../../../lib/auth.js';
import { all, one, run, insertId } from '../../../lib/db.js';
import { json, err, readBody, slugify, toInt } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => { await requireAdmin(context); return json({ ok: true, regions: await all(context.env.DB, 'SELECT * FROM regions ORDER BY level, sort, id') }); });
export const onRequestPost = api(async (context) => {
  await requireAdmin(context);
  const b = await readBody(context.request);
  const level = ['si', 'gu', 'area'].includes(b.level) ? b.level : null; if (!level) return err('레벨을 선택하세요.');
  const parent = level === 'si' ? null : toInt(b.parent_id, 0);
  if (level !== 'si' && !(await one(context.env.DB, 'SELECT id FROM regions WHERE id = ?', [parent]))) return err('상위 지역을 선택하세요.');
  const name = String(b.name || '').trim(); if (!name) return err('이름을 입력하세요.');
  const slug = String(b.slug || '').trim() ? slugify(b.slug) : slugify(name);
  if (!/^[a-z0-9-]+$/.test(slug)) return err('슬러그는 영문 소문자·숫자·하이픈만 가능합니다.');
  const id = await insertId(context.env.DB, 'INSERT INTO regions (level, parent_id, slug, name, description, sort, indexable) VALUES (?,?,?,?,?,?,?)', [level, parent, slug, name, String(b.description || '').slice(0, 2000), toInt(b.sort, 0), b.indexable === false ? 0 : 1]);
  return json({ ok: true, id });
});
export const onRequestPut = api(async (context) => {
  await requireAdmin(context);
  const b = await readBody(context.request);
  const r = await one(context.env.DB, 'SELECT * FROM regions WHERE id = ?', [toInt(b.id, 0)]); if (!r) return err('지역을 찾을 수 없습니다.', 404);
  const faq = Array.isArray(b.faq) ? b.faq.filter(f => f && f.q && f.a).map(f => ({ q: String(f.q).slice(0, 200), a: String(f.a).slice(0, 1000) })).slice(0, 10) : JSON.parse(r.faq_json || '[]');
  await run(context.env.DB, 'UPDATE regions SET name = ?, description = ?, faq_json = ?, sort = ?, indexable = ? WHERE id = ?', [String(b.name ?? r.name).trim().slice(0, 40), String(b.description ?? r.description ?? '').slice(0, 2000), JSON.stringify(faq), toInt(b.sort ?? r.sort, 0), b.indexable === false ? 0 : 1, r.id]);
  return json({ ok: true });
});
