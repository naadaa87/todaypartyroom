// 딜 상세(공유용): /space/{slug}/deal/{id}
import { pageCtx } from '../../../../lib/page.js';
import { loadDealById, tick, TYPE_LONG } from '../../../../lib/deals.js';
import { layout, badge, countdown, breadcrumbs, photosOf, slotLabel, dealCard, cardGrid, sectionTitle } from '../../../../lib/html.js';
import { one, regionUrl, regionPath } from '../../../../lib/db.js';
import { html, esc, won, redirect, parseJSON } from '../../../../lib/util.js';
import { notFound } from '../../../[[path]].js';

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  const { settings, regions, site } = p;
  const slug = decodeURIComponent(context.params.slug || ''), id = context.params.id;
  if (String(id).startsWith('A-')) return redirect(`/space/${slug}?deal=${id}#deals`);
  const s = await one(p.db, `SELECT s.*, r.name AS region_name FROM spaces s LEFT JOIN regions r ON r.id = s.region_id WHERE s.slug = ?`, [slug]);
  if (!s) return notFound(p);
  await tick(p.env);
  const row = await one(p.db, 'SELECT * FROM deals WHERE id = ? AND space_id = ?', [Number(id), s.id]);
  if (!row) return notFound(p);
  const card = await loadDealById(p.env, settings, id);
  const region = s.region_id ? regions.byId.get(s.region_id) : null;
  const path = region ? regionPath(regions, region) : [];
  const bc = breadcrumbs([{ name: '홈', href: '/' }, ...path.map(r => ({ name: r.name, href: regionUrl(regions, r) })), { name: s.name, href: `/space/${s.slug}` }, { name: TYPE_LONG[row.type], href: '' }], site);
  const photos = photosOf(s);
  const ended = !card;
  const targets = card ? card.targets : parseJSON(row.targets_json, []);
  const body = `
<section class="sec sec-top"><div class="wrap">${bc.html}
  <div class="deal-hero">
    <img src="${esc(photos[0])}" alt="${esc(s.name)}" width="800" height="600">
    <div class="deal-hero-b">
      ${badge(row.type)} ${ended ? '<span class="badge b-ended">종료됨</span>' : ''}
      <h1>${esc(row.title || TYPE_LONG[row.type])} · ${esc(s.name)}</h1>
      <p class="sp-meta">${region ? esc(region.name) + ' · ' : ''}${s.capacity_std}~${s.capacity_max}명</p>
      ${ended ? `<p class="lead">이 딜은 종료되었습니다. 같은 공간의 다른 딜이나 요금표를 확인해 보세요.</p><a class="btn btn-p" href="/space/${esc(s.slug)}">공간 상세 보기</a>` : `
      <ul class="deal-targets">${card.targets.map(t => `<li><span>${slotLabel(t)}</span>${row.type === 'EVENT' ? `<span class="p-now">${won(t.base)}</span>` : `<span class="p-base">${won(t.base)}</span><span class="p-now">${won(t.price)}</span><span class="p-rate">${t.rate}%</span>`}</li>`).join('')}</ul>
      ${card.benefit ? `<p class="deal-benefit">혜택: ${esc(card.benefit)}</p>` : ''}
      <p class="deal-cd">${countdown(card.endsAt, card.scheduled, card.next.startsAt)}${card.remaining != null ? ` · ${card.remaining}개 남음` : ''}</p>
      <div class="row-act">${card.scheduled ? '' : `<button type="button" class="btn btn-p btn-lg" data-claim="${esc(card.id)}" data-link="${esc(card.dealLink || '')}">이 딜로 예약</button>`}<button type="button" class="btn btn-o" data-share="${site}/space/${esc(s.slug)}/deal/${esc(id)}">공유</button></div>
      <p class="muted">예약은 호스트가 정한 채널로 연결되며, 딜 전용 링크가 없으면 딜 코드가 발급됩니다.</p>`}
    </div>
  </div>
</div></section>
<section class="sec"><div class="wrap">${sectionTitle('공간 정보', '상세 보기', `/space/${esc(s.slug)}`)}<p>${esc(s.intro || '')}</p><p class="muted">${esc(s.address || '')}</p></div></section>
<script type="application/json" id="space-data">${JSON.stringify({ id: s.id, slug: s.slug, name: s.name, booking: { type: s.booking_type, url: s.booking_url, tel: s.booking_tel, kakao: s.booking_kakao }, dealLink: s.deal_link, region: region ? region.id : null }).replace(/</g, '\\u003c')}</script>`;
  const t = card ? card.next : null;
  return html(layout({
    settings, regions, region: p.region, site,
    title: ended ? `[종료] ${TYPE_LONG[row.type]} ${s.name} — ${settings.site_name}` : `[${TYPE_LONG[row.type]}] ${s.name} ${t.slot.name} ${won(t.price)} (${t.rate}%) — ${settings.site_name}`,
    description: ended ? `종료된 딜입니다. ${s.name}의 다른 딜과 요금표를 확인하세요.` : `${t.endsAt.slice(11, 16)}까지. 정가 ${won(t.base)} → ${won(t.price)}. ${region ? region.name + ' ' : ''}파티룸 특가.`,
    canonical: ended ? `${site}/space/${s.slug}` : `${site}/space/${s.slug}/deal/${id}`, noindex: ended,
    og: { image: photos[0].startsWith('http') ? photos[0] : `${site}/assets/og-default.png` },
    jsonld: [bc.ld, card && row.type !== 'EVENT' ? { '@context': 'https://schema.org', '@type': 'Offer', name: `${TYPE_LONG[row.type]} ${s.name} ${t.slot.name}`, price: String(t.price), priceCurrency: 'KRW', priceValidUntil: t.endsAt + ':00+09:00', availability: card.remaining === 0 ? 'https://schema.org/SoldOut' : 'https://schema.org/LimitedAvailability', url: `${site}/space/${s.slug}/deal/${id}`, itemOffered: { '@type': 'LocalBusiness', name: s.name, url: `${site}/space/${s.slug}` } } : null],
    body,
  }));
}
