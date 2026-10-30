// GET /api/themes — 공개 테마 목록
import { all } from '../../lib/db.js';
import { json } from '../../lib/util.js';
export async function onRequestGet({ env }) { return json({ ok: true, themes: await all(env.DB, 'SELECT id, slug, name, icon, description FROM themes ORDER BY sort, id') }, 200, { 'cache-control': 'public, max-age=300' }); }
