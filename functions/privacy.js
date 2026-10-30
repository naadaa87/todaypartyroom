import { pageCtx } from '../lib/page.js';
import { layout } from '../lib/html.js';
import { privacyBody } from '../lib/pages-static.js';
import { html } from '../lib/util.js';
export async function onRequestGet(context) {
  const p = await pageCtx(context);
  return html(layout({ settings: p.settings, regions: p.regions, region: p.region, site: p.site, title: `개인정보처리방침 — ${p.settings.site_name}`, description: '오늘의파티룸 개인정보처리방침', canonical: `${p.site}/privacy`, noindex: true, body: privacyBody(p.settings) }));
}
