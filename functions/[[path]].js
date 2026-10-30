// 루트 캐치올: 지역 허브(/seoul/mapo/hongdae), sitemap.xml, 404
import { pageCtx, areaCounts, countInRegion, liveSpaces, LIVE_SQL, LIVE_PARAMS } from '../lib/page.js';
import { loadDeals, tick } from '../lib/deals.js';
import { layout, dealCard, cardGrid, emptyState, sectionTitle, themeChips, hostCta, spaceCard, breadcrumbs, dateTabs, faqHtml, faqJsonLd } from '../lib/html.js';
import { findRegionByPath, descendantAreaIds, regionUrl, regionPath, all } from '../lib/db.js';
import { html, esc, won, parseJSON, todayStr } from '../lib/util.js';
import { onRequestGet as home } from './index.js';

export async function onRequestGet(context) {
  const parts = (context.params.path || []).filter(Boolean);
  if (!parts.length) return home(context);
  const first = parts[0] || '';
  if (parts.length === 1 && /^sitemap(-[a-z]+)?\.xml$/.test(first)) return sitemap(context, first);
  // 정적 파일이면 Pages 자산으로 넘김
  if (/\.[a-z0-9]{2,5}$/i.test(parts[parts.length - 1] || '')) {
    const r = await context.next();
    if (r.status !== 404) return r;
  }
  const p = await pageCtx(context);
  const region = findRegionByPath(p.regions, parts);
  if (!region || parts.length > 3) return notFound(p);
  return regionHub(p, region);
}

export function notFound(p) {
  const body = `<section class="sec"><div class="wrap"><div class="empty"><h1>페이지를 찾을 수 없어요</h1><p>주소가 바뀌었거나 종료된 페이지입니다.</p><a class="btn btn-p" href="/deals/today">오늘 비는 파티룸 보기</a></div></div></section>`;
  return html(layout({ settings: p.settings, regions: p.regions, region: p.region, site: p.site, title: '페이지를 찾을 수 없어요 — ' + p.settings.site_name, noindex: true, body }), 404);
}

async function regionHub(p, region) {
  const { settings, regions, themes, site } = p;
  await tick(p.env);
  const d = p.url.searchParams.get('d') || 'today';
  const areaIds = descendantAreaIds(regions, region);
  const counts = await areaCounts(p.db);
  const live = countInRegion(regions, region, counts);
  const path = regionPath(regions, region);
  const url = regionUrl(regions, region);
  const [today, tomorrow, week, spaces] = await Promise.all([
    loadDeals(p.env, settings, { areaIds, dateFilter: 'today', types: ['TODAY', 'TOMORROW', 'TIME', 'HOT', 'FLASH'] }),
    loadDeals(p.env, settings, { areaIds, dateFilter: 'tomorrow', types: ['TODAY', 'TOMORROW', 'TIME', 'HOT', 'FLASH'] }),
    loadDeals(p.env, settings, { areaIds, dateFilter: 'upcoming', includeScheduled: true }),
    liveSpaces(p.db, { areaIds, limit: 100 }),
  ]);
  const list = d === 'tomorrow' ? tomorrow : d === 'week' ? week : today;
  const bc = breadcrumbs([{ name: '홈', href: '/' }, ...path.map(r => ({ name: r.name, href: regionUrl(regions, r) }))], site);
  const prices = spaces.map(s => s.min_price).filter(Boolean);
  const minP = prices.length ? Math.min(...prices) : 0, maxP = prices.length ? Math.max(...prices) : 0;
  const children = (region.children || []).filter(r => true);
  const siblings = region.parent_id ? (regions.byId.get(region.parent_id).children || []).filter(r => r.id !== region.id) : [];
  const customFaq = parseJSON(region.faq_json, []);
  const faqs = [
    ...customFaq,
    { q: `${region.name} 파티룸, 오늘 바로 예약할 수 있나요?`, a: today.length ? `네. 지금 기준 ${region.name}에서 오늘 비어 있는 파티룸은 ${today.length}곳이며, 당일 할인가로 예약할 수 있습니다. 예약은 각 공간이 정한 채널(네이버 예약·전화·카카오톡)로 연결됩니다.` : `현재 오늘 비어 있는 곳은 없지만, 내일 비는 곳은 ${tomorrow.length}곳입니다. 조건을 걸어 두면 딜이 열릴 때 알려드립니다.` },
    { q: `${region.name} 파티룸 가격은 보통 얼마인가요?`, a: prices.length ? `등록된 ${spaces.length}곳의 평일 최저 요금 기준 ${won(minP)}부터 ${won(maxP)}까지입니다. 주말·공휴일은 요금이 다르며, 비는 날에는 정가 대비 할인가가 표시됩니다.` : `아직 등록된 공간이 적어 가격대를 안내하기 어렵습니다. 호스트 모집 중입니다.` },
    { q: '당일예약할인과 전날예약할인은 무엇인가요?', a: '호스트가 비어 있다고 표시한 시간대가 당일(오늘) 또는 전날(내일)이 되면 호스트가 미리 정한 할인율이 자동으로 적용되는 특가입니다. 종료 시각과 남은 수량이 함께 표시됩니다.' },
  ];
  const noindex = live < settings.index_min_spaces;
  const body = `
<section class="sec sec-top"><div class="wrap">
  ${bc.html}
  <h1>${esc(region.name)} 파티룸 ${today.length ? `오늘 비는 곳 <em>${today.length}곳</em>` : `<em>${live}곳</em> 모아보기`}</h1>
  <p class="lead">${region.description ? esc(region.description) : `${esc(region.name)} 파티룸 ${live}곳 중 오늘 ${today.length}곳, 내일 ${tomorrow.length}곳이 비어 있어요. 정가 대비 할인가, 인원·시간대별로 바로 비교하고 예약하세요.`}</p>
  ${children.length ? `<div class="chips">${children.map(c => `<a class="chip" href="${regionUrl(regions, regions.byId.get(c.id))}">${esc(c.name)}<b>${countInRegion(regions, regions.byId.get(c.id), counts)}</b></a>`).join('')}</div>` : ''}
  ${dateTabs(d, url)}
  <div class="filters" data-filter-bar>
    <select data-f="cap"><option value="">인원</option><option value="4">4명 이상</option><option value="8">8명 이상</option><option value="12">12명 이상</option><option value="20">20명 이상</option></select>
    <select data-f="type"><option value="">딜 유형</option><option value="today">당일</option><option value="tomorrow">전날</option><option value="time">타임딜</option><option value="hot">핫딜</option><option value="flash">반짝</option><option value="event">이벤트</option></select>
    <select data-f="sort"><option value="">종료 임박순</option><option value="rate">할인율순</option><option value="price">낮은 가격순</option></select>
  </div>
  ${cardGrid(list.map(c => dealCard(c, { regions })), emptyState(d === 'today' ? (tomorrow.length ? `오늘은 비는 곳이 없어요. 내일 비는 곳 ${tomorrow.length}곳이 있어요.` : `${region.name}에 오늘 비는 곳이 없어요.`) : d === 'tomorrow' ? '내일 비는 곳이 아직 없어요.' : '이번 주 예정된 특가가 아직 없어요.', d === 'today' && tomorrow.length ? '내일 비는 곳 보기' : '', `${url}?d=tomorrow`))}
</div></section>

<section class="sec"><div class="wrap">
  ${sectionTitle(`${esc(region.name)} 전체 파티룸 <small>${spaces.length}곳</small>`)}
  ${cardGrid(spaces.map(s => spaceCard(s, s.min_price)), `<div class="empty"><p>${esc(region.name)}은 호스트 모집 중입니다. 파티룸을 운영하신다면 지금 등록해 보세요.</p><a class="btn btn-p" href="/host">호스트 알아보기</a></div>`)}
</div></section>

<section class="sec"><div class="wrap">${sectionTitle('용도별로 찾기')}${themeChips(themes, `/theme/`)}</div></section>
${siblings.length ? `<section class="sec"><div class="wrap">${sectionTitle('주변 지역')}<div class="chips">${siblings.slice(0, 8).map(c => `<a class="chip" href="${regionUrl(regions, regions.byId.get(c.id))}">${esc(c.name)}<b>${countInRegion(regions, regions.byId.get(c.id), counts)}</b></a>`).join('')}</div></div></section>` : ''}
<section class="sec"><div class="wrap">${faqHtml(faqs)}</div></section>
${hostCta(settings)}`;

  const title = today.length ? `${region.name} 파티룸 오늘 비는 곳 ${today.length}곳 | 당일·전날 할인 — ${settings.site_name}` : `${region.name} 파티룸 ${live}곳 모아보기 | 가격·인원 비교 — ${settings.site_name}`;
  const description = today.length ? `${region.name} 파티룸 ${live}곳 중 오늘 ${today.length}곳, 내일 ${tomorrow.length}곳이 비어 있어요. 정가 대비 할인가, 인원·시간대별로 바로 비교하고 예약하세요.` : `${region.name} 파티룸 ${live}곳의 요금·인원·시간대를 한눈에. 비는 날 할인 알림을 받아보세요.`;
  return html(layout({
    settings, regions, region, site, nav: 'regions', title, description, canonical: `${site}${url}`, noindex,
    jsonld: [bc.ld, faqJsonLd(faqs), { '@context': 'https://schema.org', '@type': 'ItemList', name: `${region.name} 파티룸`, itemListElement: spaces.slice(0, 30).map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site}/space/${s.slug}`, name: s.name })) }],
    body: body, extraHead: `<meta name="tpr-region" content="${region.id}">`,
  }));
}

async function sitemap(context, name) {
  const p = await pageCtx(context);
  const { site, regions } = p;
  const xmlHead = `<?xml version="1.0" encoding="UTF-8"?>`;
  const xml = (body) => new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
  const today = todayStr();
  if (name === 'sitemap.xml') {
    const names = ['regions', 'spaces', 'themes', 'deals', 'magazine'];
    return xml(`${xmlHead}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${names.map(n => `<sitemap><loc>${site}/sitemap-${n}.xml</loc><lastmod>${today}</lastmod></sitemap>`).join('')}</sitemapindex>`);
  }
  let urls = [];
  const counts = await areaCounts(p.db);
  if (name === 'sitemap-regions.xml') {
    urls = regions.rows.filter(r => r.indexable !== 0 && countInRegion(regions, regions.byId.get(r.id), counts) >= p.settings.index_min_spaces).map(r => ({ loc: site + regionUrl(regions, regions.byId.get(r.id)), freq: 'hourly', pri: r.level === 'area' ? '0.9' : '0.7' }));
    urls.unshift({ loc: site + '/', freq: 'hourly', pri: '1.0' });
  } else if (name === 'sitemap-spaces.xml') {
    const rows = await all(p.db, `SELECT slug, updated_at FROM spaces s WHERE ${LIVE_SQL}`, LIVE_PARAMS());
    urls = rows.map(r => ({ loc: `${site}/space/${r.slug}`, lastmod: (r.updated_at || '').slice(0, 10), freq: 'daily', pri: '0.8' }));
  } else if (name === 'sitemap-themes.xml') {
    urls = p.themes.map(t => ({ loc: `${site}/theme/${t.slug}`, freq: 'daily', pri: '0.6' }));
  } else if (name === 'sitemap-deals.xml') {
    urls = ['today', 'tomorrow', 'time', 'hot', 'flash'].map(t => ({ loc: `${site}/deals/${t}`, freq: 'hourly', pri: '0.8' }));
    urls.push({ loc: `${site}/events`, freq: 'daily', pri: '0.6' });
    const rows = await all(p.db, `SELECT d.id, s.slug FROM deals d JOIN spaces s ON s.id = d.space_id WHERE d.status != 'ENDED' AND d.origin = 'MANUAL'`);
    urls.push(...rows.map(r => ({ loc: `${site}/space/${r.slug}/deal/${r.id}`, freq: 'hourly', pri: '0.5' })));
  } else if (name === 'sitemap-magazine.xml') {
    const rows = await all(p.db, `SELECT slug, updated_at FROM articles WHERE published = 1`);
    urls = [{ loc: `${site}/magazine`, freq: 'weekly', pri: '0.5' }, { loc: `${site}/host`, freq: 'monthly', pri: '0.6' }, ...rows.map(r => ({ loc: `${site}/magazine/${r.slug}`, lastmod: (r.updated_at || '').slice(0, 10), freq: 'monthly', pri: '0.5' }))];
  } else return new Response('not found', { status: 404 });
  return xml(`${xmlHead}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('')}</urlset>`);
}
