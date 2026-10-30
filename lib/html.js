// SSR 레이아웃·컴포넌트
import { esc, won, dateLabel, todayStr, addDays, parseJSON } from './util.js';
import { TYPE_LABEL, TYPE_LONG } from './deals.js';
import { regionUrl, regionPath } from './db.js';

export const PLACEHOLDER = '/assets/placeholder.svg';

export function photosOf(space) {
  const p = parseJSON(space.photos_json, []);
  return Array.isArray(p) && p.length ? p : [PLACEHOLDER];
}
export function amenitiesOf(space) { return parseJSON(space.amenities_json, []); }

export function layout(ctx) {
  const { settings, title, description = '', canonical = '', jsonld = [], og = {}, noindex = false, body, bodyClass = '', nav = '', site = '', region = null, regions = null, extraHead = '' } = ctx;
  const siteName = settings.site_name || '오늘의파티룸';
  const fullTitle = title ? title : `${siteName} — ${settings.site_tagline || ''}`;
  const ogImage = og.image || `${site}/assets/og-default.png`;
  const ld = jsonld.filter(Boolean).map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n');
  const regionLabel = region ? regionPath(regions, region).slice(-1)[0].name : '지역 선택';
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
${noindex ? '<meta name="robots" content="noindex,follow">' : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(siteName)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(ogImage)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="/assets/app.css">
${ld}
${extraHead}
</head>
<body class="${esc(bodyClass)}" data-today="${todayStr()}">
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="logo" href="/" aria-label="${esc(siteName)} 홈"><span class="logo-t">오늘의파티룸</span><span class="logo-dot" aria-hidden="true"></span></a>
    <div class="hdr-r">
      <button type="button" class="btn-region" data-open-region aria-label="지역 선택"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg><span>${esc(regionLabel)}</span></button>
      <a class="btn-host" href="/host">호스트</a>
    </div>
  </div>
</header>
<main class="main">${body}</main>
<footer class="ftr">
  <div class="wrap">
    <div class="ftr-brand">오늘의파티룸<span class="logo-dot" aria-hidden="true"></span></div>
    <p class="ftr-tag">${esc(settings.site_tagline || '')}</p>
    <nav class="ftr-links">
      <a href="/deals/today">오늘 딜</a><a href="/deals/tomorrow">내일 딜</a><a href="/events">이벤트</a><a href="/magazine">매거진</a><a href="/host">호스트 모집</a><a href="/help">고객센터</a><a href="/terms">이용약관</a><a href="/privacy">개인정보처리방침</a>
    </nav>
    ${settings.footer_links && settings.footer_links.length ? `<div class="ftr-net"><span>함께하는 사이트</span>${settings.footer_links.map(l => `<a href="${esc(l.url)}" rel="noopener" target="_blank">${esc(l.name)}</a>`).join('')}</div>` : ''}
    <p class="ftr-co">${esc(settings.company_name || '')} · ${esc(settings.company_info || '')}<br>문의 ${esc(settings.contact_email || '')}</p>
    <p class="ftr-note">오늘의파티룸은 공간 정보와 할인 조건을 보여주는 홍보 플랫폼입니다. 예약·결제·환불은 각 공간 호스트가 정한 채널에서 이루어지며, 그 책임은 호스트에게 있습니다.</p>
  </div>
</footer>
<nav class="bnav" aria-label="하단 메뉴">
  <a href="/" class="${nav === 'home' ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg><span>홈</span></a>
  <a href="/deals/today" class="${nav === 'deals' ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="M20.6 13.4L11.4 4.2A2 2 0 0 0 10 3.6H4a1 1 0 0 0-1 1v6a2 2 0 0 0 .6 1.4l9.2 9.2a2 2 0 0 0 2.8 0l5-5a2 2 0 0 0 0-2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg><span>오늘딜</span></a>
  <a href="#" data-open-region class="${nav === 'regions' ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg><span>지역</span></a>
  <a href="/me" class="${nav === 'me' ? 'on' : ''}"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><span>마이</span></a>
</nav>
<div id="sheet-root"></div>
<script src="/assets/guest.js" defer></script>
</body>
</html>`;
}

export function badge(type, extra = '') { return `<span class="badge b-${type.toLowerCase()}${extra ? ' ' + extra : ''}">${TYPE_LABEL[type]}</span>`; }

export function priceBlock(t, type) {
  if (type === 'EVENT') return `<div class="price"><span class="p-now">${won(t.base)}</span></div>`;
  return `<div class="price"><span class="p-base">${won(t.base)}</span><span class="p-now">${won(t.price)}</span><span class="p-rate">${t.rate}%</span></div>`;
}
export function countdown(endsAt, scheduled = false, startsAt = '') {
  if (scheduled) return `<span class="cd cd-sched">${esc(startsAt.slice(5, 10).replace('-', '/'))} ${esc(startsAt.slice(11, 16))} 오픈 예정</span>`;
  return `<span class="cd" data-ends="${esc(endsAt)}">${esc(endsAt.slice(11, 16))}까지</span>`;
}
export function slotLabel(t) { return `${dateLabel(t.date)} ${esc(t.slot.name)} ${esc(t.slot.start_time)}~${esc(t.slot.end_time)}`; }

export function channelIcons(space) {
  const ic = [];
  if (space.booking_type === 'link' || space.booking_url) ic.push('<span title="예약 링크">🔗</span>');
  if (space.booking_tel) ic.push('<span title="전화">📞</span>');
  if (space.booking_kakao) ic.push('<span title="카카오톡">💬</span>');
  return `<span class="ch-ic">${ic.join('')}</span>`;
}

/** 딜 카드 */
export function dealCard(c, { regions } = {}) {
  const s = c.space; const t = c.next;
  const photo = photosOf(s)[0];
  const href = c.virtual ? `/space/${esc(s.slug)}?deal=${esc(c.id)}` : `/space/${esc(s.slug)}/deal/${esc(c.id)}`;
  const more = c.targets.length > 1 ? `<span class="more">외 ${c.targets.length - 1}개 일정</span>` : '';
  const evt = t.events && t.events.length ? `<span class="badge b-event">+이벤트</span>` : '';
  return `<a class="card deal-card" href="${href}" data-deal="${esc(c.id)}" data-space="${s.id}" data-cap="${s.capacity_max}" data-rate="${c.maxRate}" data-price="${c.minPrice}" data-type="${c.type.toLowerCase()}" data-ends="${esc(c.endsAt)}">
  <div class="card-img"><img src="${esc(photo)}" alt="${esc(s.name)}" loading="lazy" width="400" height="300"><div class="badges">${badge(c.type)}${evt}</div></div>
  <div class="card-b">
    <div class="card-t">${esc(s.name)}<span class="card-r">${esc(s.region_name || '')}</span></div>
    <div class="card-s">${slotLabel(t)}${more}</div>
    ${c.type === 'EVENT' ? `<div class="card-ev">${esc(c.benefit || c.title)}</div>` : priceBlock(t, c.type)}
    <div class="card-m">${countdown(c.endsAt, c.scheduled, t.startsAt)}${c.remaining != null ? `<span class="qty${c.remaining <= 1 ? ' low' : ''}">${c.remaining}개 남음</span>` : ''}<span class="cap">${s.capacity_std}~${s.capacity_max}명</span>${channelIcons(s)}</div>
  </div></a>`;
}

/** 공간 카드(딜 없음) */
export function spaceCard(s, minPrice) {
  const photo = photosOf(s)[0];
  return `<a class="card space-card" href="/space/${esc(s.slug)}" data-space="${s.id}">
  <div class="card-img"><img src="${esc(photo)}" alt="${esc(s.name)}" loading="lazy" width="400" height="300"></div>
  <div class="card-b"><div class="card-t">${esc(s.name)}<span class="card-r">${esc(s.region_name || '')}</span></div>
  <div class="card-s">${esc(s.intro || '')}</div>
  <div class="card-m">${minPrice ? `<span class="p-from">${won(minPrice)}~</span>` : ''}<span class="cap">${s.capacity_std}~${s.capacity_max}명</span>${channelIcons(s)}</div></div></a>`;
}

export function cardGrid(items, empty) {
  if (!items.length) return empty || '';
  return `<div class="grid">${items.join('')}</div>`;
}
export function emptyState(text, linkText, href, sub = true) {
  return `<div class="empty"><p>${esc(text)}</p>${linkText ? `<a class="btn btn-o" href="${esc(href)}">${esc(linkText)}</a>` : ''}${sub ? `<button type="button" class="btn btn-p" data-open-subscribe>딜 뜨면 알림 받기</button>` : ''}</div>`;
}

export function breadcrumbs(items, site) {
  const html = `<nav class="bc" aria-label="경로">${items.map((it, i) => i < items.length - 1 ? `<a href="${esc(it.href)}">${esc(it.name)}</a><span>›</span>` : `<span class="cur">${esc(it.name)}</span>`).join('')}</nav>`;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.href ? site + it.href : undefined })) };
  return { html, ld };
}

export function dateTabs(active, base = '') {
  const tabs = [['today', '오늘'], ['tomorrow', '내일'], ['week', '이번 주']];
  return `<div class="tabs">${tabs.map(([k, l]) => `<a class="tab${active === k ? ' on' : ''}" href="${base}${k === 'today' ? '' : '?d=' + k}">${l}</a>`).join('')}</div>`;
}

export function sectionTitle(t, more, href) {
  return `<div class="sec-h"><h2>${t}</h2>${more ? `<a href="${esc(href)}" class="sec-more">${esc(more)} ›</a>` : ''}</div>`;
}

export function orgJsonLd(settings, site) {
  return { '@context': 'https://schema.org', '@type': 'Organization', name: settings.site_name, url: site, logo: `${site}/assets/favicon.svg`, email: settings.contact_email || undefined };
}
export function websiteJsonLd(settings, site) {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: settings.site_name, url: site, potentialAction: { '@type': 'SearchAction', target: `${site}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' } };
}
export function faqJsonLd(faqs) {
  if (!faqs || !faqs.length) return null;
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}
export function faqHtml(faqs) {
  if (!faqs || !faqs.length) return '';
  return `<section class="faq"><h2>자주 묻는 질문</h2>${faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`;
}
export function themeChips(themes, prefix = '/theme/') {
  return `<div class="chips">${themes.map(t => `<a class="chip" href="${prefix}${esc(t.slug)}">${t.icon ? esc(t.icon) + ' ' : ''}${esc(t.name)}</a>`).join('')}</div>`;
}
export function hostCta(settings) {
  return `<section class="host-cta"><div class="wrap"><h2>파티룸 운영하세요?</h2><p>${esc(settings.host_fee_text || '월 30,000원 · 수수료 0원')}. 비는 시간을 당일·전날 할인으로 채우세요. 예약은 쓰던 채널 그대로.</p><a class="btn btn-p" href="/host">호스트 알아보기</a></div></section>`;
}
export function regionsChips(regions, areaCounts, limit = 12) {
  const areas = regions.rows.filter(r => r.level === 'area').map(r => ({ r, n: areaCounts.get(r.id) || 0 })).sort((a, b) => b.n - a.n || a.r.id - b.r.id).slice(0, limit);
  return `<div class="chips">${areas.map(({ r, n }) => `<a class="chip" href="${regionUrl(regions, regions.byId.get(r.id))}">${esc(r.name)}${n ? `<b>${n}</b>` : ''}</a>`).join('')}</div>`;
}
