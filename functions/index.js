// 홈
import { pageCtx, areaCounts, countInRegion, liveSpaces } from '../lib/page.js';
import { loadDeals, tick } from '../lib/deals.js';
import { layout, dealCard, cardGrid, emptyState, sectionTitle, themeChips, hostCta, regionsChips, orgJsonLd, websiteJsonLd, spaceCard } from '../lib/html.js';
import { descendantAreaIds, regionUrl, all } from '../lib/db.js';
import { html, esc, todayStr, addDays } from '../lib/util.js';

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  const { settings, regions, themes, region, site } = p;
  await tick(p.env);
  const counts = await areaCounts(p.db);
  const areaIds = region ? descendantAreaIds(regions, region) : null;
  const [today, tomorrow, special] = await Promise.all([
    loadDeals(p.env, settings, { areaIds, dateFilter: 'today', types: ['TODAY', 'TOMORROW', 'TIME', 'HOT', 'FLASH'], limit: 12 }),
    loadDeals(p.env, settings, { areaIds, dateFilter: 'tomorrow', types: ['TODAY', 'TOMORROW', 'TIME', 'HOT', 'FLASH'], limit: 12 }),
    loadDeals(p.env, settings, { areaIds, dateFilter: 'upcoming', types: ['TIME', 'HOT', 'FLASH'], includeScheduled: true, limit: 8 }),
  ]);
  const totalLive = [...counts.values()].reduce((a, b) => a + b, 0);
  const scopeName = region ? region.name : '전국';
  const scopeUrl = region ? regionUrl(regions, region) : '/deals/today';
  const recent = await liveSpaces(p.db, { areaIds, limit: 8 });
  const articles = await all(p.db, 'SELECT slug, title, summary FROM articles WHERE published = 1 ORDER BY updated_at DESC LIMIT 3');

  const body = `
<section class="hero"><div class="wrap">
  <h1>오늘 비는 파티룸,<br>오늘 가장 싸게</h1>
  <p class="hero-p">호스트가 직접 올린 당일·전날 할인, 타임딜·핫딜·반짝딜을 한곳에서. 예약은 각 공간이 쓰는 채널로 바로 연결됩니다.</p>
  <div class="hero-ctl">
    <button type="button" class="btn btn-o btn-lg" data-open-region>📍 ${esc(scopeName)} <small>변경</small></button>
    <a class="btn btn-p btn-lg" href="${scopeUrl}">오늘 비는 곳 보기</a>
  </div>
  <p class="hero-live">지금 ${esc(scopeName)} 파티룸 <b>${totalLive}곳</b> · 오늘 비는 곳 <b>${today.length}곳</b> · 내일 비는 곳 <b>${tomorrow.length}곳</b></p>
</div></section>

<section class="sec"><div class="wrap">
  ${sectionTitle(`오늘 비는 파티룸 <small>${esc(scopeName)}</small>`, '전체 보기', region ? `${scopeUrl}` : '/deals/today')}
  ${cardGrid(today.map(c => dealCard(c, { regions })), emptyState(tomorrow.length ? `오늘은 비는 곳이 없어요. 내일 비는 곳 ${tomorrow.length}곳이 있어요.` : '오늘은 비는 곳이 없어요. 조건을 걸어 두면 딜이 열릴 때 알려드려요.', tomorrow.length ? '내일 비는 곳 보기' : '', tomorrow.length ? (region ? `${scopeUrl}?d=tomorrow` : '/deals/tomorrow') : ''))}
</div></section>

${tomorrow.length ? `<section class="sec"><div class="wrap">
  ${sectionTitle('내일 비는 파티룸', '전체 보기', region ? `${scopeUrl}?d=tomorrow` : '/deals/tomorrow')}
  ${cardGrid(tomorrow.map(c => dealCard(c, { regions })))}
</div></section>` : ''}

${special.length ? `<section class="sec"><div class="wrap">
  ${sectionTitle('타임딜 · 핫딜 · 반짝딜', '전체 보기', '/deals/hot')}
  ${cardGrid(special.map(c => dealCard(c, { regions })))}
</div></section>` : ''}

<section class="sec"><div class="wrap">
  ${sectionTitle('지역 바로가기')}
  ${regionsChips(regions, counts, 14)}
</div></section>

<section class="sec"><div class="wrap">
  ${sectionTitle('어떤 모임인가요?')}
  ${themeChips(themes)}
</div></section>

${recent.length ? `<section class="sec"><div class="wrap">
  ${sectionTitle(`${esc(scopeName)} 파티룸`, '전체 보기', region ? scopeUrl : '/seoul')}
  ${cardGrid(recent.map(s => spaceCard(s, s.min_price)))}
</div></section>` : ''}

${articles.length ? `<section class="sec"><div class="wrap">
  ${sectionTitle('매거진', '더 보기', '/magazine')}
  <div class="art-list">${articles.map(a => `<a class="art" href="/magazine/${esc(a.slug)}"><b>${esc(a.title)}</b><span>${esc(a.summary)}</span></a>`).join('')}</div>
</div></section>` : ''}

${hostCta(settings)}`;

  return html(layout({
    settings, regions, region, site, nav: 'home',
    title: `${settings.site_name} — ${settings.site_tagline}`,
    description: `오늘·내일 비어 있는 파티룸을 당일·전날 할인으로 예약하세요. ${scopeName} 파티룸 ${totalLive}곳, 오늘 비는 곳 ${today.length}곳. 타임딜·핫딜·반짝딜 특가 모음.`,
    canonical: `${site}/`,
    jsonld: [orgJsonLd(settings, site), websiteJsonLd(settings, site)],
    body,
  }));
}
