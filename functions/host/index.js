// 호스트 모집 랜딩: /host
import { pageCtx } from '../../lib/page.js';
import { layout, breadcrumbs, faqHtml, faqJsonLd } from '../../lib/html.js';
import { html, esc } from '../../lib/util.js';

export async function onRequestGet(context) {
  const p = await pageCtx(context);
  const { settings, regions, site } = p;
  const fee = settings.host_fee_text || '월 30,000원 (하루 1,000원) · 수수료 0원';
  const trial = settings.trial_days ? `${settings.trial_days}일 무료 체험` : '';
  const bc = breadcrumbs([{ name: '홈', href: '/' }, { name: '호스트', href: '/host' }], site);
  const faqs = [
    { q: '정말 수수료가 없나요?', a: `네. 공간 1개당 ${fee}만 내시면 됩니다. 예약·결제는 호스트님이 쓰시는 채널(네이버 예약, 전화, 카카오톡)에서 그대로 이루어지므로 플랫폼이 거래에 개입하지 않습니다.` },
    { q: '스페이스클라우드나 네이버 예약과 같이 써도 되나요?', a: '그게 기본입니다. 오늘의파티룸은 "갈아타는" 플랫폼이 아니라 비는 시간만 따로 홍보하는 채널입니다. 딜 전용 상품 링크를 네이버 예약에 만들어 두면 손님이 할인 상품으로 바로 들어옵니다.' },
    { q: '당일·전날 할인은 어떻게 자동으로 열리나요?', a: '캘린더에서 비는 슬롯을 체크해 두면, 그 날짜가 전날·당일이 되는 순간 호스트님이 정한 할인율(예: 전날 15%, 당일 25%)로 딜이 열립니다. 바닥가, 제외 요일, 월 한도도 정할 수 있어 필요한 만큼만 할인됩니다.' },
    { q: '사업자가 아니어도 등록할 수 있나요?', a: '현재는 사업자등록이 있는 호스트를 우선 승인합니다. 개인 호스트 허용은 본인확인 체계가 갖춰진 뒤 안내드립니다.' },
    { q: '해지는 어떻게 하나요?', a: '호스트센터에서 언제든 해지할 수 있고, 이미 결제한 기간이 끝날 때까지 노출이 유지됩니다.' },
  ];
  const body = `
<section class="hero host-hero"><div class="wrap">${bc.html}
  <h1>비는 시간을<br>당일·전날 할인으로 채우세요</h1>
  <p class="hero-p">${esc(fee)}${trial ? ` · ${esc(trial)}` : ''}. 등록은 10분, 모든 기능 무료, 예약은 내 채널 그대로.</p>
  <div class="hero-ctl"><a class="btn btn-p btn-lg" href="/host/app#signup">10분 만에 등록하기</a><a class="btn btn-o btn-lg" href="/host/app#login">호스트 로그인</a></div>
  <div class="nums"><div><b>10분</b><span>등록 시간</span></div><div><b>1,000원</b><span>하루 비용</span></div><div><b>0원</b><span>예약 수수료</span></div></div>
</div></section>
<section class="sec"><div class="wrap">
  <h2>어떻게 되나요?</h2>
  <div class="steps"><div><span>1</span><b>공실 체크</b><p>주간 캘린더에서 비는 슬롯을 탭 한 번으로 표시합니다.</p></div><div><span>2</span><b>자동 할인</b><p>전날·당일이 되면 정해 둔 할인율로 딜이 열리고 구독자에게 알림이 갑니다.</p></div><div><span>3</span><b>내 채널로 예약</b><p>손님은 네이버 예약·전화·카카오톡 등 호스트님 채널로 바로 들어옵니다.</p></div></div>
</div></section>
<section class="sec"><div class="wrap">
  <h2>딜 6종, 전부 무료</h2>
  <div class="deal-types">
    <div><span class="badge b-today">당일</span><b>당일예약할인</b><p>오늘 비는 슬롯에 자동 적용</p></div>
    <div><span class="badge b-tomorrow">전날</span><b>전날예약할인</b><p>내일 비는 슬롯에 자동 적용</p></div>
    <div><span class="badge b-time">타임딜</span><b>타임딜</b><p>정한 시간에만 열리는 할인, 카운트다운</p></div>
    <div><span class="badge b-hot">핫딜</span><b>핫딜</b><p>기간·수량을 정해 크게 내리는 특가</p></div>
    <div><span class="badge b-flash">반짝</span><b>반짝딜</b><p>1~3시간, 1~2건 한정 게릴라 할인</p></div>
    <div><span class="badge b-event">이벤트</span><b>이벤트</b><p>케이크 증정, 시간 연장 같은 혜택</p></div>
  </div>
</div></section>
<section class="sec"><div class="wrap">
  <h2>다른 플랫폼과 함께 쓰세요</h2>
  <table class="tbl"><thead><tr><th></th><th>수수료형 플랫폼</th><th>오늘의파티룸</th></tr></thead><tbody>
  <tr><td>비용</td><td>예약당 수수료(통상 6~10% + PG)</td><td>${esc(fee)}</td></tr>
  <tr><td>할인하면</td><td>할인액 + 수수료가 함께 빠짐</td><td>할인 효과가 전부 호스트에게</td></tr>
  <tr><td>예약·결제</td><td>플랫폼 안에서</td><td>내 채널 그대로(네이버 예약·전화·카카오)</td></tr>
  <tr><td>역할</td><td>상시 예약 창구</td><td>비는 시간 전용 홍보 채널</td></tr>
  </tbody></table>
</div></section>
<section class="sec"><div class="wrap">
  <h2>호스트센터에서 할 수 있는 일</h2>
  <ul class="checks"><li>공간 등록·사진·요금표·예약 채널 설정</li><li>주간 공실 캘린더(일괄 설정)</li><li>오토딜 규칙: 전날·당일 할인율, 단계 할인, 바닥가, 제외 요일, 월 한도</li><li>타임딜·핫딜·반짝딜·이벤트 1분 생성, 미리보기</li><li>딜 코드 확인·사용 처리</li><li>조회·클릭·딜 받기 통계, 딜 유형별 성과</li></ul>
</div></section>
<section class="sec"><div class="wrap">${faqHtml(faqs)}</div></section>
<section class="sec"><div class="wrap cta-box"><h2>지금 등록하면 ${trial ? esc(trial) : '바로 시작'}</h2><p>검수는 영업일 기준 24시간 안에 끝납니다. 사진 5장과 요금표만 준비하세요.</p><a class="btn btn-p btn-lg" href="/host/app#signup">10분 만에 등록하기</a>${settings.contact_kakao ? ` <a class="btn btn-o btn-lg" href="${esc(settings.contact_kakao)}" target="_blank" rel="noopener">카카오톡 상담</a>` : ''}</div></section>`;
  return html(layout({ settings, regions, region: p.region, site, title: `파티룸 홍보, 월 3만원에 수수료 0원 — ${settings.site_name} 호스트`, description: '비는 시간을 당일·전날 할인으로 채우세요. 등록 10분, 모든 기능 무료, 예약은 내 채널 그대로. 파티룸 공실 홍보 플랫폼 오늘의파티룸 호스트 모집.', canonical: `${site}/host`, jsonld: [bc.ld, faqJsonLd(faqs)], body }));
}
