import { api, requireAdmin } from '../../../lib/auth.js';
import { all, one, run, insertId } from '../../../lib/db.js';
import { json, err, readBody, slugify, toInt } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => { await requireAdmin(context); return json({ ok: true, themes: await all(context.env.DB, 'SELECT * FROM themes ORDER BY sort, id') }); });
export const onRequestPost = api(async (context) => {
  await requireAdmin(context); const b = await readBody(context.request);
  const name = String(b.name || '').trim(); if (!name) return err('이름을 입력하세요.');
  const slug = slugify(b.slug || name); if (!/^[a-z0-9-]+$/.test(slug)) return err('슬러그는 영문 소문자·숫자·하이픈만 가능합니다.');
  const id = await insertId(context.env.DB, 'INSERT INTO themes (slug, name, description, icon, sort) VALUES (?,?,?,?,?)', [slug, name, String(b.description || '').slice(0, 500), String(b.icon || '').slice(0, 4), toInt(b.sort, 0)]);
  return json({ ok: true, id });
});
export const onRequestPut = api(async (context) => {
  await requireAdmin(context); const b = await readBody(context.request);
  const t = await one(context.env.DB, 'SELECT * FROM themes WHERE id = ?', [toInt(b.id, 0)]); if (!t) return err('테마를 찾을 수 없습니다.', 404);
  await run(context.env.DB, 'UPDATE themes SET name = ?, description = ?, icon = ?, sort = ? WHERE id = ?', [String(b.name ?? t.name).slice(0, 40), String(b.description ?? t.description).slice(0, 500), String(b.icon ?? t.icon).slice(0, 4), toInt(b.sort ?? t.sort, 0), t.id]);
  return json({ ok: true });
});
