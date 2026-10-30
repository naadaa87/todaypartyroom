// 마이: 받은 딜 코드, 알림 구독
import { pageCtx } from '../lib/page.js';
import { layout, sectionTitle } from '../lib/html.js';
import { currentGuest } from '../lib/auth.js';
import { all } from '../lib/db.js';
import { html, esc, won, dateLabel } from '../lib/util.js';

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  const g = await currentGuest(context);
  let body;
  if (!g) {
    body = `<section class="sec sec-top"><div class="wrap narrow"><h1>마이</h1><div class="empty"><p>딜을 받으면 코드가 여기에 모여요. 알림 조건을 걸어 두면 비는 곳이 생길 때 알려드립니다.</p><a class="btn btn-p" href="/deals/today">오늘 비는 곳 보기</a><button type="button" class="btn btn-o" data-open-subscribe>딜 알림 받기</button></div></div></section>`;
  } else {
    const [claims, subs] = await Promise.all([
      all(p.db, `SELECT c.*, s.name AS space_name, s.slug, s.booking_tel, s.booking_kakao, s.booking_url, sl.name AS slot_name, d.type FROM claims c JOIN spaces s ON s.id = c.space_id LEFT JOIN slots sl ON sl.id = c.slot_id LEFT JOIN deals d ON d.id = c.deal_id WHERE c.phone = ? ORDER BY c.issued_at DESC LIMIT 50`, [g.phone]),
      all(p.db, `SELECT * FROM alert_subs WHERE contact = ? AND active = 1 ORDER BY created_at DESC`, [g.phone]),
    ]);
    const masked = g.phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-****-$3');
    body = `<section class="sec sec-top"><div class="wrap narrow"><h1>마이 <small>${esc(masked)}</small></h1>
    ${sectionTitle('받은 딜 코드')}
    ${claims.length ? `<div class="claim-list">${claims.map(c => `<div class="claim ${c.status}"><div class="claim-code">${esc(c.code)}</div><div class="claim-b"><b><a href="/space/${esc(c.slug)}">${esc(c.space_name)}</a></b><span>${c.date ? esc(dateLabel(c.date)) : ''} ${esc(c.slot_name || '')} · ${won(c.price)} <s>${won(c.base_price)}</s></span><span class="muted">${c.status === 'used' ? '사용 완료' : c.status === 'expired' ? '만료' : `${esc((c.expires_at || '').slice(5, 16).replace('T', ' '))}까지 유효`}</span></div><div class="claim-a">${c.booking_tel ? `<a class="btn-ic" href="tel:${esc(c.booking_tel)}">📞</a>` : ''}${c.booking_kakao ? `<a class="btn-ic" href="${esc(c.booking_kakao)}" target="_blank" rel="noopener">💬</a>` : ''}</div></div>`).join('')}</div>` : '<p class="muted">아직 받은 코드가 없어요.</p>'}
    ${sectionTitle('딜 알림')}
    ${subs.length ? `<ul class="sub-list">${subs.map(s => `<li><span>${esc(s.channel)} · 지역 ${JSON.parse(s.regions_json || '[]').length}곳 · ${s.size ? s.size + '명 이상' : '인원 무관'}</span><button type="button" class="link" data-unsub="${s.id}">해지</button></li>`).join('')}</ul>` : '<p class="muted">등록된 알림이 없어요.</p>'}
    <div class="row-act"><button type="button" class="btn btn-p" data-open-subscribe>알림 추가</button><a class="btn btn-o" href="/api/guest/logout">로그아웃</a></div>
    </div></section>`;
  }
  return html(layout({ settings: p.settings, regions: p.regions, region: p.region, site: p.site, nav: 'me', title: `마이 — ${p.settings.site_name}`, description: '받은 딜 코드와 알림 설정', noindex: true, body }));
}
