// 딜 허브: /deals/today, /deals/tomorrow, /deals/time, /deals/hot, /deals/flash
import { pageCtx, areaCounts } from '../../lib/page.js';
import { loadDeals, tick, TYPE_LONG } from '../../lib/deals.js';
import { layout, dealCard, cardGrid, emptyState, sectionTitle, hostCta, breadcrumbs, regionsChips, faqHtml, faqJsonLd } from '../../lib/html.js';
import { descendantAreaIds, regionUrl } from '../../lib/db.js';
import { html, esc } from '../../lib/util.js';
import { notFound } from '../[[path]].js';

const HUBS = {
  today: { title: '오늘 비는 파티룸', desc: '지금 예약 가능한 파티룸 당일 특가. 종료 시각과 남은 수량까지 투명하게 보여드려요.', opts: { dateFilter: 'today', types: ['TODAY', 'TOMORROW', 'TIME', 'HOT', 'FLASH'] } },
  tomorrow: { title: '내일 비는 파티룸', desc: '내일 비어 있는 파티룸을 전날 할인가로. 하루 전에 미리 잡으세요.', opts: { dateFilter: 'tomorrow', types: ['TODAY', 'TOMORROW', 'TIME', 'HOT', 'FLASH'] } },
  time: { title: '타임딜', desc: '정해진 시간에만 열리는 파티룸 할인. 카운트다운이 끝나면 사라집니다.', opts: { dateFilter: 'upcoming', types: ['TIME'], includeScheduled: true } },
  hot: { title: '핫딜', desc: '호스트가 기간을 정해 크게 내린 파티룸 특가 모음.', opts: { dateFilter: 'upcoming', types: ['HOT', 'TIME', 'FLASH'], includeScheduled: true } },
  flash: { title: '반짝딜', desc: '짧은 시간, 소량 한정 게릴라 할인. 알림을 켜 두면 가장 먼저 받습니다.', opts: { dateFilter: 'upcoming', types: ['FLASH'], includeScheduled: true } },
};

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  const type = context.params.type;
  const hub = HUBS[type];
  if (!hub) return notFound(p);
  await tick(p.env);
  const { settings, regions, region, site } = p;
  const areaIds = region ? descendantAreaIds(regions, region) : null;
  const [list, nationwide, counts] = await Promise.all([
    loadDeals(p.env, settings, { ...hub.opts, areaIds }),
    region ? loadDeals(p.env, settings, { ...hub.opts, limit: 12 }) : Promise.resolve([]),
    areaCounts(p.db),
  ]);
  const scope = region ? region.name : '전국';
  const bc = breadcrumbs([{ name: '홈', href: '/' }, { name: hub.title, href: `/deals/${type}` }], site);
  const faqs = type === 'today' || type === 'tomorrow' ? [
    { q: `${hub.title}은 어떻게 찾나요?`, a: `호스트가 비어 있다고 표시한 시간대 중 ${type === 'today' ? '오늘' : '내일'} 시작하는 슬롯만 모았습니다. 지역을 선택하면 가까운 곳만 볼 수 있고, 각 카드의 종료 시각이 지나면 자동으로 사라집니다.` },
    { q: '할인가는 어떻게 적용받나요?', a: '카드에서 "예약하기"를 누르면 호스트가 정한 예약 채널로 이동합니다. 딜 전용 예약 링크가 있으면 할인 상품으로 바로 연결되고, 없으면 딜 코드가 발급됩니다. 전화나 카카오톡으로 예약할 때 코드를 말씀하시면 됩니다.' },
  ] : [];
  const body = `
<section class="sec sec-top"><div class="wrap">
  ${bc.html}
  <h1>${esc(hub.title)} <em>${list.length}곳</em> <small>${esc(scope)}</small></h1>
  <p class="lead">${esc(hub.desc)}</p>
  <div class="tabs">${Object.entries(HUBS).map(([k, v]) => `<a class="tab${k === type ? ' on' : ''}" href="/deals/${k}">${v.title.replace(' 파티룸', '')}</a>`).join('')}<a class="tab" href="/events">이벤트</a></div>
  <div class="filters" data-filter-bar>
    <select data-f="cap"><option value="">인원</option><option value="4">4명 이상</option><option value="8">8명 이상</option><option value="12">12명 이상</option><option value="20">20명 이상</option></select>
    <select data-f="sort"><option value="">종료 임박순</option><option value="rate">할인율순</option><option value="price">낮은 가격순</option></select>
    ${region ? `<a class="chip" href="/deals/${type}" data-clear-region>전국 보기</a>` : ''}
  </div>
  ${cardGrid(list.map(c => dealCard(c, { regions })), emptyState(`${scope}에 지금 열린 ${hub.title.replace(' 파티룸', '')}이 없어요.`, type === 'today' ? '내일 비는 곳 보기' : '오늘 비는 곳 보기', type === 'today' ? '/deals/tomorrow' : '/deals/today'))}
</div></section>
${region && nationwide.length ? `<section class="sec"><div class="wrap">${sectionTitle('다른 지역의 ' + esc(hub.title.replace(' 파티룸', '')))}${cardGrid(nationwide.map(c => dealCard(c, { regions })))}</div></section>` : ''}
<section class="sec"><div class="wrap">${sectionTitle('지역별로 보기')}${regionsChips(regions, counts, 16)}</div></section>
${faqs.length ? `<section class="sec"><div class="wrap">${faqHtml(faqs)}</div></section>` : ''}
${hostCta(settings)}`;
  return html(layout({
    settings, regions, region, site, nav: 'deals',
    title: `${hub.title} ${list.length}곳 | ${type === 'today' ? '당일 예약 할인' : type === 'tomorrow' ? '전날 예약 할인' : '파티룸 특가'} — ${settings.site_name}`,
    description: hub.desc, canonical: `${site}/deals/${type}`,
    jsonld: [bc.ld, faqJsonLd(faqs)], body,
  }));
}
