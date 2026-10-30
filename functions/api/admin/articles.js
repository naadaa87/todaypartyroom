import { api, requireAdmin } from '../../../lib/auth.js';
import { all, one, insertId } from '../../../lib/db.js';
import { json, err, readBody, slugify, toInt } from '../../../lib/util.js';
export const onRequestGet = api(async (context) => { await requireAdmin(context); return json({ ok: true, articles: await all(context.env.DB, 'SELECT id, slug, title, summary, category, region_id, published, updated_at FROM articles ORDER BY updated_at DESC LIMIT 300') }); });
export const onRequestPost = api(async (context) => {
  await requireAdmin(context); const b = await readBody(context.request);
  const title = String(b.title || '').trim(); if (title.length < 2) return err('제목을 입력하세요.');
  let slug = slugify(b.slug || '');
  if (!slug) slug = `post-${Date.now().toString(36)}`;
  let n = 1, base = slug; while (await one(context.env.DB, 'SELECT id FROM articles WHERE slug = ?', [slug])) { n += 1; slug = `${base}-${n}`; }
  const id = await insertId(context.env.DB, 'INSERT INTO articles (slug, title, summary, body, category, region_id, published) VALUES (?,?,?,?,?,?,?)', [slug, title, String(b.summary || '').slice(0, 300), String(b.body || '').slice(0, 50000), String(b.category || 'guide').slice(0, 20), toInt(b.region_id, 0) || null, b.published ? 1 : 0]);
  return json({ ok: true, id, slug });
});
