/* 오늘의파티룸 호스트센터 */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const CFG = JSON.parse(document.getElementById('cfg').textContent || '{}');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = n => Number(n || 0).toLocaleString('ko-KR') + '원';
  const KST = 9 * 3600 * 1000; const nowKST = () => new Date(Date.now() + KST);
  const fmtD = d => d.toISOString().slice(0, 10); const today = () => fmtD(nowKST());
  const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return fmtD(d); };
  const DOW = ['일', '월', '화', '수', '목', '금', '토']; const dow = s => new Date(s + 'T00:00:00Z').getUTCDay();
  const TYPE = { TODAY: '당일', TOMORROW: '전날', TIME: '타임딜', HOT: '핫딜', FLASH: '반짝', EVENT: '이벤트' };
  const STATUS = { draft: ['초안', ''], pending: ['검수 대기', 'info'], revision: ['보완 요청', 'warn'], approved: ['공개 중', 'ok'], rejected: ['반려', 'bad'], hidden: ['비공개', ''] };
  const SUB = { none: ['미결제', 'warn'], trial: ['체험 중', 'info'], active: ['구독 중', 'ok'], past_due: ['결제 지연', 'bad'], cancelled: ['해지됨', ''] };
  const S = { host: null, spaces: [], space: null, tab: 'info', regions: null, themes: null, msg: '' };
  const api = async (url, opt = {}) => {
    const res = await fetch(url, { credentials: 'same-origin', headers: opt.body && !(opt.body instanceof FormData) ? { 'content-type': 'application/json' } : {}, method: opt.method || 'GET', body: opt.body ? (opt.body instanceof FormData ? opt.body : JSON.stringify(opt.body)) : undefined });
    let d = {}; try { d = await res.json(); } catch { }
    if (!res.ok || d.ok === false) { const e = new Error(d.error || '요청에 실패했어요.'); e.data = d; throw e; }
    return d;
  };
  const toast = m => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };
  const pill = (map, k) => { const [t, c] = map[k] || [k, '']; return `<span class="pill ${c}">${t}</span>`; };

  /* ---------- 라우팅 ---------- */
  function route() {
    const hash = location.hash.replace(/^#/, '') || 'home';
    const [name, id, tab] = hash.split('/');
    if (!S.host && !['login', 'signup'].includes(name)) { location.hash = 'login'; return; }
    if (name === 'login') return renderAuth('login');
    if (name === 'signup') return renderAuth('signup');
    if (name === 'new') return renderNew();
    if (name === 'account') return renderAccount();
    if (name === 'space' && id) return renderSpace(Number(id), tab || 'info');
    return renderHome();
  }
  window.addEventListener('hashchange', route);

  function shell(inner, title = '') {
    app.innerHTML = `<header class="c-hdr"><div class="c-hdr-in"><a class="logo" href="#home"><span class="logo-t">오늘의파티룸</span><span class="logo-dot"></span></a><span class="pill pt">호스트센터</span><div class="who">${S.host ? `<span>${h(S.host.name)}</span><a href="#account">계정</a><button type="button" data-act="logout">로그아웃</button>` : ''}<a href="/" target="_blank">사이트 보기</a></div></div></header><div class="c-wrap">${inner}</div>`;
    document.title = (title ? title + ' — ' : '') + '호스트센터';
  }

  /* ---------- 인증 ---------- */
  function renderAuth(mode) {
    const login = mode === 'login';
    shell(`<div class="auth-box"><h1>${login ? '호스트 로그인' : '호스트 가입'}</h1><p class="muted">${login ? '비는 시간을 채우러 오셨군요.' : `등록은 10분. ${h(CFG.feeText || '월 30,000원 · 수수료 0원')}`}</p>
    <form class="form" data-form="${mode}">
      ${login ? '' : `<label>상호(호스트명)<input name="name" required maxlength="60" placeholder="예: 홍대 루프탑 파티룸"></label>`}
      <label>이메일<input name="email" type="email" required autocomplete="email"></label>
      <label>비밀번호<input name="password" type="password" required minlength="8" autocomplete="${login ? 'current-password' : 'new-password'}" placeholder="8자 이상"></label>
      ${login ? '' : `<label>휴대폰 번호<input name="phone" type="tel" inputmode="numeric" required placeholder="01012345678"></label>
      <div class="row"><label>사업자등록번호 (선택)<input name="biz_no" inputmode="numeric" placeholder="0000000000"></label><label>대표자 (선택)<input name="representative"></label></div>
      <label class="inline"><input type="checkbox" name="agree" required> <span><a href="/terms" target="_blank">이용약관</a>과 <a href="/privacy" target="_blank">개인정보처리방침</a>에 동의합니다</span></label>`}
      <p class="msg"></p><button class="btn btn-p btn-lg" type="submit">${login ? '로그인' : '가입하고 시작하기'}</button></form>
    <p class="switch">${login ? '아직 계정이 없나요? <a href="#signup">가입하기</a>' : '이미 계정이 있나요? <a href="#login">로그인</a>'}</p></div>`, login ? '로그인' : '가입');
  }

  /* ---------- 홈 ---------- */
  async function loadMe() { const r = await api('/api/host/me'); S.host = r.host; S.spaces = r.spaces; S.settings = r.settings; return r; }
  async function renderHome() {
    await loadMe();
    const sp = S.spaces;
    const live = sp.filter(s => s.status === 'approved').length;
    const sumV = sp.reduce((a, s) => a + (s.vacant_n || 0), 0), sumD = sp.reduce((a, s) => a + (s.deal_n || 0), 0), sumC = sp.reduce((a, s) => a + (s.claim_n || 0), 0);
    shell(`<div class="c-title"><h1>내 공간</h1><span class="sub">${sp.length}개</span><div class="right"><a class="btn btn-p" href="#new">+ 공간 등록</a></div></div>
    <div class="kpis"><div class="kpi"><b>${live}</b><span>공개 중인 공간</span></div><div class="kpi pt"><b>${sumV}</b><span>표시된 공실(오늘 이후)</span></div><div class="kpi"><b>${sumD}</b><span>진행·예정 딜</span></div><div class="kpi"><b>${sumC}</b><span>대기 중 딜 코드</span></div></div>
    ${sp.length ? `<div class="sp-list">${sp.map(s => `<div class="sp-item" data-go="#space/${s.id}"><img src="${h(s.photo || '/assets/placeholder.svg')}" alt=""><div class="t"><b>${h(s.name)}</b><span>${h(s.region_name || '지역 미설정')} · 공실 ${s.vacant_n} · 딜 ${s.deal_n} · 코드 ${s.claim_n} · 자동할인 ${s.auto_enabled ? '켜짐' : '꺼짐'}</span>${s.review_note && ['revision', 'rejected'].includes(s.status) ? `<span style="color:var(--hot)">검수 메모: ${h(s.review_note)}</span>` : ''}</div><div class="st">${pill(STATUS, s.status)}${pill(SUB, s.subscription_status)}${s.subscription_until ? `<span>~${h(s.subscription_until)}</span>` : ''}</div></div>`).join('')}</div>`
      : `<div class="panel"><h2>첫 공간을 등록해 보세요</h2><p>사진 5장과 요금표만 있으면 10분이면 됩니다. 검수 후 공개되고, ${CFG.trialDays ? `${CFG.trialDays}일 무료 체험이 시작됩니다.` : '구독 결제 후 딜을 만들 수 있습니다.'}</p><a class="btn btn-p btn-lg" href="#new">공간 등록 시작</a></div>`}
    <div class="panel"><h2>빠른 안내</h2><ul class="checks"><li><b>공실 체크</b> → 캘린더에서 비는 칸을 탭. 자동 할인을 켜 두면 전날·당일에 딜이 열립니다.</li><li><b>딜 전용 링크</b> → 네이버 예약에 "오늘의파티룸 특가" 상품을 만들고 링크를 넣으면 손님이 할인 상품으로 바로 들어옵니다.</li><li><b>딜 코드</b> → 전화·카카오로 예약하는 손님이 코드를 말하면 "코드" 탭에서 사용 처리하세요.</li></ul></div>`, '내 공간');
  }

  /* ---------- 공간 생성 ---------- */
  function renderNew() {
    shell(`<div class="c-title"><h1>새 공간 등록</h1></div><div class="panel"><form class="form" data-form="new"><label>공간 이름<input name="name" required maxlength="60" placeholder="예: 홍대 루프탑 파티룸"></label><label>한 줄 소개<input name="intro" maxlength="120" placeholder="예: 10명까지 편한 루프탑, 노래방·빔 완비"></label><p class="hint">이름은 공개 URL에 쓰입니다. 나머지 정보는 다음 화면에서 채웁니다.</p><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">만들고 계속</button><a class="btn btn-o" href="#home">취소</a></div></form></div>`, '새 공간');
  }

  /* ---------- 공간 편집 ---------- */
  const TABS = [['info', '기본정보'], ['photos', '사진'], ['slots', '요금'], ['channel', '예약채널'], ['review', '검수·공개'], ['calendar', '공실 캘린더'], ['autorule', '자동 할인'], ['deals', '딜'], ['claims', '딜 코드'], ['stats', '통계'], ['subscription', '구독']];
  async function loadSpace(id) { const r = await api(`/api/host/spaces/${id}`); S.space = r.space; S.issues = r.issues; }
  async function loadMeta() {
    if (!S.regions) S.regions = (await api('/api/regions')).tree;
    if (!S.themes) { const r = await fetch('/api/themes').then(x => x.json()).catch(() => null); S.themes = r && r.themes ? r.themes : []; }
  }
  async function renderSpace(id, tab) {
    S.tab = tab;
    try { await loadSpace(id); } catch (e) { toast(e.message); location.hash = 'home'; return; }
    await loadMeta();
    const s = S.space;
    const head = `<div class="c-title"><a href="#home" class="btn btn-o" style="height:34px;padding:0 10px">‹ 목록</a><h1>${h(s.name)}</h1>${pill(STATUS, s.status)}${pill(SUB, s.subscription_status)}<div class="right">${s.status === 'approved' ? `<a class="btn btn-o" href="/space/${h(s.slug)}" target="_blank">공개 페이지</a>` : `<a class="btn btn-o" href="/space/${h(s.slug)}" target="_blank">미리보기</a>`}</div></div>
    <nav class="c-tabs">${TABS.map(([k, l]) => `<a href="#space/${s.id}/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav>`;
    const body = await ({ info: tabInfo, photos: tabPhotos, slots: tabSlots, channel: tabChannel, review: tabReview, calendar: tabCalendar, autorule: tabAutorule, deals: tabDeals, claims: tabClaims, stats: tabStats, subscription: tabSubscription }[tab] || tabInfo)(s);
    shell(head + body, s.name);
    if (tab === 'calendar') bindCalendar(s);
    if (tab === 'deals') bindDeals(s);
  }

  function regionSelects(cur) {
    const tree = S.regions; let si = null, gu = null;
    for (const a of tree) for (const b of a.children) for (const c of b.children) if (c.id === cur) { si = a; gu = b; }
    return `<div class="row3"><label>시/도<select name="r_si">${tree.map(a => `<option value="${a.id}" ${si && si.id === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}</select></label><label>구/시<select name="r_gu">${(si || tree[0]).children.map(b => `<option value="${b.id}" ${gu && gu.id === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}</select></label><label>상권<select name="region_id">${(gu || (si || tree[0]).children[0]).children.map(c => `<option value="${c.id}" ${c.id === cur ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label></div><p class="hint">상권이 없으면 가까운 곳을 고르고 고객센터로 추가를 요청하세요.</p>`;
  }
  function tabInfo(s) {
    const am = CFG.amenities || [];
    return `<div class="panel"><form class="form" data-form="info">
      <div class="row"><label>공간 이름<input name="name" value="${h(s.name)}" required maxlength="60"></label><label>한 줄 소개<input name="intro" value="${h(s.intro)}" maxlength="120" placeholder="10명까지 편한 루프탑, 노래방·빔 완비"></label></div>
      ${regionSelects(s.region_id)}
      <label>영문 주소(slug) <span class="mini">공개 URL /space/… 에 쓰입니다. 영문 소문자·숫자·하이픈. 공개 후에는 바꿀 수 없어요</span><input name="slug" value="${h(s.slug || '')}" ${s.status === 'approved' ? 'readonly' : ''} placeholder="hongdae-rooftop"></label>
      <div class="row"><label>주소<input name="address" value="${h(s.address)}" placeholder="도로명 주소"></label><label>상세 주소 (예약 후 안내용, 비공개)<input name="address_detail" value="${h(s.address_detail)}"></label></div>
      <div class="row3"><label>기준 인원<input name="capacity_std" type="number" min="1" value="${s.capacity_std}"></label><label>최대 인원<input name="capacity_max" type="number" min="1" value="${s.capacity_max}"></label><label>면적(㎡)<input name="area_m2" type="number" step="0.1" value="${s.area_m2 ?? ''}"></label></div>
      <div class="row3"><label>층·엘리베이터<input name="floor_info" value="${h(s.floor_info)}" placeholder="3층, 엘리베이터 있음"></label><label>주차<input name="parking" value="${h(s.parking)}" placeholder="건물 2대 무료"></label><label>보증금·청소비 안내<input name="deposit_text" value="${h(s.deposit_text)}" placeholder="청소보증금 3만원, 퇴실 후 환급"></label></div>
      <label>공간 소개 (100자 이상, 다른 플랫폼 글 복사 금지)<textarea name="description" rows="7" placeholder="어떤 모임에 맞는지 → 공간의 특징 3가지 → 이용 규칙 요약 → 찾아오는 길">${h(s.description)}</textarea></label>
      <label>찾아오는 길<textarea name="transport" rows="2">${h(s.transport)}</textarea></label>
      <div class="row"><label>이용 규칙<textarea name="rules" rows="4">${h(s.rules)}</textarea></label><label>환불 규정<textarea name="refund_policy" rows="4">${h(s.refund_policy)}</textarea></label></div>
      <label>편의시설<div class="toggle-chips">${am.map(a => `<label><input type="checkbox" name="amenities" value="${h(a)}" ${s.amenities.includes(a) ? 'checked' : ''}>${h(a)}</label>`).join('')}</div></label>
      <label>용도 테마 (최대 6개)<div class="toggle-chips">${(S.themes || []).map(t => `<label><input type="checkbox" name="theme_ids" value="${t.id}" ${s.theme_ids.includes(t.id) ? 'checked' : ''}>${h(t.icon || '')} ${h(t.name)}</label>`).join('') || '<span class="muted">테마 없음</span>'}</div></label>
      <p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">저장</button><a class="btn btn-o" href="#space/${s.id}/photos">다음: 사진 ›</a></div></form></div>`;
  }
  function tabPhotos(s) {
    return `<div class="panel"><h2>사진 <span class="mini">${s.photos.length}장 · 최소 3장, 권장 10장 · 가로 사진 · 첫 장이 대표</span></h2>
      <div class="photo-grid" data-photos>${s.photos.map((p, i) => `<div class="photo">${i === 0 ? '<span class="first">대표</span>' : ''}<img src="${h(p)}" alt=""><div class="ops"><button type="button" data-ph="up" data-i="${i}">◀</button><button type="button" data-ph="down" data-i="${i}">▶</button><button type="button" data-ph="del" data-i="${i}">삭제</button></div></div>`).join('')}</div>
      <h3>사진 올리기</h3><form class="form" data-form="upload"><div class="row"><label>파일 선택 (jpg·png·webp, 8MB 이하, 여러 장 가능)<input type="file" name="files" accept="image/*" multiple style="height:auto;padding:8px"></label><label>또는 이미지 URL 붙여넣기<input name="url" placeholder="https://..."></label></div><p class="hint">파일 업로드는 Cloudflare R2 저장소(IMAGES 바인딩)가 연결된 경우 동작합니다. 연결 전에는 URL 방식을 쓰세요.</p><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">추가</button><a class="btn btn-o" href="#space/${s.id}/slots">다음: 요금 ›</a></div></form></div>`;
  }
  function slotRow(sl = {}, i = 0) {
    return `<tr data-slot-row><td><input type="hidden" name="id" value="${sl.id || ''}"><input name="name" value="${h(sl.name || '')}" placeholder="낮타임" class="w-m"></td><td><select name="kind"><option value="package" ${sl.kind !== 'hourly' ? 'selected' : ''}>패키지</option><option value="hourly" ${sl.kind === 'hourly' ? 'selected' : ''}>시간제</option></select></td><td><input name="start_time" value="${h(sl.start_time || '12:00')}" class="w-s" placeholder="12:00"></td><td><input name="end_time" value="${h(sl.end_time || '17:00')}" class="w-s" placeholder="17:00"></td><td><input name="price_weekday" type="number" step="1000" value="${sl.price_weekday || ''}" class="w-m"></td><td><input name="price_weekend" type="number" step="1000" value="${sl.price_weekend || ''}" class="w-m"></td><td><input name="base_people" type="number" value="${sl.base_people || 4}" class="w-s"></td><td><input name="extra_fee" type="number" step="1000" value="${sl.extra_fee || 0}" class="w-m"></td><td><button type="button" class="btn btn-o" style="height:32px;padding:0 8px" data-slot="del">삭제</button></td></tr>`;
  }
  function tabSlots(s) {
    return `<div class="panel"><h2>이용 시간 · 요금 <span class="mini">정가 기준. 할인율은 이 정가 대비로 계산됩니다</span></h2>
      <form class="form" data-form="slots"><div style="overflow-x:auto"><table class="slot-tbl"><thead><tr><th>이름</th><th>유형</th><th>시작</th><th>종료</th><th>평일(원)</th><th>주말·공휴일(원)</th><th>기준인원</th><th>인원추가(원/인)</th><th></th></tr></thead><tbody data-slot-body>${(s.slots.length ? s.slots : [{ name: '낮타임', start_time: '12:00', end_time: '17:00', base_people: 4 }, { name: '밤타임', start_time: '19:00', end_time: '10:00', base_people: 4 }]).map(slotRow).join('')}</tbody></table></div>
      <p class="hint">종료가 시작보다 이르면 다음 날 아침으로 계산됩니다(밤타임 19:00~10:00). 시간제는 시작·종료를 운영 시간, 요금을 시간당 요금으로 입력하세요.</p>
      <p class="msg"></p><div class="actions"><button type="button" class="btn btn-o" data-slot="add">+ 슬롯 추가</button><button class="btn btn-p" type="submit">저장</button><a class="btn btn-o" href="#space/${s.id}/channel">다음: 예약채널 ›</a></div></form></div>`;
  }
  function tabChannel(s) {
    return `<div class="panel"><h2>예약 채널 <span class="mini">손님이 "예약하기"를 누르면 여기로 연결됩니다</span></h2><form class="form" data-form="channel">
      <label>기본 채널<select name="booking_type"><option value="link" ${s.booking_type === 'link' ? 'selected' : ''}>외부 예약 링크(네이버 예약 등)</option><option value="tel" ${s.booking_type === 'tel' ? 'selected' : ''}>전화</option><option value="kakao" ${s.booking_type === 'kakao' ? 'selected' : ''}>카카오톡 채널</option><option value="web" ${s.booking_type === 'web' ? 'selected' : ''}>자체 예약 페이지</option></select></label>
      <label>예약 링크 (네이버 예약·스페이스클라우드·자체 페이지)<input name="booking_url" value="${h(s.booking_url)}" placeholder="https://booking.naver.com/..."></label>
      <div class="row"><label>전화번호<input name="booking_tel" value="${h(s.booking_tel)}" placeholder="010-0000-0000"></label><label>카카오톡 채널 링크<input name="booking_kakao" value="${h(s.booking_kakao)}" placeholder="https://pf.kakao.com/_xxxx/chat"></label></div>
      <label>딜 전용 예약 링크 (권장)<input name="deal_link" value="${h(s.deal_link)}" placeholder="https://booking.naver.com/... (오늘의파티룸 특가 상품)"></label>
      <p class="hint">네이버 예약에 "오늘의파티룸 특가" 상품을 만들고 그 링크를 넣으면, 손님이 딜을 누를 때 코드 없이 할인 상품으로 바로 이동합니다. 링크가 없으면 딜 코드가 발급되고 손님이 전화·카카오로 코드를 말합니다.</p>
      <p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">저장</button><a class="btn btn-o" href="#space/${s.id}/review">다음: 검수 제출 ›</a></div></form></div>`;
  }
  function tabReview(s) {
    const issues = S.issues || [];
    const can = ['draft', 'revision', 'rejected'].includes(s.status);
    return `<div class="panel"><h2>검수 · 공개 상태</h2><p>현재 상태: ${pill(STATUS, s.status)} ${s.review_note ? `<span class="mini">검수 메모: ${h(s.review_note)}</span>` : ''}</p>
      ${issues.length ? `<div class="issues"><b>제출 전에 채워 주세요</b><ul>${issues.map(i => `<li>${h(i)}</li>`).join('')}</ul></div>` : '<div class="issues ok">필수 항목이 모두 채워졌어요.</div>'}
      <p class="hint">검수는 영업일 기준 24시간 안에 끝납니다. 승인되면 ${CFG.trialDays ? `${CFG.trialDays}일 무료 체험이 시작되고` : '구독 결제 후'} 딜 기능이 열립니다.</p>
      <div class="actions"><button type="button" class="btn btn-p" data-act="submit-review" ${(!can || issues.length) ? 'disabled' : ''}>검수 제출</button>${s.status === 'approved' ? '<button type="button" class="btn btn-o" data-act="hide">일시 비공개</button>' : ''}${s.status === 'hidden' ? '<button type="button" class="btn btn-o" data-act="unhide">다시 공개</button>' : ''}</div></div>`;
  }

  /* ---- 캘린더 ---- */
  let calFrom = today(), calVac = new Map();
  async function tabCalendar(s) {
    const to = addDays(calFrom, 13);
    const r = await api(`/api/host/spaces/${s.id}/vacancies?from=${calFrom}&to=${to}`);
    calVac = new Map(r.vacancies.map(v => [`${v.slot_id}|${v.date}`, v.status]));
    const days = Array.from({ length: 14 }, (_, i) => addDays(calFrom, i));
    const t = today();
    return `<div class="panel"><h2>공실 캘린더 <span class="mini">칸을 탭하면 미정 → 비어 있음 → 예약됨 → 휴무 순으로 바뀝니다</span></h2>
      ${!s.slots.length ? '<div class="issues">먼저 "요금" 탭에서 슬롯을 등록하세요.</div>' : ''}
      <div class="actions" style="margin-bottom:8px"><button type="button" class="btn btn-o" data-cal="prev">‹ 2주 전</button><button type="button" class="btn btn-o" data-cal="today">오늘</button><button type="button" class="btn btn-o" data-cal="next">2주 후 ›</button></div>
      <div class="cal"><table><thead><tr><th></th>${days.map(d => `<th class="${d === t ? 'today' : ''} ${[0, 6].includes(dow(d)) ? 'we' : ''}">${d.slice(5).replace('-', '/')}<br>${DOW[dow(d)]}</th>`).join('')}</tr></thead><tbody>
      ${s.slots.map(sl => `<tr><td class="lbl">${h(sl.name)}<br><small class="mini">${h(sl.start_time)}~${h(sl.end_time)}</small></td>${days.map(d => { const st = calVac.get(`${sl.id}|${d}`) || ''; const past = d < t; return `<td><div class="cell ${st} ${past ? 'past' : ''}" data-cell data-slot="${sl.id}" data-date="${d}">${{ vacant: '비어있음', booked: '예약됨', closed: '휴무' }[st] || '미정'}</div></td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div>
      <div class="legend"><span><i style="background:var(--tint);border-color:var(--point)"></i>비어 있음 → 자동 할인 대상</span><span><i style="background:#E5E7EB"></i>예약됨</span><span><i></i>미정(노출 안 함)</span><span><i style="background:repeating-linear-gradient(45deg,#fff,#fff 3px,#eee 3px,#eee 6px)"></i>휴무</span></div>
      <h3>일괄 설정</h3><form class="form" data-form="bulk"><div class="row3"><label>슬롯<select name="slot_id"><option value="all">전체</option>${s.slots.map(sl => `<option value="${sl.id}">${h(sl.name)}</option>`).join('')}</select></label><label>요일<div class="toggle-chips">${DOW.map((d, i) => `<label><input type="checkbox" name="days" value="${i}" ${i >= 1 && i <= 5 ? 'checked' : ''}>${d}</label>`).join('')}</div></label><label>상태<select name="status"><option value="vacant">비어 있음</option><option value="booked">예약됨</option><option value="closed">휴무</option><option value="clear">미정으로</option></select></label></div><div class="row"><label>시작일<input type="date" name="from" value="${t}"></label><label>종료일<input type="date" name="to" value="${addDays(t, 13)}"></label></div><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">적용</button></div></form></div>`;
  }
  function bindCalendar(s) {
    $$('[data-cell]').forEach(c => c.addEventListener('click', async () => {
      if (c.classList.contains('past')) return;
      const order = ['', 'vacant', 'booked', 'closed'];
      const cur = order.find(o => o && c.classList.contains(o)) || '';
      const next = order[(order.indexOf(cur) + 1) % order.length];
      try {
        await api(`/api/host/spaces/${s.id}/vacancies`, { method: 'PUT', body: { items: [{ slot_id: Number(c.dataset.slot), date: c.dataset.date, status: next || 'clear' }] } });
        c.classList.remove('vacant', 'booked', 'closed'); if (next) c.classList.add(next);
        c.textContent = { vacant: '비어있음', booked: '예약됨', closed: '휴무' }[next] || '미정';
        if (next === 'booked') toast('예약됨으로 바꿨어요. 이 칸의 딜은 종료됩니다.');
      } catch (e) { toast(e.message); }
    }));
  }

  /* ---- 오토딜 ---- */
  function tabAutorule(s) {
    const r = s.rule || { enabled: 0, tomorrow_rate: 15, today_rate: 25, steps: [], floors: {}, exclude_days: [5, 6], exclude_slots: [], monthly_cap: 20 };
    const steps = r.steps || [];
    return `<div class="panel"><h2>자동 할인(오토딜) <span class="mini">공실이 전날·당일이 되면 자동으로 딜이 열립니다</span></h2>
      <form class="form" data-form="autorule">
      <label class="inline" style="font-size:16px;font-weight:800"><input type="checkbox" name="enabled" ${r.enabled ? 'checked' : ''}> 자동 할인 켜기</label>
      <div class="row"><label>전날 할인율 (%)<input type="number" name="tomorrow_rate" min="0" max="90" value="${r.tomorrow_rate}"></label><label>당일 할인율 (%)<input type="number" name="today_rate" min="0" max="90" value="${r.today_rate}"></label></div>
      <h3>단계 할인 (당일, 선택)</h3><p class="hint">시각이 지나면 할인율을 더 올립니다. 예: 14:00 이후 35%</p>
      <div class="row3">${[0, 1, 2].map(i => `<label>${i + 1}단계<div class="row"><input name="step_from_${i}" placeholder="14:00" value="${h(steps[i]?.from || '')}"><input name="step_rate_${i}" type="number" placeholder="%" value="${steps[i]?.rate || ''}"></div></label>`).join('')}</div>
      <h3>바닥가 (슬롯별, 선택)</h3><p class="hint">어떤 할인도 이 금액 아래로 내려가지 않습니다.</p>
      <div class="row3">${s.slots.map(sl => `<label>${h(sl.name)}<input type="number" step="1000" name="floor_${sl.id}" value="${r.floors?.[sl.id] || ''}" placeholder="예: 90000"></label>`).join('') || '<span class="muted">슬롯을 먼저 등록하세요</span>'}</div>
      <h3>제외 조건</h3>
      <label>제외 요일 (이 요일엔 자동 할인 안 함)<div class="toggle-chips">${DOW.map((d, i) => `<label><input type="checkbox" name="exclude_days" value="${i}" ${(r.exclude_days || []).includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</div></label>
      <label>제외 슬롯<div class="toggle-chips">${s.slots.map(sl => `<label><input type="checkbox" name="exclude_slots" value="${sl.id}" ${(r.exclude_slots || []).includes(sl.id) ? 'checked' : ''}>${h(sl.name)}</label>`).join('')}</div></label>
      <div class="row3"><label>제외 기간 시작<input type="date" name="exclude_from" value="${h(r.exclude_from || '')}"></label><label>제외 기간 종료<input type="date" name="exclude_to" value="${h(r.exclude_to || '')}"></label><label>월 최대 생성 횟수<input type="number" name="monthly_cap" min="0" max="200" value="${r.monthly_cap ?? 20}"></label></div>
      <p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">저장</button></div></form>
      <div data-examples></div></div>`;
  }

  /* ---- 딜 ---- */
  let dealsCache = null;
  async function tabDeals(s) {
    const r = await api(`/api/host/spaces/${s.id}/deals`); dealsCache = r;
    const slotName = id => (s.slots.find(x => x.id === Number(id)) || {}).name || `#${id}`;
    const canMake = s.status === 'approved' && ['trial', 'active', 'cancelled'].includes(s.subscription_status);
    const row = d => `<div class="deal-row ${d.status === 'ENDED' ? 'ended' : ''}"><div class="b"><span class="badge b-${d.type.toLowerCase()}">${TYPE[d.type]}</span> <span class="pill ${d.status === 'ACTIVE' ? 'ok' : d.status === 'SCHEDULED' ? 'info' : ''}">${{ ACTIVE: '진행 중', SCHEDULED: '예정', ENDED: '종료' }[d.status]}${d.end_reason ? ` · ${{ EXPIRED: '시간 만료', SOLD_OUT: '매진', HOST_CANCELLED: '직접 종료', ADMIN_STOPPED: '운영 중지', SLOT_BOOKED: '예약됨', REPLACED: '대체' }[d.end_reason] || d.end_reason}` : ''}</span>${d.origin === 'AUTO' ? ' <span class="pill pt">자동</span>' : ''}
        <b>${h(d.title || TYPE[d.type])}</b>${d.type === 'EVENT' ? h(d.benefit_text) : `${d.discount_mode === 'RATE' ? d.discount_value + '% 할인' : d.discount_mode === 'AMOUNT' ? won(d.discount_value) + ' 할인' : won(d.discount_value) + ' 특가'}${d.floor_price ? ` · 바닥가 ${won(d.floor_price)}` : ''}`}
        <br><span class="mini">대상: ${(d.targets || []).slice(0, 4).map(t => `${t.date.slice(5).replace('-', '/')} ${h(slotName(t.slot_id))}`).join(', ')}${d.targets.length > 4 ? ` 외 ${d.targets.length - 4}` : ''} · ${h(d.starts_at.replace('T', ' '))} ~ ${h(d.ends_at.replace('T', ' '))}${d.quantity != null ? ` · 수량 ${d.claimed}/${d.quantity}` : ''} · 코드 ${d.claim_n || 0}건(사용 ${d.used_n || 0})</span></div>
        ${d.status !== 'ENDED' ? `<div class="ops">${d.type !== 'EVENT' ? `<button type="button" class="btn btn-o" data-deal="raise" data-id="${d.id}" data-mode="${d.discount_mode}" data-val="${d.discount_value}">할인 올리기</button>` : ''}<button type="button" class="btn btn-o" data-deal="qty" data-id="${d.id}" data-q="${d.quantity ?? ''}">수량</button><button type="button" class="btn btn-o" data-deal="end" data-id="${d.id}">종료</button></div>` : ''}</div>`;
    const autoRow = a => `<div class="deal-row"><div class="b"><span class="badge b-${a.type.toLowerCase()}">${TYPE[a.type]}</span> <span class="pill pt">자동(공실 기반)</span><b>${a.targets.map(t => `${t.date.slice(5).replace('-', '/')} ${h(t.slot)} ${won(t.price)} (${t.rate}%)`).join(', ')}</b><span class="mini">${h(a.ends_at.replace('T', ' '))}까지 노출 · 손님이 받으면 코드가 발급됩니다. 끄려면 캘린더에서 칸을 바꾸거나 자동 할인을 조정하세요.</span></div></div>`;
    const next14 = Array.from({ length: 14 }, (_, i) => addDays(today(), i));
    const vac = await api(`/api/host/spaces/${s.id}/vacancies?from=${today()}&to=${addDays(today(), 13)}`);
    const vmap = new Map(vac.vacancies.map(v => [`${v.slot_id}|${v.date}`, v.status]));
    return `${canMake ? '' : '<div class="issues">딜은 공간이 공개 상태이고 구독(체험 포함)이 활성화된 뒤 만들 수 있습니다.</div>'}
      <div class="split"><div class="panel"><h2>딜 만들기</h2><form class="form" data-form="deal">
        <label>유형<select name="type"><option value="TIME">타임딜 — 정한 시간 창에만</option><option value="HOT">핫딜 — 기간·수량 특가</option><option value="FLASH">반짝딜 — 1~3시간, 1~2건</option><option value="EVENT">이벤트 — 혜택 제공</option><option value="TODAY">당일 할인(수동)</option><option value="TOMORROW">전날 할인(수동)</option></select></label>
        <label>대상 날짜·슬롯 <span class="mini">(비어 있음 표시된 칸은 주황)</span><div class="tgt-pick">${next14.map(d => s.slots.map(sl => { const st = vmap.get(`${sl.id}|${d}`) || ''; return `<label class="${st}"><input type="checkbox" name="target" value="${d}|${sl.id}" ${st === 'booked' || st === 'closed' ? 'disabled' : ''}>${d.slice(5).replace('-', '/')}(${DOW[dow(d)]}) ${h(sl.name)}</label>`; }).join('')).join('')}</div></label>
        <div class="row3"><label>할인 방식<select name="discount_mode"><option value="RATE">정률(%)</option><option value="AMOUNT">정액(원 할인)</option><option value="FIXED">특가(원)</option></select></label><label>값<input type="number" name="discount_value" placeholder="30"></label><label>바닥가(선택)<input type="number" step="1000" name="floor_price"></label></div>
        <div class="row3" data-time-fields><label>시작(비우면 지금)<input type="datetime-local" name="starts_at"></label><label>종료<input type="datetime-local" name="ends_at"></label><label>수량(선택)<input type="number" name="quantity" min="1"></label></div>
        <div class="row" data-flash-fields style="display:none"><label>지속 시간(분)<select name="duration_min"><option value="60">60분</option><option value="120" selected>120분</option><option value="180">180분</option></select></label><label>수량<select name="flash_qty"><option value="1">1건</option><option value="2">2건</option></select></label></div>
        <label data-benefit style="display:none">혜택 내용 (이벤트)<input name="benefit_text" placeholder="예: 케이크 증정 / 1시간 연장 무료"></label>
        <div class="row"><label>제목(선택)<input name="title" maxlength="40" placeholder="예: 평일 낮 핫딜"></label><label>딜 전용 링크(선택)<input name="deal_link" placeholder="https://... (없으면 공간 설정의 링크)"></label></div>
        <div class="preview" data-preview>대상과 할인을 입력하면 손님에게 보이는 가격이 여기 표시됩니다.</div>
        <p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit" ${canMake ? '' : 'disabled'}>게시</button></div></form></div>
      <div><div class="panel"><h2>진행 · 예정 <span class="mini">${r.deals.filter(d => d.status !== 'ENDED').length + r.auto.length}건</span></h2>${r.auto.map(autoRow).join('')}${r.deals.filter(d => d.status !== 'ENDED').map(row).join('') || (r.auto.length ? '' : '<p class="muted">진행 중인 딜이 없어요.</p>')}</div>
      <div class="panel"><h2>최근 종료 <span class="mini">30일</span></h2>${r.deals.filter(d => d.status === 'ENDED').slice(0, 20).map(row).join('') || '<p class="muted">없음</p>'}</div></div></div>`;
  }
  function bindDeals(s) {
    const f = $('[data-form=deal]'); if (!f) return;
    const upd = () => {
      const type = f.type.value;
      $('[data-flash-fields]', f).style.display = type === 'FLASH' ? '' : 'none';
      $('[data-time-fields]', f).style.display = type === 'FLASH' ? 'none' : '';
      $('[data-benefit]', f).style.display = type === 'EVENT' ? '' : 'none';
      f.discount_value.disabled = type === 'EVENT'; f.discount_mode.disabled = type === 'EVENT';
      // 미리보기
      const targets = $$('input[name=target]:checked', f).map(x => x.value);
      const mode = f.discount_mode.value, val = Number(f.discount_value.value || 0), floor = Number(f.floor_price.value || 0);
      const hol = []; // 공휴일은 서버 설정 기준; 미리보기는 주말만 구분
      const lines = targets.slice(0, 6).map(v => { const [d, sid] = v.split('|'); const sl = s.slots.find(x => x.id === Number(sid)); if (!sl) return ''; const we = [0, 6].includes(dow(d)); const base = we ? sl.price_weekend : sl.price_weekday; let p = base; if (type !== 'EVENT' && val) { p = mode === 'RATE' ? base * (100 - val) / 100 : mode === 'AMOUNT' ? base - val : val; p = Math.round(p / 1000) * 1000; if (floor && p < floor) p = floor; p = Math.min(p, base); } const rate = base ? Math.round((base - p) / base * 100) : 0; return `<div>${d.slice(5).replace('-', '/')} ${h(sl.name)} · <s>${won(base)}</s> <b style="color:var(--point)">${won(p)}</b> ${rate ? `<span class="p-rate">${rate}%</span>` : ''}</div>`; }).join('');
      $('[data-preview]', f).innerHTML = targets.length ? `<b>손님에게 보이는 가격</b>${lines}${targets.length > 6 ? `<div class="mini">외 ${targets.length - 6}개</div>` : ''}` : '대상과 할인을 입력하면 손님에게 보이는 가격이 여기 표시됩니다.';
    };
    f.addEventListener('change', upd); f.addEventListener('input', upd); upd();
  }

  /* ---- 코드 ---- */
  async function tabClaims(s) {
    const r = await api(`/api/host/claims?space_id=${s.id}`);
    return `<div class="panel"><h2>딜 코드 <span class="mini">손님이 전화·카카오로 코드를 말하면 "사용 처리"를 누르세요</span></h2>
      ${r.claims.length ? r.claims.map(c => `<div class="claim-row"><span class="code">${h(c.code)}</span><div class="b"><b>${h(c.phone_masked)}</b> · ${h(c.date || '')} ${h(c.slot_name || '')} · ${won(c.price)} <s class="mini">${won(c.base_price)}</s><br><span class="mini">발급 ${h((c.issued_at || '').slice(0, 16))} · ${{ issued: '대기', used: '사용 완료', expired: '만료' }[c.status]}${c.used_at ? ` (${h(c.used_at.slice(0, 16))})` : ''}</span></div>${c.status === 'issued' ? `<button type="button" class="btn btn-p" data-claim="use" data-id="${c.id}" data-slot="${c.slot_id}" data-date="${c.date}">사용 처리</button>` : c.status === 'used' ? `<button type="button" class="btn btn-o" data-claim="unuse" data-id="${c.id}">취소</button>` : ''}</div>`).join('') : '<p class="muted">아직 발급된 코드가 없어요.</p>'}</div>`;
  }

  /* ---- 통계 ---- */
  async function tabStats(s) {
    const r = await api(`/api/host/spaces/${s.id}/stats`);
    const t = r.totals || {};
    const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
    const series = type => days.map(d => (r.daily.find(x => x.day === d && x.type === type) || {}).n || 0);
    const bars = arr => { const m = Math.max(1, ...arr); return `<div class="bars">${arr.map(v => `<i style="height:${Math.round(v / m * 100)}%" title="${v}"></i>`).join('')}</div>`; };
    return `<div class="kpis"><div class="kpi"><b>${r.views || 0}</b><span>누적 상세 조회</span></div><div class="kpi"><b>${t.view_space || 0}</b><span>30일 상세 조회</span></div><div class="kpi"><b>${t.click_deal || 0}</b><span>30일 딜 클릭</span></div><div class="kpi pt"><b>${t.click_channel || 0}</b><span>30일 예약 채널 이동</span></div></div>
      <div class="panel"><h2>최근 14일 예약 채널 이동</h2>${bars(series('click_channel'))}<p class="mini">${days[0]} ~ ${days[13]}</p></div>
      <div class="panel"><h2>딜 유형별 성과 (30일)</h2><table class="stat-tbl"><thead><tr><th>유형</th><th>출처</th><th>딜 수</th><th>코드 발급</th><th>사용</th></tr></thead><tbody>${(r.byType || []).map(b => `<tr><td>${TYPE[b.type] || b.type}</td><td>${b.origin === 'AUTO' ? '자동' : '수동'}</td><td>${b.deals}</td><td>${b.claims}</td><td>${b.used || 0}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">데이터 없음</td></tr>'}</tbody></table><p class="mini">30일 코드 ${r.claims?.n || 0}건 발급, ${r.claims?.used || 0}건 사용 처리. 구독료 대비 효과를 판단하는 기준으로 쓰세요.</p></div>`;
  }

  /* ---- 구독 ---- */
  function tabSubscription(s) {
    return `<div class="panel"><h2>구독 <span class="mini">공간 1개당 ${h(CFG.feeText || '월 30,000원')}</span></h2>
      <p>상태: ${pill(SUB, s.subscription_status)} ${s.subscription_until ? `<span class="mini">${h(s.subscription_until)}까지</span>` : ''}</p>
      <div class="issues ok" style="background:var(--paper);color:#333"><b>결제 방법 (정기결제 연동 전)</b><br>아래 계좌로 입금 후 "결제 요청"을 누르면 확인 후 구독이 활성화됩니다. 카드 정기결제는 준비 중입니다.<br><b>${h(CFG.bankAccount || '(계좌 안내)')}</b> · 입금자명: ${h(S.host?.name || '')}</div>
      <form class="form" data-form="subrequest"><label>메모 (입금자명·개월 수 등)<input name="memo" placeholder="예: 홍길동 3개월 입금"></label><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">결제 요청</button>${['trial', 'active', 'past_due'].includes(s.subscription_status) ? '<button type="button" class="btn btn-o" data-act="sub-cancel">해지</button>' : ''}</div></form>
      <p class="hint">해지해도 남은 기간까지는 공개가 유지되고, 그 뒤 비공개로 전환됩니다. 문의: ${h(CFG.contactEmail || '')}${CFG.contactKakao ? ` · <a href="${h(CFG.contactKakao)}" target="_blank">카카오톡</a>` : ''}</p></div>`;
  }

  /* ---------- 계정 ---------- */
  async function renderAccount() {
    await loadMe(); const hst = S.host;
    shell(`<div class="c-title"><h1>계정</h1></div><div class="panel"><form class="form" data-form="account"><div class="row"><label>상호<input name="name" value="${h(hst.name)}" required></label><label>휴대폰<input name="phone" value="${h(hst.phone)}" required></label></div><div class="row"><label>사업자등록번호<input name="biz_no" value="${h(hst.biz_no || '')}"></label><label>대표자<input name="representative" value="${h(hst.representative || '')}"></label></div><h3>비밀번호 변경 (선택)</h3><div class="row"><label>현재 비밀번호<input name="password" type="password" autocomplete="current-password"></label><label>새 비밀번호<input name="new_password" type="password" autocomplete="new-password" placeholder="8자 이상"></label></div><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">저장</button></div></form></div>`, '계정');
  }

  /* ---------- 이벤트 ---------- */
  const fd2obj = f => { const o = {}; new FormData(f).forEach((v, k) => { if (k in o) { if (!Array.isArray(o[k])) o[k] = [o[k]]; o[k].push(v); } else o[k] = v; }); return o; };
  const arr = v => v == null ? [] : Array.isArray(v) ? v : [v];
  document.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
    const kind = f.dataset.form, msg = $('.msg', f), btn = $('button[type=submit]', f); if (msg) { msg.textContent = ''; msg.classList.remove('ok'); } if (btn) btn.disabled = true;
    const o = fd2obj(f); const sid = S.space?.id;
    try {
      if (kind === 'login') { await api('/api/host/login', { method: 'POST', body: o }); await loadMe(); location.hash = 'home'; }
      else if (kind === 'signup') { await api('/api/host/signup', { method: 'POST', body: { ...o, agree: !!o.agree } }); await loadMe(); location.hash = 'new'; }
      else if (kind === 'new') { const r = await api('/api/host/spaces', { method: 'POST', body: o }); location.hash = `space/${r.id}/info`; }
      else if (kind === 'info') { await api(`/api/host/spaces/${sid}`, { method: 'PUT', body: { ...o, amenities: arr(o.amenities), theme_ids: arr(o.theme_ids).map(Number) } }); await loadSpace(sid); msg.textContent = '저장했어요.'; msg.classList.add('ok'); }
      else if (kind === 'channel') { await api(`/api/host/spaces/${sid}`, { method: 'PUT', body: o }); await loadSpace(sid); msg.textContent = '저장했어요.'; msg.classList.add('ok'); }
      else if (kind === 'slots') {
        const slots = $$('[data-slot-row]', f).map(tr => Object.fromEntries($$('input,select', tr).map(i => [i.name, i.value])));
        await api(`/api/host/spaces/${sid}/slots`, { method: 'PUT', body: { slots } }); await loadSpace(sid); renderSpace(sid, 'slots'); toast('요금을 저장했어요.');
      }
      else if (kind === 'upload') {
        const photos = [...S.space.photos]; const files = f.files.files;
        for (const file of files) { const fdd = new FormData(); fdd.append('file', file); const r = await api('/api/upload', { method: 'POST', body: fdd }); photos.push(r.url); }
        if (o.url && /^https?:\/\//.test(o.url)) photos.push(o.url.trim());
        await api(`/api/host/spaces/${sid}`, { method: 'PUT', body: { photos } }); await loadSpace(sid); renderSpace(sid, 'photos');
      }
      else if (kind === 'bulk') {
        const items = []; const days = arr(o.days).map(Number); const from = o.from, to = o.to;
        for (let d = from; d <= to; d = addDays(d, 1)) { if (!days.includes(dow(d))) continue; for (const sl of S.space.slots) { if (o.slot_id !== 'all' && Number(o.slot_id) !== sl.id) continue; items.push({ slot_id: sl.id, date: d, status: o.status }); } }
        const r = await api(`/api/host/spaces/${sid}/vacancies`, { method: 'PUT', body: { items } }); toast(`${r.updated}칸을 바꿨어요.`); renderSpace(sid, 'calendar');
      }
      else if (kind === 'autorule') {
        const steps = [0, 1, 2].map(i => ({ from: o[`step_from_${i}`], rate: o[`step_rate_${i}`] })).filter(x => x.from && x.rate);
        const floors = {}; S.space.slots.forEach(sl => { if (o[`floor_${sl.id}`]) floors[sl.id] = Number(o[`floor_${sl.id}`]); });
        const r = await api(`/api/host/spaces/${sid}/autorule`, { method: 'PUT', body: { enabled: !!o.enabled, tomorrow_rate: o.tomorrow_rate, today_rate: o.today_rate, steps, floors, exclude_days: arr(o.exclude_days), exclude_slots: arr(o.exclude_slots), exclude_from: o.exclude_from, exclude_to: o.exclude_to, monthly_cap: o.monthly_cap } });
        await loadSpace(sid); msg.textContent = '저장했어요.'; msg.classList.add('ok');
        $('[data-examples]').innerHTML = `<h3>예시 계산 (지금 기준)</h3><table class="stat-tbl"><thead><tr><th>슬롯</th><th>내일이면</th><th>오늘이면</th></tr></thead><tbody>${r.examples.map(x => `<tr><td>${h(x.slot)}</td><td>${x.tomorrow ? `<s>${won(x.tomorrow.base)}</s> → <b>${won(x.tomorrow.price)}</b> (${x.tomorrow.rate}%)` : '-'}</td><td>${x.today ? `<s>${won(x.today.base)}</s> → <b>${won(x.today.price)}</b> (${x.today.rate}%)` : '-'}</td></tr>`).join('')}</tbody></table>`;
      }
      else if (kind === 'deal') {
        const targets = arr(o.target).map(v => { const [date, slot_id] = v.split('|'); return { date, slot_id: Number(slot_id) }; });
        const body = { type: o.type, targets, discount_mode: o.discount_mode, discount_value: o.discount_value, floor_price: o.floor_price, quantity: o.type === 'FLASH' ? o.flash_qty : o.quantity, starts_at: o.starts_at, ends_at: o.ends_at, duration_min: o.duration_min, benefit_text: o.benefit_text, title: o.title, deal_link: o.deal_link };
        const r = await api(`/api/host/spaces/${sid}/deals`, { method: 'POST', body }); toast('딜을 게시했어요.' + (r.warning ? ' ' + r.warning : '')); renderSpace(sid, 'deals');
      }
      else if (kind === 'subrequest') { const r = await api(`/api/host/spaces/${sid}/subscription`, { method: 'POST', body: { action: 'request', memo: o.memo } }); msg.textContent = r.message; msg.classList.add('ok'); }
      else if (kind === 'account') { await api('/api/host/me', { method: 'PUT', body: o }); msg.textContent = '저장했어요.'; msg.classList.add('ok'); }
    } catch (err) { if (msg) { msg.textContent = err.message + (err.data?.issues ? ' ' + err.data.issues.join(' ') : ''); } else toast(err.message); }
    finally { if (btn) btn.disabled = false; }
  });
  document.addEventListener('click', async e => {
    const go = e.target.closest('[data-go]'); if (go) { location.hash = go.dataset.go.replace(/^#/, ''); return; }
    const a = e.target.closest('[data-act]'); const sid = S.space?.id;
    if (a) {
      try {
        if (a.dataset.act === 'logout') { await api('/api/host/logout', { method: 'POST' }); S.host = null; location.hash = 'login'; }
        if (a.dataset.act === 'submit-review') { await api(`/api/host/spaces/${sid}/submit`, { method: 'POST' }); toast('검수를 요청했어요. 24시간 안에 결과를 알려드릴게요.'); renderSpace(sid, 'review'); }
        if (a.dataset.act === 'hide') { if (confirm('일시 비공개로 바꿀까요?')) { await api(`/api/host/spaces/${sid}`, { method: 'PUT', body: { visible: false } }); renderSpace(sid, 'review'); } }
        if (a.dataset.act === 'unhide') { await api(`/api/host/spaces/${sid}`, { method: 'PUT', body: { visible: true } }); renderSpace(sid, 'review'); }
        if (a.dataset.act === 'sub-cancel') { if (confirm('구독을 해지할까요? 남은 기간까지는 노출이 유지됩니다.')) { const r = await api(`/api/host/spaces/${sid}/subscription`, { method: 'POST', body: { action: 'cancel' } }); toast(r.message); renderSpace(sid, 'subscription'); } }
      } catch (err) { toast(err.message); }
    }
    const ph = e.target.closest('[data-ph]'); if (ph) { const i = Number(ph.dataset.i); const p = [...S.space.photos]; if (ph.dataset.ph === 'del') p.splice(i, 1); if (ph.dataset.ph === 'up' && i > 0) [p[i - 1], p[i]] = [p[i], p[i - 1]]; if (ph.dataset.ph === 'down' && i < p.length - 1) [p[i + 1], p[i]] = [p[i], p[i + 1]]; try { await api(`/api/host/spaces/${sid}`, { method: 'PUT', body: { photos: p } }); await loadSpace(sid); renderSpace(sid, 'photos'); } catch (err) { toast(err.message); } }
    const sl = e.target.closest('[data-slot]'); if (sl) { if (sl.dataset.slot === 'add') $('[data-slot-body]').insertAdjacentHTML('beforeend', slotRow({}, 0)); if (sl.dataset.slot === 'del') sl.closest('tr').remove(); }
    const cal = e.target.closest('[data-cal]'); if (cal) { calFrom = cal.dataset.cal === 'prev' ? addDays(calFrom, -14) : cal.dataset.cal === 'next' ? addDays(calFrom, 14) : today(); renderSpace(sid, 'calendar'); }
    const dl = e.target.closest('[data-deal]'); if (dl) {
      try {
        const id = dl.dataset.id;
        if (dl.dataset.deal === 'end') { if (confirm('이 딜을 종료할까요?')) { await api(`/api/host/deals/${id}`, { method: 'PUT', body: { action: 'end' } }); renderSpace(sid, 'deals'); } }
        if (dl.dataset.deal === 'raise') { const v = prompt(dl.dataset.mode === 'RATE' ? `새 할인율(%) — 현재 ${dl.dataset.val}% (올리기만 가능)` : dl.dataset.mode === 'FIXED' ? `새 특가(원) — 현재 ${dl.dataset.val} (내리기만 가능)` : `새 할인액(원) — 현재 ${dl.dataset.val}`); if (v) { await api(`/api/host/deals/${id}`, { method: 'PUT', body: { action: 'raise', discount_value: v } }); renderSpace(sid, 'deals'); } }
        if (dl.dataset.deal === 'qty') { const v = prompt(`새 수량 (현재 ${dl.dataset.q || '무제한'}, 비우면 무제한, 늘리기만 가능)`, dl.dataset.q); if (v !== null) { await api(`/api/host/deals/${id}`, { method: 'PUT', body: { action: 'quantity', quantity: v } }); renderSpace(sid, 'deals'); } }
      } catch (err) { toast(err.message); }
    }
    const cl = e.target.closest('[data-claim]'); if (cl) {
      try {
        if (cl.dataset.claim === 'use') { await api('/api/host/claims', { method: 'PUT', body: { id: cl.dataset.id, action: 'use' } }); if (cl.dataset.slot && cl.dataset.date && confirm('사용 처리했어요. 이 슬롯을 "예약됨"으로 바꿀까요? (딜 종료)')) await api(`/api/host/spaces/${sid}/vacancies`, { method: 'PUT', body: { items: [{ slot_id: Number(cl.dataset.slot), date: cl.dataset.date, status: 'booked' }] } }); renderSpace(sid, 'claims'); }
        if (cl.dataset.claim === 'unuse') { await api('/api/host/claims', { method: 'PUT', body: { id: cl.dataset.id, action: 'unuse' } }); renderSpace(sid, 'claims'); }
      } catch (err) { toast(err.message); }
    }
  });
  document.addEventListener('change', e => {
    if (e.target.name === 'r_si' || e.target.name === 'r_gu') {
      const f = e.target.closest('form'); const si = S.regions.find(a => String(a.id) === f.r_si.value); if (!si) return;
      if (e.target.name === 'r_si') f.r_gu.innerHTML = si.children.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
      const gu = si.children.find(b => String(b.id) === f.r_gu.value) || si.children[0];
      f.region_id.innerHTML = (gu ? gu.children : []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  });

  /* ---------- 시작 ---------- */
  (async () => { try { await loadMe(); } catch { S.host = null; } if (!S.host && !location.hash) location.hash = 'login'; route(); })();
})();
