// POST /api/report — 신고·문의
import { api } from '../../lib/auth.js';
import { insertId } from '../../lib/db.js';
import { json, err, readBody } from '../../lib/util.js';
export const onRequestPost = api(async ({ env, request }) => {
  const b = await readBody(request);
  const kind = ['deal_unfulfilled', 'content', 'inquiry', 'other'].includes(b.kind) ? b.kind : 'other';
  const content = String(b.content || '').trim();
  if (content.length < 5) return err('내용을 조금 더 적어 주세요.');
  const target = String(b.target || '').trim();
  const id = await insertId(env.DB, `INSERT INTO reports (kind, target_type, target_id, contact, content) VALUES (?,?,?,?,?)`, [kind, target ? 'text' : null, null, String(b.contact || '').slice(0, 100), (target ? `[대상] ${target}\n` : '') + content.slice(0, 3000)]);
  return json({ ok: true, id });
});
