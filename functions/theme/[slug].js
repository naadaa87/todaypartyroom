// 테마 허브: /theme/birthday
import { pageCtx, liveSpaces, areaCounts } from '../../lib/page.js';
import { loadDeals, tick } from '../../lib/deals.js';
import { layout, dealCard, cardGrid, emptyState, sectionTitle, hostCta, spaceCard, breadcrumbs, themeChips, regionsChips, faqHtml, faqJsonLd } from '../../lib/html.js';
import { descendantAreaIds } from '../../lib/db.js';
import { html, esc, won } from '../../lib/util.js';
import { notFound } from '../[[path]].js';

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  const theme = p.themes.find(t => t.slug === context.params.slug);
  if (!theme) return notFound(p);
  await tick(p.env);
  const { settings, regions, region, site } = p;
  const areaIds = region ? descendantAreaIds(regions, region) : null;
  const [deals, spaces, counts] = await Promise.all([
    loadDeals(p.env, settings, { areaIds, themeId: theme.id, dateFilter: 'upcoming', includeScheduled: true }),
    liveSpaces(p.db, { areaIds, themeId: theme.id, limit: 100 }),
    areaCounts(p.db),
  ]);
  const scope = region ? region.name : '전국';
  const bc = breadcrumbs([{ name: '홈', href: '/' }, { name: theme.name, href: `/theme/${theme.slug}` }], site);
  const prices = spaces.map(s => s.min_price).filter(Boolean);
  const faqs = [
    { q: `${theme.name}에 맞는 파티룸은 어떻게 고르나요?`, a: `인원 수에 맞는 기준 인원과 최대 인원을 먼저 확인하고, 이용 시간대(낮·밤·올나잇)와 편의시설(주방·노래방·빔프로젝터 등)을 비교하세요. ${scope}에서 ${theme.name} 태그가 붙은 공간은 ${spaces.length}곳입니다.` },
    { q: `${theme.name} 파티룸 가격대는 어느 정도인가요?`, a: prices.length ? `평일 최저 요금 기준 ${won(Math.min(...prices))}부터 ${won(Math.max(...prices))}까지입니다. 비는 날에는 당일·전날 할인가가 따로 표시됩니다.` : '등록된 공간이 늘어나면 가격대를 안내합니다.' },
  ];
  const body = `<section class="sec sec-top"><div class="wrap">${bc.html}
  <h1>${esc(theme.icon || '')} ${esc(theme.name)} 장소 추천 파티룸 <em>${spaces.length}곳</em> <small>${esc(scope)}</small></h1>
  <p class="lead">${esc(theme.description || '')} 비는 날은 할인가로, 나머지는 정가 요금표로 바로 비교하세요.</p>
  ${themeChips(p.themes)}
  ${deals.length ? `${sectionTitle('지금 열린 딜')}${cardGrid(deals.map(c => dealCard(c, { regions })))}` : ''}
  ${sectionTitle(`${esc(theme.name)} 파티룸 전체`)}
  ${cardGrid(spaces.map(s => spaceCard(s, s.min_price)), emptyState(`${scope}에 ${theme.name} 태그가 붙은 공간이 아직 없어요.`, '전체 오늘 딜 보기', '/deals/today'))}
</div></section>
<section class="sec"><div class="wrap">${sectionTitle('지역별로 보기')}${regionsChips(regions, counts, 16)}</div></section>
<section class="sec"><div class="wrap">${faqHtml(faqs)}</div></section>
${hostCta(settings)}`;
  return html(layout({ settings, regions, region, site, title: `${theme.name} 장소 추천 파티룸 ${spaces.length}곳 | 지역별 — ${settings.site_name}`, description: `${theme.name}에 맞는 파티룸을 지역·인원별로 모았어요. 오늘·내일 비는 곳은 할인가로.`, canonical: `${site}/theme/${theme.slug}`, jsonld: [bc.ld, faqJsonLd(faqs)], body }));
}
