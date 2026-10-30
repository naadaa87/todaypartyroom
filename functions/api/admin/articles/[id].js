import { api, requireAdmin } from '../../../../lib/auth.js';
import { one, run } from '../../../../lib/db.js';
import { json, err, readBody, toInt } from '../../../../lib/util.js';
export const onRequestGet = api(async (context) => { await requireAdmin(context); const a = await one(context.env.DB, 'SELECT * FROM articles WHERE id = ?', [Number(context.params.id)]); if (!a) return err('글을 찾을 수 없습니다.', 404); return json({ ok: true, article: a }); });
export const onRequestPut = api(async (context) => {
  await requireAdmin(context); const b = await readBody(context.request);
  const a = await one(context.env.DB, 'SELECT * FROM articles WHERE id = ?', [Number(context.params.id)]); if (!a) return err('글을 찾을 수 없습니다.', 404);
  await run(context.env.DB, "UPDATE articles SET title = ?, summary = ?, body = ?, category = ?, region_id = ?, published = ?, updated_at = datetime('now') WHERE id = ?", [String(b.title ?? a.title).slice(0, 120), String(b.summary ?? a.summary).slice(0, 300), String(b.body ?? a.body).slice(0, 50000), String(b.category ?? a.category).slice(0, 20), toInt(b.region_id ?? a.region_id, 0) || null, b.published ? 1 : 0, a.id]);
  return json({ ok: true });
});
export const onRequestDelete = api(async (context) => { await requireAdmin(context); await run(context.env.DB, 'DELETE FROM articles WHERE id = ?', [Number(context.params.id)]); return json({ ok: true }); });
