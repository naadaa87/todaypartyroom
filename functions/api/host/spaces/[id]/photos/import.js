// POST /api/host/spaces/:id/photos/import — 링크로 걸어 둔 사진을 내 사진 저장소(R2)로 옮깁니다.
// 한 번에 몇 장씩 옮기고 남은 장수를 돌려줍니다. 화면에서 다 옮겨질 때까지 반복 호출합니다.
import { api, requireHost, HttpError } from '../../../../../../lib/auth.js';
import { run } from '../../../../../../lib/db.js';
import { json, parseJSON } from '../../../../../../lib/util.js';
import { ownSpace } from '../../../../../../lib/host-api.js';

const PER_CALL = 4;
const MAX_BYTES = 8 * 1024 * 1024;
const isExternal = u => /^https?:\/\//i.test(u || '');

export const onRequestPost = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  if (!context.env.IMAGES) throw new HttpError('사진 저장소(R2)가 아직 연결되지 않았습니다. Cloudflare Pages → 설정 → 바인딩에서 R2 버킷을 IMAGES 이름으로 연결하면 쓸 수 있어요. 연결 전에도 링크 사진은 그대로 보입니다.', 501);
  const photos = parseJSON(s.photos_json, []);
  const todo = photos.map((u, i) => ({ u, i })).filter(x => isExternal(x.u) && !x.u.endsWith('#keep')).slice(0, PER_CALL);
  let moved = 0; const failed = [];
  for (const { u, i } of todo) {
    try {
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(u, { signal: ctrl.signal, headers: { 'user-agent': 'todaypartyroom-photo-import' } });
      clearTimeout(timer);
      const type = (res.headers.get('content-type') || '').split(';')[0].trim();
      if (!res.ok || !/^image\/(jpeg|png|webp|gif)$/.test(type)) throw new Error(`HTTP ${res.status} ${type}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) throw new Error('too large');
      const ext = type.split('/')[1].replace('jpeg', 'jpg');
      const key = `spaces/${s.id}/${crypto.randomUUID()}.${ext}`;
      await context.env.IMAGES.put(key, buf, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
      photos[i] = `/img/${key}`; moved++;
    } catch (e) { failed.push(u); photos[i] = u + '#keep'; } // 받지 못한 사진은 그 자리에 두고 다시 시도하지 않음
  }
  const next = photos;
  await run(context.env.DB, `UPDATE spaces SET photos_json = ?, updated_at = datetime('now') WHERE id = ?`, [JSON.stringify(next), s.id]);
  const remaining = next.filter(u => isExternal(u) && !u.endsWith('#keep')).length;
  return json({ ok: true, moved, failed: failed.length, remaining, photos: next });
});
