import { pageCtx } from '../../lib/page.js';
import { layout, breadcrumbs, hostCta } from '../../lib/html.js';
import { all } from '../../lib/db.js';
import { html, esc } from '../../lib/util.js';

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  const { settings, regions, site } = p;
  const rows = await all(p.db, 'SELECT slug, title, summary, category, updated_at FROM articles WHERE published = 1 ORDER BY updated_at DESC LIMIT 100');
  const bc = breadcrumbs([{ name: '홈', href: '/' }, { name: '매거진', href: '/magazine' }], site);
  const body = `<section class="sec sec-top"><div class="wrap">${bc.html}<h1>파티룸 매거진</h1><p class="lead">지역별 파티룸 가이드, 파티 준비 체크리스트, 호스트 이야기, 월간 시세 리포트.</p>
  ${rows.length ? `<div class="art-list">${rows.map(a => `<a class="art" href="/magazine/${esc(a.slug)}"><small>${esc(a.category)} · ${esc((a.updated_at || '').slice(0, 10))}</small><b>${esc(a.title)}</b><span>${esc(a.summary)}</span></a>`).join('')}</div>` : '<p class="muted">첫 글을 준비 중입니다.</p>'}
  </div></section>${hostCta(settings)}`;
  return html(layout({ settings, regions, region: p.region, site, title: `파티룸 매거진 — ${settings.site_name}`, description: '지역별 파티룸 가이드, 파티 준비 체크리스트, 호스트 이야기, 시세 리포트.', canonical: `${site}/magazine`, jsonld: [bc.ld], body }));
}
