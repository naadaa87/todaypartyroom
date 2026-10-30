// GET /api/host/spaces/:id (상세) / PUT (수정)
import { api, requireHost } from '../../../../lib/auth.js';
import { run, all, one } from '../../../../lib/db.js';
import { json, err, readBody, slugify } from '../../../../lib/util.js';
import { ownSpace, pickSpaceFields, serializeSpace, uniqueSlug, checkReady, defaultSlug } from '../../../../lib/host-api.js';
export const onRequestGet = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const slots = await all(context.env.DB, 'SELECT * FROM slots WHERE space_id = ? AND active = 1', [s.id]);
  return json({ ok: true, space: await serializeSpace(context.env, s), issues: checkReady(s, slots) });
});
export const onRequestPut = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const b = await readBody(context.request);
  const f = pickSpaceFields(b);
  if (f.name !== undefined && f.name.trim().length < 2) return err('공간 이름을 입력하세요.');
  if (f.region_id) { const r = await one(context.env.DB, "SELECT id FROM regions WHERE id = ? AND level = 'area'", [f.region_id]); if (!r) return err('상권을 선택하세요.'); }
  if (f.slug && f.slug !== s.slug) { if (s.status === 'approved') delete f.slug; else f.slug = await uniqueSlug(context.env, f.slug, s.id); }
  else if (f.region_id && f.region_id !== s.region_id && s.status !== 'approved' && /^[a-z-]+-\d+$/.test(s.slug || '')) f.slug = await defaultSlug(context.env, { id: s.id, region_id: f.region_id });
  const keys = Object.keys(f);
  if (keys.length) await run(context.env.DB, `UPDATE spaces SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`, [...keys.map(k => f[k]), s.id]);
  if (Array.isArray(b.theme_ids)) {
    await run(context.env.DB, 'DELETE FROM space_themes WHERE space_id = ?', [s.id]);
    for (const t of b.theme_ids.map(Number).filter(Boolean).slice(0, 6)) await run(context.env.DB, 'INSERT OR IGNORE INTO space_themes (space_id, theme_id) VALUES (?,?)', [s.id, t]);
  }
  if (b.visible === false && s.status === 'approved') await run(context.env.DB, "UPDATE spaces SET status = 'hidden' WHERE id = ?", [s.id]);
  if (b.visible === true && s.status === 'hidden') await run(context.env.DB, "UPDATE spaces SET status = 'approved' WHERE id = ?", [s.id]);
  const s2 = await one(context.env.DB, 'SELECT * FROM spaces WHERE id = ?', [s.id]);
  const slots = await all(context.env.DB, 'SELECT * FROM slots WHERE space_id = ? AND active = 1', [s.id]);
  return json({ ok: true, space: await serializeSpace(context.env, s2), issues: checkReady(s2, slots) });
});
