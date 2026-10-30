import { pageCtx } from '../lib/page.js';
import { layout } from '../lib/html.js';
import { helpBody } from '../lib/pages-static.js';
import { html } from '../lib/util.js';
export async function onRequestGet(context) {
  const p = await pageCtx(context);
  return html(layout({ settings: p.settings, regions: p.regions, region: p.region, site: p.site, title: `고객센터 — ${p.settings.site_name}`, description: '오늘의파티룸 이용 안내, 딜 코드 사용법, 신고·문의.', canonical: `${p.site}/help`, body: helpBody(p.settings) }));
}
