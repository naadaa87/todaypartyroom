import { pageCtx } from '../../lib/page.js';
import { layout, breadcrumbs, hostCta, dealCard, cardGrid, sectionTitle } from '../../lib/html.js';
import { one, regionUrl } from '../../lib/db.js';
import { loadDeals } from '../../lib/deals.js';
import { html, esc } from '../../lib/util.js';
import { notFound } from '../[[path]].js';

/** 간단 마크다운: '## ' 소제목, 빈 줄 단락, '- ' 목록, [텍스트](링크) */
export function renderBody(text) {
  const blocks = String(text || '').split(/\n{2,}/);
  const inline = (s) => esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  return blocks.map(b => {
    const lines = b.split('\n');
    if (lines[0].startsWith('## ')) return `<h2>${inline(lines[0].slice(3))}</h2>${lines.length > 1 ? `<p>${lines.slice(1).map(inline).join('<br>')}</p>` : ''}`;
    if (lines[0].startsWith('### ')) return `<h3>${inline(lines[0].slice(4))}</h3>`;
    if (lines.every(l => l.startsWith('- '))) return `<ul>${lines.map(l => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  const { settings, regions, site } = p;
  const a = await one(p.db, 'SELECT * FROM articles WHERE slug = ? AND published = 1', [decodeURIComponent(context.params.slug || '')]);
  if (!a) return notFound(p);
  const region = a.region_id ? regions.byId.get(a.region_id) : null;
  const deals = region ? await loadDeals(p.env, settings, { areaIds: [region.id], dateFilter: 'upcoming', limit: 6 }) : [];
  const bc = breadcrumbs([{ name: '홈', href: '/' }, { name: '매거진', href: '/magazine' }, { name: a.title, href: `/magazine/${a.slug}` }], site);
  const body = `<article class="sec sec-top"><div class="wrap narrow">${bc.html}<h1>${esc(a.title)}</h1><p class="muted">${esc(a.category)} · ${esc((a.updated_at || '').slice(0, 10))} · ${esc(settings.site_name)} 편집팀</p>
  ${a.summary ? `<p class="lead">${esc(a.summary)}</p>` : ''}
  <div class="prose">${renderBody(a.body)}</div>
  ${region ? `<p><a class="btn btn-o" href="${regionUrl(regions, region)}">${esc(region.name)} 파티룸 보기</a></p>` : ''}
  </div></article>
  ${deals.length ? `<section class="sec"><div class="wrap">${sectionTitle(`${esc(region.name)} 지금 열린 딜`)}${cardGrid(deals.map(c => dealCard(c, { regions })))}</div></section>` : ''}
  ${hostCta(settings)}`;
  return html(layout({ settings, regions, region: p.region, site, title: `${a.title} — ${settings.site_name}`, description: a.summary || a.title, canonical: `${site}/magazine/${a.slug}`, jsonld: [bc.ld, { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.summary, datePublished: a.created_at, dateModified: a.updated_at, author: { '@type': 'Organization', name: settings.site_name }, publisher: { '@type': 'Organization', name: settings.site_name } }], body }));
}
