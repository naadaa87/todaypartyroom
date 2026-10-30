// GET /img/{key} — R2 이미지 서빙
export async function onRequestGet({ env, params }) {
  if (!env.IMAGES) return new Response('no storage', { status: 404 });
  const key = (params.key || []).join('/');
  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response('not found', { status: 404 });
  const h = new Headers(); obj.writeHttpMetadata(h); h.set('etag', obj.httpEtag); h.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers: h });
}
