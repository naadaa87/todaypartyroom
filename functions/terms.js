import { pageCtx } from '../lib/page.js';
import { layout } from '../lib/html.js';
import { termsBody } from '../lib/pages-static.js';
import { html } from '../lib/util.js';
export async function onRequestGet(context) {
  const p = await pageCtx(context);
  return html(layout({ settings: p.settings, regions: p.regions, region: p.region, site: p.site, title: `이용약관 — ${p.settings.site_name}`, description: '오늘의파티룸 이용약관', canonical: `${p.site}/terms`, noindex: true, body: termsBody(p.settings) }));
}
