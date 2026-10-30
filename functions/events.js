// 이벤트 허브: /events
import { pageCtx } from '../lib/page.js';
import { loadDeals, tick } from '../lib/deals.js';
import { layout, dealCard, cardGrid, emptyState, hostCta, breadcrumbs } from '../lib/html.js';
import { descendantAreaIds } from '../lib/db.js';
import { html, esc } from '../lib/util.js';

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  await tick(p.env);
  const { settings, regions, region, site } = p;
  const areaIds = region ? descendantAreaIds(regions, region) : null;
  const list = await loadDeals(p.env, settings, { areaIds, dateFilter: 'upcoming', types: ['EVENT'], includeScheduled: true });
  const bc = breadcrumbs([{ name: '홈', href: '/' }, { name: '이벤트', href: '/events' }], site);
  const body = `<section class="sec sec-top"><div class="wrap">${bc.html}
  <h1>파티룸 이벤트 <em>${list.length}건</em> <small>${esc(region ? region.name : '전국')}</small></h1>
  <p class="lead">할인 대신 혜택으로 돌려드리는 이벤트. 케이크 증정, 시간 연장, 리뷰 혜택 등 호스트가 직접 올린 조건을 그대로 보여드려요.</p>
  ${cardGrid(list.map(c => dealCard(c, { regions })), emptyState('진행 중인 이벤트가 아직 없어요.', '오늘 비는 곳 보기', '/deals/today'))}
</div></section>${hostCta(settings)}`;
  return html(layout({ settings, regions, region, site, nav: 'deals', title: `파티룸 이벤트 ${list.length}건 — ${settings.site_name}`, description: '파티룸 호스트가 직접 올린 이벤트·혜택 모음. 케이크 증정, 시간 연장, 첫 예약 혜택.', canonical: `${site}/events`, jsonld: [bc.ld], body }));
}
