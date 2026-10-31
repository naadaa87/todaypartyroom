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
    if (name === 'space' && id) return renderSpace(Number(id), tab || '');
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
    const todo = [];
    if (sumC) todo.push(`<a class="todo hot" href="#space/${(sp.find(s => s.claim_n) || {}).id}/claims"><b>딜 코드 ${sumC}건</b><span>손님이 받은 코드가 사용 처리를 기다리고 있어요</span></a>`);
    for (const s of sp) {
      if (['draft', 'revision', 'rejected'].includes(s.status)) todo.push(`<a class="todo" href="#space/${s.id}"><b>${h(s.name)}</b><span>${s.status === 'draft' ? '등록을 마치고 검수를 요청하세요' : '검수 메모를 확인하고 다시 제출하세요'}</span></a>`);
      else if (s.status === 'approved' && !s.open_cells && !s.has_ical) todo.push(`<a class="todo" href="#space/${s.id}/pattern"><b>${h(s.name)}</b><span>매주 비는 시간을 정해 두면 할인이 매일 알아서 열려요</span></a>`);
      else if (s.status === 'approved' && !s.auto_enabled) todo.push(`<a class="todo" href="#space/${s.id}/autorule"><b>${h(s.name)}</b><span>자동 할인이 꺼져 있어요. 추천값 버튼으로 바로 켤 수 있어요</span></a>`);
      if (s.subscription_until && s.subscription_until >= today() && s.subscription_until <= addDays(today(), 7) && ['trial', 'active'].includes(s.subscription_status)) todo.push(`<a class="todo" href="#space/${s.id}/subscription"><b>${h(s.name)}</b><span>${h(s.subscription_until)}에 ${s.subscription_status === 'trial' ? '무료 체험' : '구독'}이 끝나요</span></a>`);
    }
    shell(`${adminBanner()}<div class="c-title"><h1>내 공간</h1><span class="sub">${sp.length}개 · 공개 ${live}</span><div class="right"><a class="btn btn-p" href="#new">+ 공간 등록</a></div></div>
    <div class="kpis"><div class="kpi pt"><b>${sumV}</b><span>앞으로 2주 공실 칸</span></div><div class="kpi"><b>${sumD}</b><span>진행·예정 딜</span></div><div class="kpi"><b>${sumC}</b><span>대기 중 딜 코드</span></div><div class="kpi"><b>${live}</b><span>공개 중인 공간</span></div></div>
    ${todo.length ? `<div class="panel"><h2>오늘 할 일 <span class="mini">${todo.length}</span></h2><div class="todos">${todo.slice(0, 8).join('')}</div></div>` : ''}
    ${live ? '<div class="panel" data-board><h2>오늘·내일 한눈에 <span class="mini">칸을 누르면 비어 있음 → 예약됨 → 휴무 순으로 바뀌어요</span></h2><p class="muted">불러오는 중…</p></div>' : ''}
    ${sp.length ? `<div class="panel"><h2>공간 목록</h2><div class="sp-list">${sp.map(s => `<div class="sp-item" data-go="#space/${s.id}"><img src="${h((s.photo || '').replace('#keep', '') || '/assets/placeholder.svg')}" alt="" onerror="this.src='/assets/placeholder.svg'"><div class="t"><b>${h(s.name)}</b><span>${h(s.region_name || '지역 미설정')} · 2주 공실 ${s.vacant_n}칸 · 딜 ${s.deal_n} · 코드 ${s.claim_n}</span><span class="auto-line">${s.paused_until && s.paused_until >= today() ? `<em class="warn">${h(s.paused_until)}까지 일시정지</em>` : ''}<em class="${s.auto_enabled ? 'on' : ''}">자동 할인 ${s.auto_enabled ? '켜짐' : '꺼짐'}</em><em class="${s.open_cells ? 'on' : ''}">반복 공실 ${s.open_cells ? `주 ${s.open_cells}칸` : '없음'}</em><em class="${s.sched_n ? 'on' : ''}">반복 딜 ${s.sched_n || 0}개</em>${s.has_ical ? '<em class="on">캘린더 연동</em>' : ''}</span>${s.review_note && ['revision', 'rejected'].includes(s.status) ? `<span style="color:var(--hot)">검수 메모: ${h(s.review_note)}</span>` : ''}</div><div class="st">${pill(STATUS, s.status)}${pill(SUB, s.subscription_status)}${s.subscription_until ? `<span>~${h(s.subscription_until)}</span>` : ''}</div></div>`).join('')}</div></div>`
      : `<div class="panel"><h2>첫 공간을 등록해 보세요</h2><p>사진 몇 장과 요금표만 있으면 10분이면 됩니다. 검수 후 공개되고, ${CFG.trialDays ? `${CFG.trialDays}일 무료 체험이 시작됩니다.` : '구독 결제 후 딜을 만들 수 있습니다.'}</p><a class="btn btn-p btn-lg" href="#new">공간 등록 시작</a></div>`}
    <div class="panel"><h2>이렇게 쓰면 편해요</h2><ol class="howto"><li><b>매주 비는 시간을 한 번만 정하세요.</b> 공간 → 공실·할인 → 반복 공실. 그 칸은 전날·당일이 되면 자동 할인으로 노출돼요.</li><li><b>예약이 들어오면 '예약됨'만 누르세요.</b> 이 화면의 오늘·내일 표나 공간의 '오늘' 화면에서 한 번 누르면 할인이 바로 내려가요.</li><li><b>정기 특가는 반복 딜로 걸어 두세요.</b> "평일 오후 2시 타임딜"처럼 정해 두면 매주 그 시각에 열려요.</li><li><b>딜 코드는 '사용 처리'만.</b> 전화·카카오로 예약한 손님이 코드를 말하면 성과·구독 → 딜 코드에서 눌러 주세요.</li></ol></div>`, '내 공간');
    if (live) renderBoard();
  }
  function adminBanner() { return S.host && S.host.via === 'admin' ? `<div class="admin-banner">관리자 화면에서 연 <b>${h(S.host.name)}</b> 호스트센터입니다. 바꾼 내용은 이 호스트의 공간에 바로 반영돼요.</div>` : ''; }

  /* ---- 홈: 오늘·내일 한눈에 ---- */
  async function renderBoard() {
    const el = $('[data-board]'); if (!el) return;
    let r; try { r = await api('/api/host/board'); } catch (e) { el.innerHTML = `<h2>오늘·내일 한눈에</h2><p class="muted">${h(e.message)}</p>`; return; }
    S.board = r.spaces;
    const live = r.spaces.filter(x => x.live || x.status === 'approved');
    if (!live.length) { el.remove(); return; }
    const dts = live[0].dates;
    el.innerHTML = `<h2>오늘·내일 한눈에 <span class="mini">칸을 누르면 비어 있음 → 예약됨 → 휴무 순으로 바뀌어요 · 회색 '반복'은 매주 기본값</span></h2>
      <div class="board">${live.map(sp => `<div class="bd-sp"><div class="bd-h"><a href="#space/${sp.id}/today"><b>${h(sp.name)}</b></a>${sp.paused_until && sp.paused_until >= today() ? '<span class="pill warn">일시정지</span>' : ''}${sp.rule && sp.rule.enabled ? '' : '<a class="pill" href="#space/' + sp.id + '/autorule">자동 할인 꺼짐</a>'}</div>
        <table class="bd-tbl"><thead><tr><th></th>${dts.map(d => `<th>${d.today ? '오늘' : '내일'} <small>${d.date.slice(5).replace('-', '/')}(${d.dow})</small></th>`).join('')}</tr></thead><tbody>
        ${sp.grid.map(row => `<tr><td class="lbl">${h(row.slot.name)}<small>${h(row.slot.start)}~${h(row.slot.end)}</small></td>${row.cells.map(c => `<td>${boardCell(sp, row.slot, c)}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>`).join('')}</div>`;
  }
  function shownLine(c) {
    const shown = (c.items || []).find(i => i.shown);
    if ((c.notes || []).includes('마감됨')) return '오늘 마감';
    if (!shown) return c.status === 'vacant' ? (c.notes.length ? c.notes.join(' · ') : '할인 없음') : '';
    if (shown.type === 'PLAN') return '할인 예정';
    return `${TYPE[shown.type]} ${won(shown.price)}${shown.scheduled ? ' (예정)' : ''}`;
  }
  function boardCell(sp, slot, c) {
    const past = (c.notes || []).includes('마감됨');
    return `<button type="button" class="bd-cell ${c.status || 'none'} ${past ? 'past' : ''}" data-bd data-space="${sp.id}" data-slot="${slot.id}" data-date="${c.date}" data-st="${c.status || ''}"><span class="st">${ST_LABEL[c.status || '']}${c.source === 'pattern' ? '<i>반복</i>' : c.source === 'ical' ? '<i>연동</i>' : ''}</span><small>${h(shownLine(c))}</small></button>`;
  }
  async function cycleCell(btn, spaceId, slotId, date, pattern, afterFn) {
    const def = ((pattern || {})[slotId] || [])[dow(date)] || '';
    const cur = btn.dataset.st || '';
    const order = def ? ['vacant', 'booked', 'closed'] : ['', 'vacant', 'booked', 'closed'];
    const next = order[(order.indexOf(cur) + 1) % order.length];
    btn.disabled = true;
    try {
      await api(`/api/host/spaces/${spaceId}/vacancies`, { method: 'PUT', body: { items: [{ slot_id: Number(slotId), date, status: next === def ? 'clear' : (next || 'clear') }] } });
      if (next === 'booked') toast('예약됨으로 바꿨어요. 이 칸의 할인은 바로 내려갑니다.');
      else if (next === 'vacant') toast('비어 있음으로 바꿨어요. 할인 조건에 맞으면 곧 노출돼요.');
      if (afterFn) await afterFn();
    } catch (e) { toast(e.message); btn.disabled = false; }
  }

  /* ---------- 공간 생성 ---------- */
  function renderNew() {
    shell(`<div class="c-title"><h1>새 공간 등록</h1></div><div class="panel"><form class="form" data-form="new"><label>공간 이름<input name="name" required maxlength="60" placeholder="예: 홍대 루프탑 파티룸"></label><label>한 줄 소개<input name="intro" maxlength="120" placeholder="예: 10명까지 편한 루프탑, 노래방·빔 완비"></label><p class="hint">나머지 정보는 다음 화면에서 순서대로 채우면 됩니다. 기본정보 → 사진 → 요금 → 예약채널 → 검수 요청, 5단계예요.</p><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">만들고 계속</button><a class="btn btn-o" href="#home">취소</a></div></form></div>`, '새 공간');
  }

  /* ---------- 공간 편집 ---------- */
  const GROUPS = [
    { k: 'today', label: '오늘', tabs: [['today', '오늘']] },
    { k: 'sell', label: '공실·할인', tabs: [['auto', '자동 운영'], ['pattern', '반복 공실'], ['autorule', '자동 할인'], ['schedules', '반복 딜'], ['calendar', '공실 캘린더'], ['deals', '직접 딜']] },
    { k: 'info', label: '공간 정보', tabs: [['info', '기본정보'], ['photos', '사진'], ['slots', '요금'], ['channel', '예약채널'], ['review', '검수·공개']] },
    { k: 'result', label: '성과·구독', tabs: [['claims', '딜 코드'], ['stats', '통계'], ['subscription', '구독']] },
  ];
  const groupOf = tab => GROUPS.find(g => g.tabs.some(([k]) => k === tab)) || GROUPS[2];
  const STEPS = [['info', '기본정보'], ['photos', '사진'], ['slots', '요금'], ['channel', '예약채널'], ['review', '검수 요청']];
  function stepState(s) {
    const is = S.issues || [];
    const has = re => is.some(x => re.test(x));
    return {
      info: !has(/이름|지역|주소|한 줄|공간 소개/), photos: !has(/사진/), slots: !has(/슬롯|요금/), channel: !has(/예약 채널/),
      review: ['pending', 'approved', 'hidden'].includes(s.status),
    };
  }
  function firstTab(s) {
    if (['approved', 'hidden'].includes(s.status)) return 'today';
    const st = stepState(s);
    const t = STEPS.find(([k]) => !st[k]);
    return t ? t[0] : 'review';
  }
  function stepper(s, tab) {
    if (['approved', 'hidden'].includes(s.status)) return '';
    const st = stepState(s);
    const n = STEPS.filter(([k]) => st[k]).length;
    return `<div class="stepper"><div class="sp-head"><b>${s.status === 'pending' ? '검수 중이에요. 보통 하루 안에 결과를 알려드려요.' : `공개까지 ${STEPS.length - n}단계 남았어요`}</b><span class="mini">${n}/${STEPS.length}</span></div><ol>${STEPS.map(([k, l], i) => `<li class="${st[k] ? 'done' : ''} ${k === tab ? 'cur' : ''}"><a href="#space/${s.id}/${k}"><i>${st[k] ? '✓' : i + 1}</i>${l}</a></li>`).join('')}</ol></div>`;
  }
  async function loadSpace(id) { const r = await api(`/api/host/spaces/${id}`); S.space = r.space; S.issues = r.issues; }
  async function loadMeta() {
    if (!S.regions) S.regions = (await api('/api/regions')).tree;
    if (!S.themes) { const r = await fetch('/api/themes').then(x => x.json()).catch(() => null); S.themes = r && r.themes ? r.themes : []; }
  }
  async function renderSpace(id, tab) {
    if (tab !== 'schedules' || (S.space && S.space.id !== id)) S.schedEdit = null;
    try { await loadSpace(id); } catch (e) { toast(e.message); location.hash = 'home'; return; }
    await loadMeta();
    const s = S.space;
    if (!tab) tab = firstTab(s);
    S.tab = tab;
    const g = groupOf(tab);
    const me = (S.spaces || []).find(x => x.id === s.id) || {};
    const badge = k => k === 'result' && me.claim_n ? `<em>${me.claim_n}</em>` : k === 'info' && (S.issues || []).length && !['approved', 'hidden'].includes(s.status) ? `<em>${S.issues.length}</em>` : '';
    const others = (S.spaces || []).filter(x => x.id !== s.id);
    const head = `${adminBanner()}<div class="c-title"><a href="#home" class="btn btn-o back">‹ 목록</a><h1>${h(s.name)}</h1>${pill(STATUS, s.status)}${pill(SUB, s.subscription_status)}<div class="right">${others.length ? `<select class="sp-switch" data-sp-switch aria-label="다른 공간으로 이동"><option value="">다른 공간 ▾</option>${others.map(x => `<option value="${x.id}">${h(x.name)}</option>`).join('')}</select>` : ''}<a class="btn btn-o" href="/space/${h(s.slug)}" target="_blank">${s.status === 'approved' ? '공개 페이지' : '미리보기'}</a></div></div>
    <nav class="c-groups">${GROUPS.map(x => `<a href="#space/${s.id}/${x.k === g.k ? tab : (S.lastTab?.[x.k] || x.tabs[0][0])}" class="${x.k === g.k ? 'on' : ''}">${x.label}${badge(x.k)}</a>`).join('')}</nav>
    ${g.tabs.length > 1 ? `<nav class="c-tabs">${g.tabs.map(([k, l]) => `<a href="#space/${s.id}/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav>` : ''}`;
    S.lastTab = { ...(S.lastTab || {}), [g.k]: tab };
    const body = await ({ today: tabToday, info: tabInfo, photos: tabPhotos, slots: tabSlots, channel: tabChannel, review: tabReview, auto: tabAuto, pattern: tabPattern, schedules: tabSchedules, calendar: tabCalendar, autorule: tabAutorule, deals: tabDeals, claims: tabClaims, stats: tabStats, subscription: tabSubscription }[tab] || tabInfo)(s);
    shell(head + (g.k === 'info' || tab === 'today' ? stepper(s, tab) : '') + body, s.name);
    if (tab === 'calendar') bindCalendar(s);
    if (tab === 'deals') bindDeals(s);
    if (tab === 'schedules') bindSchedules(s);
    if (tab === 'pattern') patSummary();
  }

  /* ---- 오늘 ---- */
  async function tabToday(s) {
    await ensureSpaces();
    if (!['approved', 'hidden'].includes(s.status)) return `<div class="panel"><h2>공개되면 이 화면에서 매일 관리해요</h2><p>오늘·내일 칸마다 비어 있음/예약됨을 한 번에 바꾸고, 손님에게 지금 어떤 가격이 보이는지 바로 확인하는 화면이에요. 위 단계를 마치고 검수를 요청해 주세요.</p></div>`;
    const r = await api(`/api/host/spaces/${s.id}/automation`);
    S.todayAuto = r;
    const a = r.automation, pv = r.preview, me = (S.spaces || []).find(x => x.id === s.id) || {};
    const alerts = [];
    if (!r.live) alerts.push(`<a class="todo hot" href="#space/${s.id}/subscription"><b>손님에게 보이지 않아요</b><span>${s.status === 'hidden' ? '비공개 상태예요. 검수·공개에서 다시 공개할 수 있어요' : '구독(체험 포함)이 활성화되면 노출돼요'}</span></a>`);
    if (me.claim_n) alerts.push(`<a class="todo hot" href="#space/${s.id}/claims"><b>딜 코드 ${me.claim_n}건</b><span>예약을 확인하고 사용 처리해 주세요</span></a>`);
    if (a.paused_until && a.paused_until >= today()) alerts.push(`<a class="todo" href="#space/${s.id}/auto"><b>${h(a.paused_until)}까지 일시정지</b><span>자동 할인과 반복 딜이 멈춰 있어요</span></a>`);
    if (!a.open_cells && !a.ical_url) alerts.push(`<a class="todo" href="#space/${s.id}/pattern"><b>반복 공실을 정해 주세요</b><span>매주 비는 칸을 한 번만 열어 두면 매일 누르지 않아도 돼요</span></a>`);
    if (!(r.rule && r.rule.enabled)) alerts.push(`<a class="todo" href="#space/${s.id}/autorule"><b>자동 할인이 꺼져 있어요</b><span>추천값 버튼 하나로 켤 수 있어요</span></a>`);
    const day = (d, i) => `<div class="panel td-day"><h2>${i === 0 ? '오늘' : '내일'} <span class="mini">${d.date.slice(5).replace('-', '/')}(${d.dow}) · ${{ wk: '평일', fri: '금요일', sat: (S.settings?.holidays || []).includes(d.date) ? '공휴일' : '토요일', sun: '일요일' }[dayKind(d.date)]} 요금</span></h2>
      ${pv.grid.map(row => {
        const c = row.cells[i]; const sl = s.slots.find(x => x.id === row.slot.id) || {};
        const past = c.notes.includes('마감됨');
        const shown = (c.items || []).find(x => x.shown);
        const def = ((a.pattern || {})[row.slot.id] || [])[dow(d.date)] || '';
        const seg = ['vacant', 'booked', 'closed'].map(v => `<button type="button" class="${c.status === v ? 'on' : ''} ${v}" data-td="${v}" data-slot="${row.slot.id}" data-date="${d.date}" data-def="${def}">${ST_LABEL[v]}</button>`).join('');
        const line = shown ? (shown.type === 'PLAN' ? `<span class="pv-plan">자동 할인 예정</span> ${h(shown.plan)}` : `<span class="badge b-${shown.type.toLowerCase()}">${TYPE[shown.type]}</span> <b>${won(shown.price)}</b> <s>${won(shown.base)}</s>${shown.scheduled ? ` · ${h((shown.startsAt || '').slice(11, 16))} 오픈 예정` : ' · 손님에게 노출 중'}`)
          : past ? '<span class="muted">시작 시각이 지나 할인 노출이 끝났어요</span>' : c.status === 'vacant' ? `<span class="muted">${c.notes.length ? h(c.notes.join(' · ')) : '노출 중인 할인이 없어요'}</span>` : c.status === 'booked' ? '<span class="muted">예약됨 · 할인 노출 안 함</span>' : c.status === 'closed' ? '<span class="muted">휴무</span>' : '<span class="muted">미정 · 비어 있으면 눌러 주세요</span>';
        const canFlash = i === 0 && c.status === 'vacant' && r.live && !(shown && shown.type === 'FLASH') && !past;
        return `<div class="td-row ${past ? 'past' : ''}"><div class="td-slot">${past ? '<small class="tag">오늘 판매 마감</small>' : ''}<b>${h(row.slot.name)}</b><span>${h(row.slot.start)}~${h(row.slot.end)} · 정가 ${won(basePrice(sl, d.date))}</span>${c.source && c.source !== 'manual' ? `<small class="tag">${c.source === 'pattern' ? '반복 공실' : '캘린더 연동'}</small>` : ''}</div><div class="seg">${seg}</div><div class="td-line">${line}${canFlash ? `<button type="button" class="btn btn-o mini-btn" data-flash="${row.slot.id}">반짝딜 2시간 30%</button>` : ''}</div></div>`;
      }).join('') || '<p class="muted">요금(슬롯)을 먼저 등록하세요.</p>'}</div>`;
    return `${alerts.length ? `<div class="todos">${alerts.join('')}</div>` : ''}
      <div class="td-grid">${pv.dates.slice(0, 2).map(day).join('')}</div>
      <div class="panel"><h2>바로가기</h2><div class="quick"><a href="#space/${s.id}/auto"><b>7일 미리보기</b><span>앞으로 손님에게 보일 가격</span></a><a href="#space/${s.id}/calendar"><b>2주 캘린더</b><span>날짜별 공실 한꺼번에</span></a><a href="#space/${s.id}/schedules"><b>반복 딜</b><span>정기 특가 예약</span></a><a href="#space/${s.id}/deals"><b>직접 딜 만들기</b><span>타임딜·핫딜·이벤트</span></a></div></div>`;
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
    const ext = s.photos.filter(p => /^https?:\/\//.test(p) && !p.endsWith('#keep')).length;
    return `<div class="panel"><h2>사진 <span class="mini">${s.photos.length}장 · 최소 3장, 권장 10장 · 가로 사진 · 첫 장이 대표</span></h2>
      ${ext ? `<div class="tip">다른 사이트 링크로 걸린 사진이 ${ext}장 있어요. 원래 사이트에서 사진을 지우면 여기서도 안 보이니, 내 저장소로 옮겨 두는 걸 권해요. <button type="button" class="btn btn-o mini-btn" data-act="photo-import">내 저장소로 옮기기</button></div>` : ''}
      <div class="photo-grid" data-photos>${s.photos.map((p, i) => `<div class="photo">${i === 0 ? '<span class="first">대표</span>' : ''}<img src="${h(p.replace('#keep', ''))}" alt="" loading="lazy" onerror="this.closest('.photo').classList.add('broken')"><div class="ops"><button type="button" data-ph="up" data-i="${i}">◀</button><button type="button" data-ph="down" data-i="${i}">▶</button><button type="button" data-ph="del" data-i="${i}">삭제</button></div></div>`).join('')}</div>
      <h3>사진 올리기</h3><form class="form" data-form="upload"><div class="row"><label>파일 선택 (jpg·png·webp, 8MB 이하, 여러 장 가능)<input type="file" name="files" accept="image/*" multiple style="height:auto;padding:8px"></label><label>또는 이미지 URL 붙여넣기<input name="url" placeholder="https://..."></label></div><p class="hint">파일 업로드는 Cloudflare R2 저장소(IMAGES 바인딩)가 연결된 경우 동작합니다. 연결 전에는 URL 방식을 쓰세요.</p><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">추가</button>${['approved', 'hidden'].includes(s.status) ? '' : `<a class="btn btn-o" href="#space/${s.id}/slots">다음: 요금 ›</a>`}</div></form></div>`;
  }
  function slotRow(sl = {}, i = 0) {
    return `<tr data-slot-row><td><input type="hidden" name="id" value="${sl.id || ''}"><input name="name" value="${h(sl.name || '')}" placeholder="낮타임" class="w-m"></td><td><select name="kind"><option value="package" ${sl.kind !== 'hourly' ? 'selected' : ''}>패키지</option><option value="hourly" ${sl.kind === 'hourly' ? 'selected' : ''}>시간제</option></select></td><td><input name="start_time" type="time" value="${h(sl.start_time || '12:00')}" class="w-s"></td><td><input name="end_time" type="time" value="${h(sl.end_time || '17:00')}" class="w-s"></td><td><input name="price_weekday" type="number" step="1000" min="0" value="${sl.price_weekday || ''}" class="w-m" placeholder="80000"></td><td class="dp"><input name="price_fri" type="number" step="1000" min="0" value="${sl.price_fri || ''}" class="w-m" placeholder="같음"></td><td><input name="price_weekend" type="number" step="1000" min="0" value="${sl.price_weekend || ''}" class="w-m" placeholder="100000"></td><td class="dp"><input name="price_sun" type="number" step="1000" min="0" value="${sl.price_sun || ''}" class="w-m" placeholder="같음"></td><td><input name="base_people" type="number" min="1" value="${sl.base_people || 4}" class="w-s"></td><td><input name="extra_fee" type="number" step="1000" min="0" value="${sl.extra_fee || 0}" class="w-m"></td><td><button type="button" class="btn btn-o" style="height:32px;padding:0 8px" data-slot="del">삭제</button></td></tr>`;
  }
  const SLOT_TPL = {
    std: [{ name: '낮타임', start_time: '12:00', end_time: '17:00', base_people: 4 }, { name: '밤타임', start_time: '19:00', end_time: '10:00', base_people: 4 }, { name: '올데이', start_time: '12:00', end_time: '22:00', base_people: 4 }],
    two: [{ name: '낮타임', start_time: '12:00', end_time: '17:00', base_people: 4 }, { name: '밤타임', start_time: '19:00', end_time: '10:00', base_people: 4 }],
    hourly: [{ name: '시간제', kind: 'hourly', start_time: '10:00', end_time: '23:00', base_people: 4 }],
  };
  function tabSlots(s) {
    const dayPriced = s.slots.some(sl => sl.price_fri || sl.price_sun);
    return `<div class="panel"><h2>이용 시간 · 요금 <span class="mini">정가 기준. 모든 할인은 이 정가에서 계산돼요</span></h2>
      ${s.slots.length ? '' : `<div class="actions" style="margin-bottom:10px"><span class="mini">자주 쓰는 구성으로 채우기</span><button type="button" class="btn btn-o" data-slot-tpl="std">낮·밤·올데이</button><button type="button" class="btn btn-o" data-slot-tpl="two">낮·밤</button><button type="button" class="btn btn-o" data-slot-tpl="hourly">시간제</button></div>`}
      <label class="inline dp-toggle"><input type="checkbox" data-dp-toggle ${dayPriced ? 'checked' : ''}> 금요일·일요일 요금이 따로 있어요</label>
      <form class="form" data-form="slots"><div style="overflow-x:auto"><table class="slot-tbl ${dayPriced ? 'show-dp' : ''}" data-slot-tbl><thead><tr><th>이름</th><th>유형</th><th>시작</th><th>종료</th><th>${dayPriced ? '월~목' : '평일'}(원)</th><th class="dp">금(원)</th><th>${dayPriced ? '토·공휴일' : '주말·공휴일'}(원)</th><th class="dp">일(원)</th><th>기준인원</th><th>인원추가(원/인)</th><th></th></tr></thead><tbody data-slot-body>${(s.slots.length ? s.slots : SLOT_TPL.two).map(slotRow).join('')}</tbody></table></div>
      <p class="hint">종료가 시작보다 이르면 다음 날 아침까지로 계산돼요(밤타임 19:00~10:00). 금·일 칸을 비워 두면 금요일은 평일, 일요일은 주말 요금을 써요. 공휴일은 토요일 요금, 공휴일 전날은 금요일 요금(일요일이면 토요일 요금)으로 계산해요. 시간제는 운영 시간과 시간당 요금을 넣어 주세요.</p>
      <p class="msg"></p><div class="actions"><button type="button" class="btn btn-o" data-slot="add">+ 슬롯 추가</button><button class="btn btn-p" type="submit">저장</button>${['approved', 'hidden'].includes(s.status) ? '' : `<a class="btn btn-o" href="#space/${s.id}/channel">다음: 예약채널 ›</a>`}</div></form></div>`;
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

  /* ---- 자동 운영 공통 ---- */
  const ORIGIN = { AUTO: '자동', SCHEDULE: '반복', MANUAL: '직접' };
  const SRC = { manual: '직접', ical: '연동', pattern: '반복' };
  const ST_LABEL = { vacant: '비어있음', booked: '예약됨', closed: '휴무', '': '미정' };
  const WEEK = [1, 2, 3, 4, 5, 6, 0]; // 월요일부터
  const isRed = d => [0, 6].includes(dow(d)) || (S.settings?.holidays || []).includes(d);
  // 요금 기준 요일 — 서버(lib/util.js priceDayKind)와 같은 규칙
  const dayKind = d => { const hol = S.settings?.holidays || []; const w = dow(d); if (w === 6 || hol.includes(d)) return 'sat'; const eve = hol.includes(addDays(d, 1)); if (w === 0) return eve ? 'sat' : 'sun'; if (w === 5 || eve) return 'fri'; return 'wk'; };
  const basePrice = (sl, d) => { const k = dayKind(d); return k === 'sat' ? sl.price_weekend : k === 'sun' ? (sl.price_sun || sl.price_weekend) : k === 'fri' ? (sl.price_fri || sl.price_weekday) : sl.price_weekday; };
  const calcPrice = (base, mode, val, floor) => { let p = mode === 'RATE' ? base * (100 - val) / 100 : mode === 'AMOUNT' ? base - val : val; p = Math.round(p / 1000) * 1000; if (floor && p < floor) p = floor; return Math.max(0, Math.min(p, base)); };
  const daysText = days => { const k = [...days].map(Number).sort().join(','); if (k === '0,1,2,3,4,5,6') return '매일'; if (k === '1,2,3,4,5') return '평일(월~금)'; if (k === '1,2,3,4') return '월~목'; if (k === '0,6') return '주말'; return WEEK.filter(d => days.map(Number).includes(d)).map(d => DOW[d]).join('·'); };
  const leadText = (lead, time) => `${Number(lead) === 0 ? '이용일 당일' : `이용일 ${lead}일 전`} ${time}`;
  const discText = x => x.type === 'EVENT' ? `혜택: ${h(x.benefit_text)}` : (x.discount_mode === 'RATE' ? `${x.discount_value}% 할인` : x.discount_mode === 'AMOUNT' ? `${won(x.discount_value)} 할인` : `${won(x.discount_value)} 특가`);
  const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}(${DOW[dow(d)]})`;
  async function ensureSpaces() { if (!S.spaces || !S.spaces.length || !S.settings) await loadMe(); }

  /* ---- 자동 운영 허브 ---- */
  async function tabAuto(s) {
    await ensureSpaces();
    const r = await api(`/api/host/spaces/${s.id}/automation`);
    const a = r.automation, rule = r.rule, sc = r.schedules, pv = r.preview;
    const s1 = a.open_cells > 0 || !!a.ical_url;
    const s2 = rule && rule.enabled;
    const step = (ok, opt, title, desc, href, btn) => `<div class="auto-step ${ok ? 'ok' : opt ? 'opt' : ''}"><span class="mark">${ok ? '✓' : opt ? '+' : '!'}</span><div class="t"><b>${title}</b><p>${desc}</p></div><a class="btn ${ok ? 'btn-o' : 'btn-p'}" href="${href}">${btn}</a></div>`;
    const others = (S.spaces || []).filter(x => x.id !== s.id);
    const cell = c => {
      const shown = c.items.find(i => i.shown);
      const evt = c.items.find(i => i.type === 'EVENT');
      const more = c.items.filter(i => !i.shown && i.type !== 'EVENT').length;
      let main = '';
      if (shown && shown.type === 'PLAN') main = `<span class="pv-plan">자동 할인 예정</span><small>${h(shown.plan)}</small>`;
      else if (shown) main = `<span class="badge b-${shown.type.toLowerCase()}">${TYPE[shown.type]}</span><b>${won(shown.price)}</b><small>${ORIGIN[shown.origin] || ''}${shown.scheduled ? ` · ${h((shown.startsAt || '').slice(5, 16).replace('-', '/').replace('T', ' '))} 오픈` : ' · 노출 중'}</small>`;
      return `<td><div class="pv-cell ${c.status || 'none'}"><span class="pv-st">${ST_LABEL[c.status || '']}${c.source && c.source !== 'manual' ? `<i>${SRC[c.source]}</i>` : ''}</span>${main}${evt ? '<small class="ev">+이벤트</small>' : ''}${more ? `<small>외 ${more}건</small>` : ''}${c.notes.length ? `<small class="nt">${c.notes.join(' · ')}</small>` : ''}</div></td>`;
    };
    return `${r.live ? '' : '<div class="issues">아직 공개·구독 전이라 손님에게는 보이지 않습니다. 아래 설정은 미리 해 두면 공개되는 순간부터 그대로 동작합니다.</div>'}
      <div class="panel auto-hero"><h2>자동 운영 <span class="mini">한 번 설정해 두면 매일 들어오지 않아도 할인이 알아서 열립니다</span></h2>
        ${a.paused_until ? `<div class="issues"><b>${h(a.paused_until)}까지 일시정지 중</b>${a.pause_note ? ` · ${h(a.pause_note)}` : ''}<br>이 기간에는 자동 할인과 반복 딜이 열리지 않습니다. 직접 만든 딜은 그대로 진행됩니다. <button type="button" class="link" data-auto="resume">지금 다시 시작</button></div>` : ''}
        <div class="auto-steps">
          ${step(s1, false, '① 비는 시간 알려주기', s1 ? `매주 ${a.open_cells}칸을 비어 있음으로 열어 둠${a.ical_url ? ' · 캘린더 연동 중' : ''}. 예약이 들어오면 그 칸만 '예약됨'으로 바꾸면 됩니다.` : '요일·시간대별로 보통 비는 칸을 한 번만 정해 두세요. 매주 자동으로 반복됩니다.', `#space/${s.id}/pattern`, s1 ? '반복 공실 수정' : '반복 공실 정하기')}
          ${step(s2, false, '② 자동 할인율 정하기', s2 ? `비어 있는 칸은 전날 ${rule.tomorrow_rate}%, 당일 ${rule.today_rate}% 할인으로 자동 노출됩니다.` : '비어 있는 칸이 전날·당일이 되면 몇 % 내릴지 정하세요. 추천값을 버튼 한 번으로 넣을 수 있습니다.', `#space/${s.id}/autorule`, s2 ? '할인율 수정' : '자동 할인 켜기')}
          ${step(sc.enabled > 0, true, '③ 반복 딜 (선택)', sc.enabled > 0 ? `반복 딜 ${sc.enabled}개가 정해진 요일·시각에 자동으로 열립니다.` : '"매주 화요일 오후 2시 타임딜"처럼 정기 특가를 예약해 두세요.', `#space/${s.id}/schedules`, sc.enabled > 0 ? '반복 딜 관리' : '반복 딜 만들기')}
        </div>
      </div>
      <div class="panel"><h2>앞으로 7일 미리보기 <span class="mini">손님에게 보일 가격 기준 · 칸 위 작은 글씨는 공실을 정한 곳(반복·연동·직접)</span></h2>
        ${pv.grid.length ? `<div class="pv"><table><thead><tr><th></th>${pv.dates.map(d => `<th class="${d.today ? 'today' : ''} ${isRed(d.date) ? 'we' : ''}">${d.date.slice(5).replace('-', '/')}<br>${d.dow}${d.today ? ' 오늘' : ''}</th>`).join('')}</tr></thead><tbody>
        ${pv.grid.map(row => `<tr><td class="lbl">${h(row.slot.name)}<br><small class="mini">${h(row.slot.start)}~${h(row.slot.end)}</small></td>${row.cells.map(cell).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="hint">예약이 들어온 칸은 <a href="#space/${s.id}/calendar">공실 캘린더</a>에서 탭 한 번으로 '예약됨'으로 바꾸세요. 그 칸의 할인은 바로 내려갑니다.</p>` : '<div class="issues">먼저 "요금" 탭에서 이용 시간(슬롯)을 등록하세요.</div>'}
      </div>
      <div class="split">
        <div class="panel"><h2>일시정지 <span class="mini">휴가·공사·장기 예약 기간</span></h2>
          <form class="form" data-form="pause"><div class="row"><label>이 날짜까지 멈춤<input type="date" name="paused_until" value="${h(a.paused_until || '')}" min="${today()}"></label><label>메모(선택)<input name="pause_note" value="${h(a.pause_note || '')}" placeholder="예: 내부 공사"></label></div>
          <div class="actions"><span class="mini">빠른 선택</span><button type="button" class="btn btn-o" data-pause-days="0">오늘만</button><button type="button" class="btn btn-o" data-pause-days="2">3일</button><button type="button" class="btn btn-o" data-pause-days="6">1주</button></div>
          <p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">${a.paused_until ? '기간 변경' : '일시정지'}</button>${a.paused_until ? '<button type="button" class="btn btn-o" data-auto="resume">다시 시작</button>' : ''}</div></form></div>
        ${others.length ? `<div class="panel"><h2>다른 공간에 같은 설정 복사 <span class="mini">다점포용</span></h2>
          <form class="form" data-form="copy"><label>복사할 공간<div class="toggle-chips">${others.map(o => `<label><input type="checkbox" name="to" value="${o.id}">${h(o.name)}</label>`).join('')}</div></label>
          <label>복사할 항목<div class="toggle-chips"><label><input type="checkbox" name="parts" value="rule" checked>자동 할인율</label><label><input type="checkbox" name="parts" value="pattern" checked>반복 공실</label><label><input type="checkbox" name="parts" value="schedules">반복 딜</label></div></label>
          <p class="hint">슬롯은 이름이 같은 것끼리, 없으면 순서대로 맞춥니다. 바닥가는 공간마다 달라서 복사하지 않습니다. 반복 딜은 복사한 공간에 새로 추가됩니다.</p>
          <p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">복사하기</button></div></form></div>` : `<div class="panel"><h2>이렇게 동작합니다</h2><ul class="checks"><li>반복 공실로 연 칸은 매주 같은 요일에 자동으로 '비어 있음'이 됩니다.</li><li>그 칸이 내일이 되면 전날 할인, 오늘이 되면 당일 할인이 자동으로 노출됩니다.</li><li>예약이 들어온 칸만 캘린더에서 '예약됨'으로 바꾸면 할인이 내려갑니다.</li><li>반복 딜은 정해 둔 시각에 열리고, 예약된 칸에는 열리지 않습니다.</li></ul></div>`}
      </div>`;
  }

  /* ---- 반복 공실 (매주 기본 상태) + 캘린더 연동 ---- */
  async function tabPattern(s) {
    const r = await api(`/api/host/spaces/${s.id}/automation`);
    const a = r.automation;
    S.pat = {}; for (const sl of s.slots) S.pat[sl.id] = (a.pattern[sl.id] || ['', '', '', '', '', '', '']).slice();
    const btn = (sl, d) => { const v = S.pat[sl.id][d]; return `<button type="button" class="pat ${v || 'none'}" data-pat data-slot="${sl.id}" data-dow="${d}">${v === 'vacant' ? '비어 있음' : v === 'closed' ? '휴무' : '정하지 않음'}</button>`; };
    return `<div class="panel"><h2>반복 공실 <span class="mini">매주 같은 요일·시간대에 적용되는 기본값</span></h2>
      <p class="hint">보통 비는 칸을 '비어 있음'으로 열어 두면, 그 칸은 매주 자동으로 할인 대상이 됩니다. 예약이 들어온 날만 <a href="#space/${s.id}/calendar">공실 캘린더</a>에서 '예약됨'으로 바꾸세요. 캘린더에서 직접 바꾼 날짜가 이 기본값보다 우선합니다.</p>
      ${!s.slots.length ? '<div class="issues">먼저 "요금" 탭에서 슬롯을 등록하세요.</div>' : `
      <div class="actions" style="margin-bottom:8px"><span class="mini">빠른 설정</span><button type="button" class="btn btn-o" data-preset="all">모든 시간 열기</button><button type="button" class="btn btn-o" data-preset="weekday">월~목만 열기</button><button type="button" class="btn btn-o" data-preset="weekdayFirst">평일 첫 슬롯만</button><button type="button" class="btn btn-o" data-preset="weekendClosed">주말은 정하지 않음</button><button type="button" class="btn btn-o" data-preset="clear">모두 지우기</button></div>
      <div class="cal"><table class="pat-tbl"><thead><tr><th></th>${WEEK.map(d => `<th class="${[0, 6].includes(d) ? 'we' : ''}">${DOW[d]}</th>`).join('')}</tr></thead><tbody>
      ${s.slots.map(sl => `<tr><td class="lbl">${h(sl.name)}<br><small class="mini">${h(sl.start_time)}~${h(sl.end_time)}</small></td>${WEEK.map(d => `<td>${btn(sl, d)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="mini" data-pat-sum></p>
      <div class="actions"><button type="button" class="btn btn-p" data-act="pattern-save">반복 공실 저장</button></div>`}
    </div>
    <div class="panel"><h2>캘린더 연동 <span class="mini">선택 · 예약이 잡히면 자동으로 '예약됨' 처리</span></h2>
      <p class="hint">예약을 구글 캘린더 등에 기록하고 있다면 그 캘린더의 iCal(.ics) 주소를 넣으세요. 30분마다 확인해서 일정과 겹치는 칸을 '예약됨'으로 바꾸고, 일정이 지워지면 다시 풀어 줍니다. 반복 공실과 함께 쓰면 공실 관리를 거의 하지 않아도 됩니다.</p>
      <details><summary>구글 캘린더 iCal 주소 찾는 법</summary><ol class="mini"><li>컴퓨터에서 구글 캘린더 → 오른쪽 위 톱니바퀴 → 설정</li><li>왼쪽 '내 캘린더의 설정'에서 예약용 캘린더 선택</li><li>'캘린더 통합' → <b>iCal 형식의 비공개 주소</b> 복사</li></ol><p class="mini">네이버 예약·스페이스클라우드 예약을 구글 캘린더로 받고 있다면 그 캘린더 주소를 쓰면 됩니다. 시간제 슬롯은 부분 예약이 가능해서 연동 대상에서 빠집니다.</p></details>
      <form class="form" data-form="ical"><label>iCal 주소<input name="ical_url" value="${h(a.ical_url || '')}" placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"></label>
      <label class="inline"><input type="checkbox" name="ical_allday" ${a.ical_allday ? 'checked' : ''}> 종일 일정도 예약(또는 휴무)으로 보기</label>
      ${a.ical_url ? `<p class="mini">마지막 확인: ${h((a.ical_last_sync || '아직 없음').replace('T', ' '))} · ${h(a.ical_last_result || '')}</p>` : ''}
      <p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">저장</button>${a.ical_url ? '<button type="button" class="btn btn-o" data-act="ical-sync">지금 동기화</button>' : ''}</div></form></div>`;
  }
  function patSummary() {
    const el = $('[data-pat-sum]'); if (!el) return;
    let open = 0, closed = 0; for (const row of Object.values(S.pat || {})) for (const v of row) { if (v === 'vacant') open++; if (v === 'closed') closed++; }
    el.textContent = `매주 ${open}칸 비어 있음 · ${closed}칸 휴무. 저장해야 반영됩니다.`;
  }

  /* ---- 반복 딜 ---- */
  const SCHED_TPL = {
    weekdayTime: { name: '평일 오후 타임딜', type: 'TIME', days: [1, 2, 3, 4], lead_days: 0, open_time: '14:00', duration_min: 180, discount_mode: 'RATE', discount_value: 30 },
    nightFlash: { name: '저녁 반짝딜', type: 'FLASH', days: [0, 1, 2, 3, 4], lead_days: 0, open_time: '17:00', duration_min: 120, discount_mode: 'RATE', discount_value: 40, quantity: 1 },
    earlyHot: { name: '이틀 전 핫딜', type: 'HOT', days: [1, 2, 3, 4], lead_days: 2, open_time: '10:00', duration_min: '', discount_mode: 'RATE', discount_value: 30, quantity: 2 },
    sameDay: { name: '화요일 당일 특가', type: 'TODAY', days: [2], lead_days: 0, open_time: '09:00', duration_min: '', discount_mode: 'RATE', discount_value: 40 },
    event: { name: '생일 이벤트', type: 'EVENT', days: [0, 1, 2, 3, 4, 5, 6], lead_days: 7, open_time: '10:00', duration_min: '', benefit_text: '생일 케이크 증정', only_vacant: false },
  };
  async function tabSchedules(s) {
    await ensureSpaces();
    const r = await api(`/api/host/spaces/${s.id}/schedules`);
    S.schedList = r.schedules;
    const e = S.schedEdit || S.schedPrefill || { type: 'TIME', days: [1, 2, 3, 4], slot_ids: s.slots[0] ? [s.slots[0].id] : [], lead_days: 0, open_time: '14:00', duration_min: 180, discount_mode: 'RATE', discount_value: 30, only_vacant: 1, start_date: today() };
    S.schedPrefill = null;
    const slotName = id => (s.slots.find(x => x.id === Number(id)) || {}).name || `#${id}`;
    const canMake = s.status === 'approved';
    const item = x => `<div class="sched ${x.enabled ? '' : 'off'}">
      <div class="sched-h"><label class="tgl" title="켜기/끄기"><input type="checkbox" data-sched-toggle="${x.id}" ${x.enabled ? 'checked' : ''}><span></span></label><span class="badge b-${x.type.toLowerCase()}">${TYPE[x.type]}</span><b>${h(x.name || TYPE[x.type])}</b></div>
      <p>${daysText(x.days)} · ${x.slot_ids.map(id => h(slotName(id))).join('·')} · ${leadText(x.lead_days, x.open_time)} 오픈 · ${x.duration_min ? `${x.duration_min}분 진행` : '슬롯 마감까지'} · ${discText(x)}${x.quantity ? ` · ${x.quantity}건 한정` : ''}${x.only_vacant ? ' · 비어 있을 때만' : ''}</p>
      <p class="mini">기간 ${h(x.start_date || '')} ~ ${h(x.end_date || '계속')}${x.skip_dates.length ? ` · 쉬는 날 ${x.skip_dates.length}일` : ''} · 만들어진 딜 ${x.runs}건(예정 포함) · 받은 코드 ${x.claimed}건</p>
      ${x.enabled ? (x.next.length ? `<div class="sched-next">${x.next.map(n => `<span>${md(n.date)} 이용 · ${h(n.startsAt.slice(5, 16).replace('-', '/').replace('T', ' '))} 오픈${n.prices[0] ? ` · <b>${won(n.prices[0].price)}</b>` : ''}</span>`).join('')}</div>` : '<p class="mini warn">앞으로 4주 안에 열릴 날이 없어요. 요일·기간을 확인하거나, "비어 있을 때만"이면 반복 공실을 열어 주세요.</p>') : ''}
      <div class="ops"><button type="button" class="btn btn-o" data-sched-edit="${x.id}">수정</button><button type="button" class="btn btn-o" data-sched-dup="${x.id}">복제</button><button type="button" class="btn btn-o" data-sched-del="${x.id}">삭제</button></div></div>`;
    const ck = (name, val, on, label) => `<label><input type="checkbox" name="${name}" value="${val}" ${on ? 'checked' : ''}>${label}</label>`;
    return `${canMake ? '' : '<div class="issues">공간이 공개(승인)된 뒤부터 반복 딜이 실제로 열립니다. 미리 만들어 둘 수는 있습니다.</div>'}
    <div class="split"><div class="panel"><h2>${S.schedEdit ? '반복 딜 수정' : '반복 딜 만들기'}</h2>
      ${S.schedEdit ? '' : `<div class="actions" style="margin-bottom:10px"><span class="mini">자주 쓰는 형태</span>${Object.entries({ weekdayTime: '평일 오후 타임딜', nightFlash: '저녁 반짝딜', earlyHot: '이틀 전 핫딜', sameDay: '요일 당일 특가', event: '이벤트' }).map(([k, l]) => `<button type="button" class="btn btn-o" data-sched-tpl="${k}">${l}</button>`).join('')}</div>`}
      <form class="form" data-form="schedule" data-id="${S.schedEdit ? S.schedEdit.id : ''}">
        <div class="row"><label>이름<input name="name" value="${h(e.name || '')}" maxlength="40" placeholder="예: 평일 오후 타임딜"></label>
        <label>유형<select name="type">${['TIME', 'HOT', 'FLASH', 'EVENT', 'TODAY', 'TOMORROW'].map(t => `<option value="${t}" ${e.type === t ? 'selected' : ''}>${{ TIME: '타임딜 — 정한 시간에만', HOT: '핫딜 — 크게 내린 특가', FLASH: '반짝딜 — 1~3시간, 1~2건', EVENT: '이벤트 — 혜택', TODAY: '당일 할인', TOMORROW: '전날 할인' }[t]}</option>`).join('')}</select></label></div>
        <label>반복 요일 (이용일 기준) <span class="mini"><button type="button" class="link" data-days-preset="all">매일</button> · <button type="button" class="link" data-days-preset="weekday">평일</button> · <button type="button" class="link" data-days-preset="monthu">월~목</button> · <button type="button" class="link" data-days-preset="weekend">주말</button></span><div class="toggle-chips" data-days>${WEEK.map(d => ck('days', d, (e.days || []).map(Number).includes(d), DOW[d])).join('')}</div></label>
        <label>대상 슬롯<div class="toggle-chips">${s.slots.map(sl => ck('slot_ids', sl.id, (e.slot_ids || []).map(Number).includes(sl.id), `${h(sl.name)} ${h(sl.start_time)}~${h(sl.end_time)}`)).join('')}</div></label>
        <div class="row3"><label>여는 날<select name="lead_days">${[0, 1, 2, 3, 7].map(n => `<option value="${n}" ${Number(e.lead_days) === n ? 'selected' : ''}>${n === 0 ? '이용일 당일' : `이용일 ${n}일 전`}</option>`).join('')}</select></label>
        <label>여는 시각<input type="time" name="open_time" value="${h(e.open_time || '14:00')}"></label>
        <label>진행 시간<select name="duration_min">${[['', '슬롯 마감까지'], [60, '1시간'], [120, '2시간'], [180, '3시간'], [240, '4시간'], [360, '6시간'], [720, '12시간']].map(([v, l]) => `<option value="${v}" ${String(e.duration_min ?? '') === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
        <div class="row3" data-disc><label>할인 방식<select name="discount_mode"><option value="RATE" ${e.discount_mode === 'RATE' ? 'selected' : ''}>정률(%)</option><option value="AMOUNT" ${e.discount_mode === 'AMOUNT' ? 'selected' : ''}>정액(원 할인)</option><option value="FIXED" ${e.discount_mode === 'FIXED' ? 'selected' : ''}>특가(원)</option></select></label><label>값<input type="number" name="discount_value" value="${h(e.discount_value ?? '')}"></label><label>바닥가(선택)<input type="number" step="1000" name="floor_price" value="${h(e.floor_price || '')}"></label></div>
        <label data-benefit>혜택 내용<input name="benefit_text" value="${h(e.benefit_text || '')}" placeholder="예: 생일 케이크 증정 / 1시간 연장 무료"></label>
        <div class="row"><label>수량(선택, 비우면 제한 없음)<input type="number" name="quantity" min="1" value="${h(e.quantity ?? '')}"></label><label class="inline" style="align-self:end"><input type="checkbox" name="only_vacant" ${e.only_vacant === 0 || e.only_vacant === false ? '' : 'checked'}> 비어 있는 칸에만 열기 (권장)</label></div>
        <div class="row"><label>시작일<input type="date" name="start_date" value="${h(e.start_date || today())}"></label><label>종료일(선택)<input type="date" name="end_date" value="${h(e.end_date || '')}"></label></div>
        <label>쉬는 날(선택) <span class="mini">이 날짜엔 열지 않음 · 쉼표로 구분</span><input name="skip_dates" value="${h((e.skip_dates || []).join(', '))}" placeholder="2026-12-24, 2026-12-31"></label>
        <label>딜 전용 링크(선택)<input name="deal_link" value="${h(e.deal_link || '')}" placeholder="https://... (없으면 공간의 딜 전용 링크)"></label>
        <div class="preview" data-sched-preview></div>
        <p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">${S.schedEdit ? '수정 저장' : '반복 딜 저장'}</button>${S.schedEdit ? '<button type="button" class="btn btn-o" data-sched-cancel>취소</button>' : ''}</div>
      </form></div>
      <div class="panel"><h2>내 반복 딜 <span class="mini">${r.schedules.filter(x => x.enabled).length}개 켜짐</span></h2>
        ${r.schedules.length ? r.schedules.map(item).join('') : '<p class="muted">아직 없어요. 왼쪽에서 "자주 쓰는 형태"를 눌러 시작해 보세요.</p>'}
        <p class="hint">반복 딜은 열리기 열흘 전부터 미리 만들어지고, 예약된 칸에는 열리지 않습니다. 같은 칸에 여러 딜이 겹치면 반짝 > 타임딜 > 핫딜 > 당일 > 전날 순으로 하나만 보입니다.</p></div></div>`;
  }
  function bindSchedules(s) {
    const f = $('[data-form=schedule]'); if (!f) return;
    const upd = () => {
      const o = fd2obj(f); const type = o.type;
      $('[data-benefit]', f).style.display = type === 'EVENT' ? '' : 'none';
      $('[data-disc]', f).style.display = type === 'EVENT' ? 'none' : '';
      f.lead_days.disabled = type === 'TODAY' || type === 'TOMORROW';
      if (type === 'TODAY') f.lead_days.value = '0'; if (type === 'TOMORROW') f.lead_days.value = '1';
      const days = arr(o.days).map(Number), slots = arr(o.slot_ids).map(Number), lead = Number(f.lead_days.value || 0);
      const skip = String(o.skip_dates || '').split(/[\s,]+/).filter(Boolean);
      const lines = []; let warn = '';
      if (type === 'TIME' && !o.duration_min) warn = '타임딜은 진행 시간을 정해야 합니다.';
      if (type === 'FLASH' && (!o.duration_min || Number(o.duration_min) > 180)) warn = '반짝딜은 1~3시간만 열립니다(저장 시 자동으로 맞춤).';
      for (let d = o.start_date || today(); lines.length < 4 && d <= addDays(today(), 40); d = addDays(d, 1)) {
        if (d < today() || !days.includes(dow(d)) || skip.includes(d) || (o.end_date && d > o.end_date)) continue;
        const open = `${addDays(d, -lead)} ${o.open_time || ''}`;
        const ps = slots.map(id => { const sl = s.slots.find(x => x.id === id); if (!sl) return ''; const b = basePrice(sl, d); const p = type === 'EVENT' ? b : calcPrice(b, o.discount_mode, Number(o.discount_value || 0), Number(o.floor_price || 0)); return `${h(sl.name)} <s>${won(b)}</s> <b>${won(p)}</b>`; }).filter(Boolean).join(' / ');
        lines.push(`<div>${md(d)} 이용 · ${h(open.slice(5).replace('-', '/'))} 오픈 · ${ps || '슬롯을 고르세요'}</div>`);
      }
      $('[data-sched-preview]', f).innerHTML = `<b>다음 오픈 예정 (공실 여부 제외한 예상)</b>${lines.join('') || '<div class="mini">조건에 맞는 날이 없어요.</div>'}${warn ? `<div class="mini warn">${warn}</div>` : ''}`;
    };
    f.addEventListener('change', upd); f.addEventListener('input', upd); upd();
  }
  function fillSchedForm(t) {
    S.schedPrefill = { ...t, slot_ids: t.slot_ids || (S.space.slots[0] ? [S.space.slots[0].id] : []), start_date: today(), only_vacant: t.only_vacant === false ? 0 : 1 };
    S.schedEdit = null; renderSpace(S.space.id, 'schedules');
  }

  /* ---- 캘린더 ---- */
  let calFrom = today(), calVac = new Map(), calPat = {};
  const patDefault = (slotId, d) => ((calPat[slotId] || [])[dow(d)] || '');
  const effCell = (slotId, d) => { const v = calVac.get(`${slotId}|${d}`); if (v) return { st: v.status, src: v.source || 'manual' }; const p = patDefault(slotId, d); return { st: p, src: p ? 'pattern' : '' }; };
  const cellInner = (st, src) => `${ST_LABEL[st || '']}${src === 'pattern' ? '<i>반복</i>' : src === 'ical' ? '<i>연동</i>' : ''}`;
  async function tabCalendar(s) {
    const to = addDays(calFrom, 13);
    const r = await api(`/api/host/spaces/${s.id}/vacancies?from=${calFrom}&to=${to}`);
    calVac = new Map(r.vacancies.map(v => [`${v.slot_id}|${v.date}`, v]));
    calPat = r.pattern || {};
    const hasPat = Object.values(calPat).some(row => row.some(Boolean));
    const days = Array.from({ length: 14 }, (_, i) => addDays(calFrom, i));
    const t = today();
    return `<div class="panel"><h2>공실 캘린더 <span class="mini">칸을 탭하면 상태가 바뀝니다 · 예약이 들어오면 '예약됨'으로</span></h2>
      ${!s.slots.length ? '<div class="issues">먼저 "요금" 탭에서 슬롯을 등록하세요.</div>' : ''}
      ${r.paused_until && r.paused_until >= t ? `<div class="issues">${h(r.paused_until)}까지 자동 운영이 일시정지 중입니다. <a href="#space/${s.id}/auto">자동 운영에서 해제</a></div>` : ''}
      ${hasPat ? '' : `<div class="tip">매주 비슷하게 비는 시간이 있다면 <a href="#space/${s.id}/pattern"><b>반복 공실</b></a>로 한 번만 정해 두세요. 매일 캘린더를 누르지 않아도 됩니다.</div>`}
      <div class="actions" style="margin-bottom:8px"><button type="button" class="btn btn-o" data-cal="prev">‹ 2주 전</button><button type="button" class="btn btn-o" data-cal="today">오늘</button><button type="button" class="btn btn-o" data-cal="next">2주 후 ›</button></div>
      <div class="cal"><table><thead><tr><th></th>${days.map(d => `<th class="${d === t ? 'today' : ''} ${isRed(d) ? 'we' : ''}">${d.slice(5).replace('-', '/')}<br>${DOW[dow(d)]}</th>`).join('')}</tr></thead><tbody>
      ${s.slots.map(sl => `<tr><td class="lbl">${h(sl.name)}<br><small class="mini">${h(sl.start_time)}~${h(sl.end_time)}</small></td>${days.map(d => { const c = effCell(sl.id, d); const past = d < t; return `<td><div class="cell ${c.st} ${c.src === 'pattern' ? 'from-pat' : ''} ${past ? 'past' : ''}" data-cell data-slot="${sl.id}" data-date="${d}">${cellInner(c.st, c.src)}</div></td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div>
      <div class="legend"><span><i style="background:var(--tint);border-color:var(--point)"></i>비어 있음 → 자동 할인 대상</span><span><i style="background:#E5E7EB"></i>예약됨</span><span><i></i>미정(노출 안 함)</span><span><i style="background:repeating-linear-gradient(45deg,#fff,#fff 3px,#eee 3px,#eee 6px)"></i>휴무</span><span><small class="tag">반복</small> 반복 공실 기본값</span><span><small class="tag">연동</small> 캘린더 연동</span></div>
      <h3>일괄 설정</h3><form class="form" data-form="bulk"><div class="row3"><label>슬롯<select name="slot_id"><option value="all">전체</option>${s.slots.map(sl => `<option value="${sl.id}">${h(sl.name)}</option>`).join('')}</select></label><label>요일<div class="toggle-chips">${WEEK.map(i => `<label><input type="checkbox" name="days" value="${i}" ${i >= 1 && i <= 5 ? 'checked' : ''}>${DOW[i]}</label>`).join('')}</div></label><label>상태<select name="status"><option value="vacant">비어 있음</option><option value="booked">예약됨</option><option value="closed">휴무</option><option value="clear">반복 공실 기본값으로 되돌리기</option></select></label></div><div class="row"><label>시작일<input type="date" name="from" value="${t}"></label><label>종료일<input type="date" name="to" value="${addDays(t, 13)}"></label></div><p class="hint">특정 기간만 다르게 운영할 때 쓰세요. 매주 반복되는 일정은 <a href="#space/${s.id}/pattern">반복 공실</a>에서 정하는 편이 훨씬 편합니다.</p><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">적용</button></div></form></div>`;
  }
  function bindCalendar(s) {
    $$('[data-cell]').forEach(c => c.addEventListener('click', async () => {
      if (c.classList.contains('past') || c.dataset.busy) return;
      const slotId = Number(c.dataset.slot), d = c.dataset.date;
      const def = patDefault(slotId, d);
      const cur = effCell(slotId, d).st;
      const order = def ? ['vacant', 'booked', 'closed'] : ['', 'vacant', 'booked', 'closed'];
      const next = order[(order.indexOf(cur) + 1) % order.length];
      const send = next === def ? 'clear' : next;
      c.dataset.busy = '1';
      try {
        await api(`/api/host/spaces/${s.id}/vacancies`, { method: 'PUT', body: { items: [{ slot_id: slotId, date: d, status: send }] } });
        if (send === 'clear') calVac.delete(`${slotId}|${d}`); else calVac.set(`${slotId}|${d}`, { status: next, source: 'manual' });
        const e = effCell(slotId, d);
        c.className = `cell ${e.st} ${e.src === 'pattern' ? 'from-pat' : ''}`;
        c.innerHTML = cellInner(e.st, e.src);
        if (next === 'booked') toast('예약됨으로 바꿨어요. 이 칸의 할인은 바로 내려갑니다.');
      } catch (e) { toast(e.message); }
      finally { delete c.dataset.busy; }
    }));
  }

  /* ---- 오토딜 ---- */
  function tabAutorule(s) {
    const r = s.rule || { enabled: 0, tomorrow_rate: 15, today_rate: 25, steps: [], floors: {}, exclude_days: [5, 6], exclude_slots: [], monthly_cap: 20 };
    const steps = r.steps || [];
    return `<div class="panel"><h2>자동 할인(오토딜) <span class="mini">공실이 전날·당일이 되면 자동으로 딜이 열립니다</span></h2>
      <p class="hint">자동 할인은 '비어 있음' 칸에만 붙습니다. 매주 비는 칸은 <a href="#space/${s.id}/pattern">반복 공실</a>에서 한 번만 열어 두면 됩니다.</p>
      <div class="presets"><span class="mini">추천값으로 채우기</span>
        <button type="button" class="preset" data-autopreset="safe"><b>보수형</b><small>전날 10% · 당일 20%</small></button>
        <button type="button" class="preset" data-autopreset="basic"><b>기본형</b><small>전날 15% · 당일 25% · 14시 이후 35%</small></button>
        <button type="button" class="preset" data-autopreset="bold"><b>적극형</b><small>전날 20% · 당일 35% · 15시 이후 45%</small></button></div>
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
    const row = d => `<div class="deal-row ${d.status === 'ENDED' ? 'ended' : ''}"><div class="b"><span class="badge b-${d.type.toLowerCase()}">${TYPE[d.type]}</span> <span class="pill ${d.status === 'ACTIVE' ? 'ok' : d.status === 'SCHEDULED' ? 'info' : ''}">${{ ACTIVE: '진행 중', SCHEDULED: '예정', ENDED: '종료' }[d.status]}${d.end_reason ? ` · ${{ EXPIRED: '시간 만료', SOLD_OUT: '매진', HOST_CANCELLED: '직접 종료', ADMIN_STOPPED: '운영 중지', SLOT_BOOKED: '예약됨', REPLACED: '대체', SCHEDULE_OFF: '반복 꺼짐' }[d.end_reason] || d.end_reason}` : ''}</span>${d.origin && d.origin !== 'MANUAL' ? ` <span class="pill pt">${ORIGIN[d.origin] || d.origin}</span>` : ''}
        <b>${h(d.title || TYPE[d.type])}</b>${d.type === 'EVENT' ? h(d.benefit_text) : `${d.discount_mode === 'RATE' ? d.discount_value + '% 할인' : d.discount_mode === 'AMOUNT' ? won(d.discount_value) + ' 할인' : won(d.discount_value) + ' 특가'}${d.floor_price ? ` · 바닥가 ${won(d.floor_price)}` : ''}`}
        <br><span class="mini">대상: ${(d.targets || []).slice(0, 4).map(t => `${t.date.slice(5).replace('-', '/')} ${h(slotName(t.slot_id))}`).join(', ')}${d.targets.length > 4 ? ` 외 ${d.targets.length - 4}` : ''} · ${h(d.starts_at.replace('T', ' '))} ~ ${h(d.ends_at.replace('T', ' '))}${d.quantity != null ? ` · 수량 ${d.claimed}/${d.quantity}` : ''} · 코드 ${d.claim_n || 0}건(사용 ${d.used_n || 0})</span></div>
        <div class="ops">${d.status !== 'ENDED' ? `${d.type !== 'EVENT' ? `<button type="button" class="btn btn-o" data-deal="raise" data-id="${d.id}" data-mode="${d.discount_mode}" data-val="${d.discount_value}">할인 올리기</button>` : ''}<button type="button" class="btn btn-o" data-deal="qty" data-id="${d.id}" data-q="${d.quantity ?? ''}">수량</button><button type="button" class="btn btn-o" data-deal="end" data-id="${d.id}">종료</button>` : ''}${d.origin === 'MANUAL' || !d.origin ? `<button type="button" class="btn btn-o" data-deal="repeat" data-id="${d.id}" title="같은 조건으로 매주 자동으로 열기">매주 반복</button>` : ''}</div></div>`;
    const open = r.deals.filter(d => d.status !== 'ENDED');
    const fromSched = open.filter(d => d.origin === 'SCHEDULE' && d.status === 'SCHEDULED');
    const openList = open.filter(d => !fromSched.includes(d));
    const autoRow = a => `<div class="deal-row"><div class="b"><span class="badge b-${a.type.toLowerCase()}">${TYPE[a.type]}</span> <span class="pill pt">자동(공실 기반)</span><b>${a.targets.map(t => `${t.date.slice(5).replace('-', '/')} ${h(t.slot)} ${won(t.price)} (${t.rate}%)`).join(', ')}</b><span class="mini">${h(a.ends_at.replace('T', ' '))}까지 노출 · 손님이 받으면 코드가 발급됩니다. 끄려면 캘린더에서 칸을 바꾸거나 자동 할인을 조정하세요.</span></div></div>`;
    const next14 = Array.from({ length: 14 }, (_, i) => addDays(today(), i));
    const vac = await api(`/api/host/spaces/${s.id}/vacancies?from=${today()}&to=${addDays(today(), 13)}`);
    const vmap = new Map(vac.vacancies.map(v => [`${v.slot_id}|${v.date}`, v.status]));
    for (const d of next14) for (const sl of s.slots) { const k = `${sl.id}|${d}`; if (!vmap.has(k)) { const p = ((vac.pattern || {})[sl.id] || [])[dow(d)]; if (p) vmap.set(k, p); } }
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
      <div><div class="panel"><h2>진행 · 예정 <span class="mini">${openList.length + r.auto.length}건</span></h2>${fromSched.length ? `<div class="tip">반복 딜이 앞으로 열릴 딜 <b>${fromSched.length}건</b>을 미리 준비해 두었습니다. <a href="#space/${s.id}/schedules">반복 딜에서 관리</a></div>` : ''}${r.auto.map(autoRow).join('')}${openList.map(row).join('') || (r.auto.length || fromSched.length ? '' : '<p class="muted">진행 중인 딜이 없어요.</p>')}</div>
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
      const lines = targets.slice(0, 6).map(v => { const [d, sid] = v.split('|'); const sl = s.slots.find(x => x.id === Number(sid)); if (!sl) return ''; const base = basePrice(sl, d); let p = base; if (type !== 'EVENT' && val) { p = mode === 'RATE' ? base * (100 - val) / 100 : mode === 'AMOUNT' ? base - val : val; p = Math.round(p / 1000) * 1000; if (floor && p < floor) p = floor; p = Math.min(p, base); } const rate = base ? Math.round((base - p) / base * 100) : 0; return `<div>${d.slice(5).replace('-', '/')} ${h(sl.name)} · <s>${won(base)}</s> <b style="color:var(--point)">${won(p)}</b> ${rate ? `<span class="p-rate">${rate}%</span>` : ''}</div>`; }).join('');
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
      <div class="panel"><h2>딜 유형별 성과 (30일)</h2><table class="stat-tbl"><thead><tr><th>유형</th><th>출처</th><th>딜 수</th><th>코드 발급</th><th>사용</th></tr></thead><tbody>${(r.byType || []).map(b => `<tr><td>${TYPE[b.type] || b.type}</td><td>${b.origin === 'AUTO' ? '자동' : b.origin === 'SCHEDULE' ? '반복' : '수동'}</td><td>${b.deals}</td><td>${b.claims}</td><td>${b.used || 0}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">데이터 없음</td></tr>'}</tbody></table><p class="mini">30일 코드 ${r.claims?.n || 0}건 발급, ${r.claims?.used || 0}건 사용 처리. 구독료 대비 효과를 판단하는 기준으로 쓰세요.</p></div>`;
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
      else if (kind === 'pause') {
        if (!o.paused_until) throw new Error('멈출 마지막 날짜를 고르세요.');
        await api(`/api/host/spaces/${sid}/automation`, { method: 'PUT', body: { paused_until: o.paused_until, pause_note: o.pause_note } });
        toast(`${o.paused_until}까지 자동 운영을 멈췄어요.`); renderSpace(sid, 'auto');
      }
      else if (kind === 'copy') {
        const to = arr(o.to).map(Number), parts = arr(o.parts);
        if (!to.length) throw new Error('복사할 공간을 고르세요.');
        if (!parts.length) throw new Error('복사할 항목을 고르세요.');
        if (!confirm(`선택한 ${to.length}개 공간에 이 공간의 ${parts.map(x => ({ rule: '자동 할인율', pattern: '반복 공실', schedules: '반복 딜' }[x])).join('·')} 설정을 복사할까요?\n자동 할인율과 반복 공실은 덮어쓰고, 반복 딜은 새로 추가됩니다.`)) return;
        const r = await api(`/api/host/spaces/${sid}/automation/copy`, { method: 'POST', body: { to, parts } });
        msg.textContent = '복사했어요. ' + (r.result || []).map(x => `${x.name}: ${x.copied.length ? x.copied.join(', ') : '바뀐 항목 없음'}`).join(' / '); msg.classList.add('ok');
        S.spaces = null;
      }
      else if (kind === 'ical') {
        const r = await api(`/api/host/spaces/${sid}/automation`, { method: 'PUT', body: { ical_url: o.ical_url || '', ical_allday: !!o.ical_allday } });
        toast(r.sync ? `저장했어요. ${r.sync.message || ''}` : (o.ical_url ? '저장했어요.' : '연동을 해제했어요.')); renderSpace(sid, 'pattern');
      }
      else if (kind === 'schedule') {
        const body = { name: o.name, type: o.type, days: arr(o.days).map(Number), slot_ids: arr(o.slot_ids).map(Number), lead_days: o.lead_days, open_time: o.open_time, duration_min: o.duration_min, discount_mode: o.discount_mode, discount_value: o.discount_value, floor_price: o.floor_price, benefit_text: o.benefit_text, quantity: o.quantity, only_vacant: !!o.only_vacant, start_date: o.start_date, end_date: o.end_date, skip_dates: o.skip_dates, deal_link: o.deal_link };
        const id = f.dataset.id;
        const r = id ? await api(`/api/host/schedules/${id}`, { method: 'PUT', body }) : await api(`/api/host/spaces/${sid}/schedules`, { method: 'POST', body });
        S.schedEdit = null;
        toast(id ? '반복 딜을 수정했어요.' : `반복 딜을 저장했어요.${r.made ? ` 다가오는 딜 ${r.made}건을 미리 준비했습니다.` : ''}`);
        renderSpace(sid, 'schedules');
      }
      else if (kind === 'subrequest') { const r = await api(`/api/host/spaces/${sid}/subscription`, { method: 'POST', body: { action: 'request', memo: o.memo } }); msg.textContent = r.message; msg.classList.add('ok'); }
      else if (kind === 'account') { await api('/api/host/me', { method: 'PUT', body: o }); msg.textContent = '저장했어요.'; msg.classList.add('ok'); }
    } catch (err) { if (msg) { msg.textContent = err.message + (err.data?.issues ? ' ' + err.data.issues.join(' ') : ''); } else toast(err.message); }
    finally { if (btn) btn.disabled = false; }
  });
  document.addEventListener('click', async e => {
    const go = e.target.closest('[data-go]'); if (go && !e.target.closest('a')) { location.hash = go.dataset.go.replace(/^#/, ''); return; }
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
    /* 자동 운영 */
    const au = e.target.closest('[data-auto]'); if (au && au.dataset.auto === 'resume') {
      try { await api(`/api/host/spaces/${sid}/automation`, { method: 'PUT', body: { paused_until: '' } }); toast('자동 운영을 다시 시작했어요.'); renderSpace(sid, 'auto'); } catch (err) { toast(err.message); }
    }
    const pd = e.target.closest('[data-pause-days]'); if (pd) { const f = pd.closest('form'); f.paused_until.value = addDays(today(), Number(pd.dataset.pauseDays)); }
    const pb = e.target.closest('[data-pat]'); if (pb) {
      const row = S.pat[pb.dataset.slot]; const d = Number(pb.dataset.dow);
      const next = { '': 'vacant', vacant: 'closed', closed: '' }[row[d] || ''];
      row[d] = next; pb.className = `pat ${next || 'none'}`; pb.textContent = next === 'vacant' ? '비어 있음' : next === 'closed' ? '휴무' : '정하지 않음';
      patSummary();
    }
    const pr = e.target.closest('[data-preset]'); if (pr && S.pat) {
      const slots = S.space.slots; const k = pr.dataset.preset;
      slots.forEach((sl, i) => {
        const row = S.pat[sl.id];
        for (let d = 0; d < 7; d++) {
          if (k === 'all') row[d] = 'vacant';
          if (k === 'weekday') row[d] = d >= 1 && d <= 4 ? 'vacant' : row[d] === 'vacant' ? '' : row[d];
          if (k === 'weekdayFirst') row[d] = d >= 1 && d <= 5 && i === 0 ? 'vacant' : '';
          if (k === 'weekendClosed' && (d === 0 || d === 6)) row[d] = '';
          if (k === 'clear') row[d] = '';
        }
      });
      $$('[data-pat]').forEach(b => { const v = S.pat[b.dataset.slot][Number(b.dataset.dow)]; b.className = `pat ${v || 'none'}`; b.textContent = v === 'vacant' ? '비어 있음' : v === 'closed' ? '휴무' : '정하지 않음'; });
      patSummary();
    }
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'pattern-save') {
      act.disabled = true;
      try { const r = await api(`/api/host/spaces/${sid}/automation`, { method: 'PUT', body: { pattern: S.pat } }); toast(`반복 공실을 저장했어요. 매주 ${r.automation.open_cells}칸이 자동으로 열립니다.`); renderSpace(sid, 'pattern'); }
      catch (err) { toast(err.message); act.disabled = false; }
    }
    if (act && act.dataset.act === 'photo-import') {
      act.disabled = true; act.textContent = '옮기는 중…';
      let moved = 0, failed = 0;
      try {
        for (let i = 0; i < 10; i++) { const r = await api(`/api/host/spaces/${sid}/photos/import`, { method: 'POST' }); moved += r.moved; failed += r.failed; if (!r.remaining || (!r.moved && !r.failed)) break; }
        toast(`${moved}장을 옮겼어요.${failed ? ` ${failed}장은 원래 사이트에서 받지 못해 링크로 남겨 뒀어요.` : ''}`);
      } catch (err) { toast(err.message); }
      renderSpace(sid, 'photos');
    }
    /* 홈 오늘·내일 표 */
    const bd = e.target.closest('[data-bd]'); if (bd) {
      const sp = (S.board || []).find(x => x.id === Number(bd.dataset.space));
      await cycleCell(bd, bd.dataset.space, bd.dataset.slot, bd.dataset.date, sp ? sp.pattern : {}, renderBoard);
    }
    /* 공간 '오늘' 화면 */
    const td = e.target.closest('[data-td]'); if (td && !td.classList.contains('on')) {
      const v = td.dataset.td, def = td.dataset.def || '';
      td.parentElement.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try {
        await api(`/api/host/spaces/${sid}/vacancies`, { method: 'PUT', body: { items: [{ slot_id: Number(td.dataset.slot), date: td.dataset.date, status: v === def ? 'clear' : v }] } });
        toast(v === 'booked' ? '예약됨으로 바꿨어요. 이 칸의 할인은 바로 내려갑니다.' : v === 'vacant' ? '비어 있음으로 바꿨어요. 할인 조건에 맞으면 곧 노출돼요.' : '휴무로 바꿨어요.');
      } catch (err) { toast(err.message); }
      renderSpace(sid, 'today');
    }
    const fl = e.target.closest('[data-flash]'); if (fl) {
      const sl = S.space.slots.find(x => x.id === Number(fl.dataset.flash));
      if (confirm(`오늘 ${sl ? sl.name : ''} 반짝딜을 지금부터 2시간 동안 30% 할인으로 열까요?\n(반짝딜은 하루 2번까지, 1건 한정이에요)`)) {
        try { await api(`/api/host/spaces/${sid}/deals`, { method: 'POST', body: { type: 'FLASH', targets: [{ date: today(), slot_id: Number(fl.dataset.flash) }], discount_mode: 'RATE', discount_value: 30, duration_min: 120, quantity: 1 } }); toast('반짝딜을 열었어요. 손님 화면 맨 위에 보여요.'); renderSpace(sid, 'today'); }
        catch (err) { toast(err.message); }
      }
    }
    const stpl = e.target.closest('[data-slot-tpl]'); if (stpl) { $('[data-slot-body]').innerHTML = SLOT_TPL[stpl.dataset.slotTpl].map(slotRow).join(''); toast('시간을 채웠어요. 요금을 넣고 저장하세요.'); }
    if (act && act.dataset.act === 'ical-sync') {
      act.disabled = true;
      try { const r = await api(`/api/host/spaces/${sid}/automation/sync`, { method: 'POST' }); toast(r.message || '동기화했어요.'); renderSpace(sid, 'pattern'); }
      catch (err) { toast(err.data?.message || err.message); act.disabled = false; }
    }
    const ap = e.target.closest('[data-autopreset]'); if (ap) {
      const f = $('[data-form=autorule]'); const P = { safe: [10, 20, '', ''], basic: [15, 25, '14:00', 35], bold: [20, 35, '15:00', 45] }[ap.dataset.autopreset];
      f.enabled.checked = true; f.tomorrow_rate.value = P[0]; f.today_rate.value = P[1];
      f.step_from_0.value = P[2]; f.step_rate_0.value = P[3]; f.step_from_1.value = ''; f.step_rate_1.value = ''; f.step_from_2.value = ''; f.step_rate_2.value = '';
      $$('.preset').forEach(b => b.classList.toggle('on', b === ap));
      toast('값을 채웠어요. 바닥가를 확인하고 저장을 누르세요.');
    }
    /* 반복 딜 */
    const st = e.target.closest('[data-sched-tpl]'); if (st) fillSchedForm(SCHED_TPL[st.dataset.schedTpl]);
    const dp = e.target.closest('[data-days-preset]'); if (dp) {
      const set = { all: [0, 1, 2, 3, 4, 5, 6], weekday: [1, 2, 3, 4, 5], monthu: [1, 2, 3, 4], weekend: [0, 6] }[dp.dataset.daysPreset];
      $$('[data-days] input').forEach(i => { i.checked = set.includes(Number(i.value)); }); i_dispatch(dp);
    }
    const se = e.target.closest('[data-sched-edit]'); if (se) { S.schedEdit = (S.schedList || []).find(x => x.id === Number(se.dataset.schedEdit)) || null; renderSpace(sid, 'schedules').then(() => window.scrollTo({ top: 0, behavior: 'smooth' })); }
    const sdup = e.target.closest('[data-sched-dup]'); if (sdup) { const x = (S.schedList || []).find(y => y.id === Number(sdup.dataset.schedDup)); if (x) { const { id, ...rest } = x; S.schedEdit = null; S.schedPrefill = { ...rest, name: `${x.name || TYPE[x.type]} (복사)`, enabled: 1 }; renderSpace(sid, 'schedules').then(() => window.scrollTo({ top: 0, behavior: 'smooth' })); } }
    if (e.target.closest('[data-sched-cancel]')) { S.schedEdit = null; renderSpace(sid, 'schedules'); }
    const sdel = e.target.closest('[data-sched-del]'); if (sdel) {
      if (confirm('이 반복 딜을 삭제할까요? 아직 열리지 않은 딜도 함께 지워집니다. 이미 발급된 딜 코드는 그대로 유지됩니다.')) {
        try { await api(`/api/host/schedules/${sdel.dataset.schedDel}`, { method: 'DELETE' }); S.schedEdit = null; toast('삭제했어요.'); renderSpace(sid, 'schedules'); } catch (err) { toast(err.message); }
      }
    }
    const rp = e.target.closest('[data-deal="repeat"]'); if (rp) {
      const d = (dealsCache?.deals || []).find(x => x.id === Number(rp.dataset.id)); if (!d) return;
      const tg = d.targets || [];
      const first = tg.map(t => t.date).sort()[0] || today();
      const startDay = (d.starts_at || '').slice(0, 10) || first;
      const lead = Math.max(0, Math.min(7, Math.round((new Date(first + 'T00:00:00Z') - new Date(startDay + 'T00:00:00Z')) / 86400000)));
      const dur = d.starts_at && d.ends_at && ['TIME', 'FLASH'].includes(d.type) ? Math.round((new Date(d.ends_at + ':00Z') - new Date(d.starts_at + ':00Z')) / 60000) : '';
      const pick = v => [60, 120, 180, 240, 360, 720].reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, 180);
      S.schedEdit = null;
      S.schedPrefill = { name: d.title || '', type: d.type, days: [...new Set(tg.map(t => dow(t.date)))], slot_ids: [...new Set(tg.map(t => Number(t.slot_id)))], lead_days: [0, 1, 2, 3, 7].includes(lead) ? lead : 0, open_time: (d.starts_at || '').slice(11, 16) || '10:00', duration_min: dur ? pick(dur) : '', discount_mode: d.discount_mode, discount_value: d.discount_value, floor_price: d.floor_price, quantity: d.quantity, benefit_text: d.benefit_text, only_vacant: 1, start_date: today() };
      location.hash = `space/${sid}/schedules`;
      toast('이 딜 조건을 채워 두었어요. 요일과 시각을 확인하고 저장하세요.');
    }
  });
  const i_dispatch = el => { const f = el.closest('form'); if (f) f.dispatchEvent(new Event('change')); };
  document.addEventListener('change', async e => {
    const sw = e.target.closest('[data-sp-switch]'); if (sw) { if (sw.value) location.hash = `space/${sw.value}/${S.tab || ''}`; return; }
    const dp = e.target.closest('[data-dp-toggle]'); if (dp) {
      const t = $('[data-slot-tbl]'); t.classList.toggle('show-dp', dp.checked);
      if (!dp.checked) $$('[data-slot-tbl] .dp input').forEach(i => { i.value = ''; });
      return;
    }
    const tg = e.target.closest('[data-sched-toggle]'); if (!tg) return;
    tg.disabled = true;
    try { const r = await api(`/api/host/schedules/${tg.dataset.schedToggle}`, { method: 'PUT', body: { enabled: tg.checked } }); toast(tg.checked ? `켰어요.${r.made ? ` 다가오는 딜 ${r.made}건을 준비했습니다.` : ''}` : '껐어요. 아직 코드가 발급되지 않은 딜은 함께 내려갑니다.'); renderSpace(S.space.id, 'schedules'); }
    catch (err) { toast(err.message); tg.checked = !tg.checked; tg.disabled = false; }
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
