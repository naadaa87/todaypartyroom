// 공간 상세: /space/{slug}
import { pageCtx, LIVE_SQL, LIVE_PARAMS } from '../../lib/page.js';
import { loadDeals, tick, TYPE_LABEL, TYPE_LONG, slotBasePrice } from '../../lib/deals.js';
import { layout, dealCard, cardGrid, sectionTitle, breadcrumbs, badge, priceBlock, countdown, photosOf, amenitiesOf, slotLabel } from '../../lib/html.js';
import { one, all, regionUrl, regionPath, run } from '../../lib/db.js';
import { currentHost } from '../../lib/auth.js';
import { html, esc, won, todayStr, addDays, dateLabel, parseJSON } from '../../lib/util.js';
import { notFound } from '../[[path]].js';
import { getVacancyMap, getAutomationMap, effStatus } from '../../lib/availability.js';

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  const { settings, regions, site } = p;
  const slug = decodeURIComponent(context.params.slug || '');
  const s = await one(p.db, `SELECT s.*, r.name AS region_name FROM spaces s LEFT JOIN regions r ON r.id = s.region_id WHERE s.slug = ?`, [slug]);
  if (!s) return notFound(p);
  const today = todayStr();
  const live = s.status === 'approved' && ((['trial', 'active'].includes(s.subscription_status) && (!s.subscription_until || s.subscription_until >= today)) || (s.subscription_status === 'cancelled' && s.subscription_until && s.subscription_until >= today));
  let preview = false;
  if (!live) {
    const host = await currentHost(context);
    if (!host || host.id !== s.host_id) return notFound(p);
    preview = true;
  }
  await tick(p.env);
  context.waitUntil?.(run(p.db, 'UPDATE spaces SET views = views + 1 WHERE id = ?', [s.id]));
  const region = s.region_id ? regions.byId.get(s.region_id) : null;
  const [slots, deals, themes, hostRow, otherSpaces, vac] = await Promise.all([
    all(p.db, 'SELECT * FROM slots WHERE space_id = ? AND active = 1 ORDER BY sort, id', [s.id]),
    live ? loadDeals(p.env, settings, { spaceIds: [s.id], dateFilter: 'all', includeScheduled: true }) : [],
    all(p.db, 'SELECT t.* FROM themes t JOIN space_themes st ON st.theme_id = t.id WHERE st.space_id = ? ORDER BY t.sort', [s.id]),
    one(p.db, 'SELECT id, name FROM hosts WHERE id = ?', [s.host_id]),
    all(p.db, `SELECT s.*, r.name AS region_name FROM spaces s LEFT JOIN regions r ON r.id = s.region_id WHERE s.host_id = ? AND s.id != ? AND ${LIVE_SQL} LIMIT 6`, [s.host_id, s.id, ...LIVE_PARAMS()]),
    getVacancyMap(p.db, [s.id], today, addDays(today, 1)),
  ]);
  const nearby = region ? (await loadDeals(p.env, settings, { areaIds: [region.id], dateFilter: 'upcoming', limit: 7 })).filter(c => c.space.id !== s.id).slice(0, 6) : [];
  const photos = photosOf(s);
  const dayPriced = slots.some(sl => (sl.price_fri && sl.price_fri !== sl.price_weekday) || (sl.price_sun && sl.price_sun !== sl.price_weekend));
  const selected = p.url.searchParams.get('deal');
  const path = region ? regionPath(regions, region) : [];
  const bc = breadcrumbs([{ name: '홈', href: '/' }, ...path.map(r => ({ name: r.name, href: regionUrl(regions, r) })), { name: s.name, href: `/space/${s.slug}` }], site);

  // 오늘·내일 슬롯 칩
  const targetByKey = new Map();
  for (const c of deals) for (const t of c.targets) if (c.type !== 'EVENT') targetByKey.set(t.key, { c, t });
  const autoRow = (await getAutomationMap(p.db, [s.id])).get(s.id);
  const pattern = autoRow ? autoRow.pattern : {};
  const chips = [];
  for (const d of [today, addDays(today, 1)]) {
    for (const sl of slots) {
      const key = `${s.id}|${sl.id}|${d}`;
      const hit = targetByKey.get(key);
      const st = effStatus(vac, pattern, s.id, sl.id, d).status;
      const base = slotBasePrice(sl, d, settings.holidays);
      if (hit) chips.push(`<a class="slot on" href="${hit.c.virtual ? `?deal=${esc(hit.c.id)}#deals` : `/space/${esc(s.slug)}/deal/${esc(hit.c.id)}`}"><b>${esc(dateLabel(d))} ${esc(sl.name)}</b><span>${won(hit.t.price)} <em>${hit.t.rate}%</em></span></a>`);
      else if (st === 'booked') chips.push(`<span class="slot off"><b>${esc(dateLabel(d))} ${esc(sl.name)}</b><span>예약 마감</span></span>`);
      else if (st === 'closed') chips.push(`<span class="slot off"><b>${esc(dateLabel(d))} ${esc(sl.name)}</b><span>휴무</span></span>`);
      else chips.push(`<span class="slot${st === 'vacant' ? ' vac' : ''}"><b>${esc(dateLabel(d))} ${esc(sl.name)}</b><span>${won(base)}${st === 'vacant' ? ' · 비어 있음' : ' · 문의'}</span></a>`.replace('</a>', '</span>'));
    }
  }
  // 딜 블록
  const dealBlocks = deals.map(c => {
    const t = c.next;
    const isSel = selected && selected === c.id;
    return `<div class="deal-box${isSel ? ' sel' : ''}" id="deal-${esc(c.id)}" data-deal="${esc(c.id)}">
      <div class="deal-h">${badge(c.type)}<b>${esc(c.title || TYPE_LONG[c.type])}</b>${countdown(c.endsAt, c.scheduled, t.startsAt)}</div>
      <ul class="deal-targets">${c.targets.map(tt => `<li><span>${slotLabel(tt)}</span>${c.type === 'EVENT' ? `<span class="p-now">${won(tt.base)}</span>` : `<span class="p-base">${won(tt.base)}</span><span class="p-now">${won(tt.price)}</span><span class="p-rate">${tt.rate}%</span>`}</li>`).join('')}</ul>
      ${c.benefit ? `<p class="deal-benefit">혜택: ${esc(c.benefit)}</p>` : ''}
      <div class="deal-f">${c.remaining != null ? `<span class="qty${c.remaining <= 1 ? ' low' : ''}">${c.remaining}개 남음</span>` : '<span class="qty">수량 제한 없음</span>'}${c.scheduled ? '' : `<button type="button" class="btn btn-p" data-claim="${esc(c.id)}" data-link="${esc(c.dealLink || '')}">${c.type === 'EVENT' ? '이 이벤트로 예약' : '이 딜로 예약'}</button>`}</div>
    </div>`;
  }).join('');

  const amen = amenitiesOf(s);
  const bookingBtn = (() => {
    if (s.booking_type === 'tel' && s.booking_tel) return `<a class="btn btn-p btn-lg" href="tel:${esc(s.booking_tel)}" data-channel="tel" data-space="${s.id}">전화로 예약하기</a>`;
    if (s.booking_type === 'kakao' && s.booking_kakao) return `<a class="btn btn-p btn-lg" href="${esc(s.booking_kakao)}" target="_blank" rel="noopener" data-channel="kakao" data-space="${s.id}">카카오톡으로 예약하기</a>`;
    if (s.booking_url) return `<a class="btn btn-p btn-lg" href="${esc(s.booking_url)}" target="_blank" rel="noopener" data-channel="link" data-space="${s.id}">${/naver/.test(s.booking_url) ? '네이버 예약으로 이동' : '예약 페이지로 이동'}</a>`;
    if (s.booking_tel) return `<a class="btn btn-p btn-lg" href="tel:${esc(s.booking_tel)}" data-channel="tel" data-space="${s.id}">전화로 예약하기</a>`;
    return `<button type="button" class="btn btn-p btn-lg" data-open-subscribe>예약 채널 준비 중 · 알림 받기</button>`;
  })();
  const subBtns = [s.booking_tel && s.booking_type !== 'tel' ? `<a class="btn-ic" href="tel:${esc(s.booking_tel)}" data-channel="tel" data-space="${s.id}" aria-label="전화">📞</a>` : '', s.booking_kakao && s.booking_type !== 'kakao' ? `<a class="btn-ic" href="${esc(s.booking_kakao)}" target="_blank" rel="noopener" data-channel="kakao" data-space="${s.id}" aria-label="카카오톡">💬</a>` : ''].join('');

  const jsonld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: s.name, url: `${site}/space/${s.slug}`, image: photos.filter(x => !x.startsWith('/assets')).map(x => x.startsWith('http') ? x : site + x),
    description: s.intro || undefined,
    address: s.address ? { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: path[0]?.name, addressRegion: path[1]?.name, addressCountry: 'KR' } : undefined,
    geo: s.lat && s.lng ? { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng } : undefined,
    maximumAttendeeCapacity: s.capacity_max,
    telephone: s.booking_tel || undefined,
    makesOffer: deals.filter(c => c.type !== 'EVENT').flatMap(c => c.targets.map(t => ({ '@type': 'Offer', name: `${t.slot.name} (${t.slot.start_time}~${t.slot.end_time}) ${TYPE_LONG[c.type]}`, price: String(t.price), priceCurrency: 'KRW', priceSpecification: { '@type': 'PriceSpecification', price: String(t.base), priceCurrency: 'KRW', name: '정가' }, availability: 'https://schema.org/LimitedAvailability', validFrom: t.startsAt + ':00+09:00', validThrough: t.endsAt + ':00+09:00', url: c.virtual ? `${site}/space/${s.slug}?deal=${c.id}` : `${site}/space/${s.slug}/deal/${c.id}` }))),
  };

  const body = `
${preview ? `<div class="notice">호스트 미리보기 — 이 공간은 아직 공개 상태가 아닙니다(상태: ${esc(s.status)} / 구독: ${esc(s.subscription_status)}).</div>` : ''}
<section class="gallery" data-gallery><div class="gal-track">${photos.map((ph, i) => `<img src="${esc(ph)}" alt="${esc(s.name)} 사진 ${i + 1}" ${i ? 'loading="lazy"' : ''} width="800" height="600">`).join('')}</div><span class="gal-n">1/${photos.length}</span></section>
<section class="sec sec-top sp-head"><div class="wrap">
  ${bc.html}
  <h1>${esc(s.name)}</h1>
  <p class="sp-meta">${region ? `<a href="${regionUrl(regions, region)}">${esc(region.name)}</a> · ` : ''}${s.capacity_std}~${s.capacity_max}명${s.area_m2 ? ` · ${s.area_m2}㎡` : ''}${s.floor_info ? ` · ${esc(s.floor_info)}` : ''}</p>
  ${s.intro ? `<p class="lead">${esc(s.intro)}</p>` : ''}
  ${themes.length ? `<div class="chips sm">${themes.map(t => `<a class="chip" href="/theme/${esc(t.slug)}">${esc(t.icon || '')} ${esc(t.name)}</a>`).join('')}</div>` : ''}
  <div class="row-act"><button type="button" class="btn btn-o" data-share="${site}/space/${esc(s.slug)}">공유</button><button type="button" class="btn btn-o" data-open-subscribe data-region="${region ? region.id : ''}">비는 날 알림</button></div>
</div></section>

<section class="sec"><div class="wrap">
  ${sectionTitle('오늘 · 내일')}
  ${slots.length ? `<div class="slots">${chips.join('')}</div>` : '<p class="muted">요금 정보가 아직 없습니다.</p>'}
</div></section>

<section class="sec" id="deals"><div class="wrap">
  ${sectionTitle(`진행 중인 딜 <small>${deals.length}건</small>`)}
  ${deals.length ? `<div class="deal-list">${dealBlocks}</div>` : `<p class="muted">지금 진행 중인 딜이 없어요. 비는 날이 생기면 알려드릴게요. <button type="button" class="link" data-open-subscribe data-region="${region ? region.id : ''}">알림 받기</button></p>`}
</div></section>

<section class="sec"><div class="wrap">
  ${sectionTitle('요금표')}
  ${dayPriced ? `<div class="tbl-scroll"><table class="tbl"><thead><tr><th>구분</th><th>시간</th><th>월~목</th><th>금</th><th>토·공휴일</th><th>일</th><th>기준 인원</th></tr></thead><tbody>
  ${slots.map(sl => `<tr><td>${esc(sl.name)}</td><td>${esc(sl.start_time)}~${esc(sl.end_time)}${sl.kind === 'hourly' ? ' (시간당)' : ''}</td><td>${won(sl.price_weekday)}</td><td>${won(sl.price_fri || sl.price_weekday)}</td><td>${won(sl.price_weekend)}</td><td>${won(sl.price_sun || sl.price_weekend)}</td><td>${sl.base_people}명${sl.extra_fee ? ` · 추가 ${won(sl.extra_fee)}/인` : ''}</td></tr>`).join('')}
  </tbody></table></div><p class="muted">공휴일은 토요일 요금, 공휴일 전날은 금요일 요금(일요일이면 토요일 요금) 기준이에요. 정확한 금액은 예약 화면에서 한 번 더 확인해 주세요.</p>` : `<table class="tbl"><thead><tr><th>구분</th><th>시간</th><th>평일</th><th>주말·공휴일</th><th>기준 인원</th></tr></thead><tbody>
  ${slots.map(sl => `<tr><td>${esc(sl.name)}</td><td>${esc(sl.start_time)}~${esc(sl.end_time)}${sl.kind === 'hourly' ? ' (시간당)' : ''}</td><td>${won(sl.price_weekday)}</td><td>${won(sl.price_weekend)}</td><td>${sl.base_people}명${sl.extra_fee ? ` · 추가 ${won(sl.extra_fee)}/인` : ''}</td></tr>`).join('')}
  </tbody></table>`}
  ${s.deposit_text ? `<p class="muted">${esc(s.deposit_text)}</p>` : ''}
</div></section>

${s.description ? `<section class="sec"><div class="wrap">${sectionTitle('공간 소개')}<div class="prose">${esc(s.description).split(/\n{2,}/).map(x => `<p>${x.replace(/\n/g, '<br>')}</p>`).join('')}</div></div></section>` : ''}
${amen.length ? `<section class="sec"><div class="wrap">${sectionTitle('편의시설')}<div class="amen">${amen.map(a => `<span>${esc(a)}</span>`).join('')}</div></div></section>` : ''}
${(s.rules || s.refund_policy) ? `<section class="sec"><div class="wrap">${sectionTitle('이용 규칙 · 환불')}${s.rules ? `<details open><summary>이용 규칙</summary><div class="prose"><p>${esc(s.rules).replace(/\n/g, '<br>')}</p></div></details>` : ''}${s.refund_policy ? `<details><summary>환불 규정</summary><div class="prose"><p>${esc(s.refund_policy).replace(/\n/g, '<br>')}</p></div></details>` : ''}</div></section>` : ''}
<section class="sec"><div class="wrap">${sectionTitle('위치')}
  <p>${esc(s.address || '주소는 예약 후 안내')}${s.parking ? ` · 주차: ${esc(s.parking)}` : ''}</p>
  ${s.transport ? `<p class="muted">${esc(s.transport)}</p>` : ''}
  ${s.address ? `<div class="row-act"><a class="btn btn-o" href="https://map.naver.com/p/search/${encodeURIComponent(s.address)}" target="_blank" rel="noopener">네이버 지도에서 보기</a><button type="button" class="btn btn-o" data-copy="${esc(s.address)}">주소 복사</button></div>` : ''}
</div></section>
<section class="sec"><div class="wrap">${sectionTitle('호스트')}<p><b>${esc(hostRow ? hostRow.name : '')}</b> · 예약·환불 책임은 호스트에게 있습니다.</p>${otherSpaces.length ? `<div class="chips">${otherSpaces.map(o => `<a class="chip" href="/space/${esc(o.slug)}">${esc(o.name)}</a>`).join('')}</div>` : ''}</div></section>
${nearby.length ? `<section class="sec"><div class="wrap">${sectionTitle(`${esc(region.name)}의 다른 딜`, '더 보기', regionUrl(regions, region))}${cardGrid(nearby.map(c => dealCard(c, { regions })))}</div></section>` : ''}
<div class="bookbar"><div class="wrap bookbar-in"><div class="bb-info"><b>${esc(s.name)}</b><span>${deals.length ? `${deals.length}개 딜 진행 중` : '정가 예약'}</span></div>${subBtns}${bookingBtn}</div></div>
<script type="application/json" id="space-data">${JSON.stringify({ id: s.id, slug: s.slug, name: s.name, booking: { type: s.booking_type, url: s.booking_url, tel: s.booking_tel, kakao: s.booking_kakao }, dealLink: s.deal_link, region: region ? region.id : null }).replace(/</g, '\\u003c')}</script>`;

  const dealSummary = deals.length ? `${TYPE_LONG[deals[0].type]} ${won(deals[0].minPrice)} 등 ${deals.length}개 딜 진행 중` : '비는 날 할인 알림 가능';
  return html(layout({
    settings, regions, region: p.region, site, bodyClass: 'has-bookbar',
    title: `${s.name} — ${region ? region.name + ' ' : ''}파티룸 | ${s.capacity_std}~${s.capacity_max}명 | ${settings.site_name}`,
    description: `${region ? region.name + ' ' : ''}${s.name}. ${slots.map(sl => `${sl.name} ${won(sl.price_weekday)}~`).join(', ')}. ${dealSummary}. 편의시설·요금·위치 안내.`,
    canonical: `${site}/space/${s.slug}`, noindex: preview,
    og: { image: photos[0].startsWith('http') ? photos[0] : (photos[0].startsWith('/assets') ? `${site}/assets/og-default.png` : site + photos[0]) },
    jsonld: [bc.ld, jsonld], body,
  }));
}
