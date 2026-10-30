// POST /api/upload (multipart file) → R2(IMAGES 바인딩) 저장. 바인딩이 없으면 안내
import { api, currentHost, currentAdmin } from '../../lib/auth.js';
import { json, err } from '../../lib/util.js';
export const onRequestPost = api(async (context) => {
  const { env, request } = context;
  const who = (await currentHost(context)) || (await currentAdmin(context));
  if (!who) return err('로그인이 필요합니다.', 401);
  if (!env.IMAGES) return err('이미지 저장소(R2)가 연결되지 않았습니다. Cloudflare Pages → Settings → Bindings 에서 R2 bucket 바인딩 IMAGES 를 추가하거나, 사진 URL 입력 방식을 사용하세요.', 501);
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return err('파일이 없습니다.');
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return err('jpg, png, webp, gif 이미지만 올릴 수 있습니다.');
  if (file.size > 8 * 1024 * 1024) return err('8MB 이하 이미지만 올릴 수 있습니다.');
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const key = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${crypto.randomUUID()}.${ext}`;
  await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } });
  return json({ ok: true, url: `/img/${key}` });
});
