/* 오늘의파티룸 관리자 */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = n => Number(n || 0).toLocaleString('ko-KR') + '원';
  const TYPE = { TODAY: '당일', TOMORROW: '전날', TIME: '타임딜', HOT: '핫딜', FLASH: '반짝', EVENT: '이벤트' };
  const STATUS = { draft: ['초안', ''], pending: ['검수 대기', 'info'], revision: ['보완 요청', 'warn'], approved: ['공개', 'ok'], rejected: ['반려', 'bad'], hidden: ['비공개', ''] };
  const SUB = { none: ['미결제', 'warn'], trial: ['체험', 'info'], active: ['구독', 'ok'], past_due: ['지연', 'bad'], cancelled: ['해지', ''] };
  const S = { admin: null, regions: null };
  const api = async (url, opt = {}) => {
    const res = await fetch(url, { credentials: 'same-origin', headers: opt.body ? { 'content-type': 'application/json' } : {}, method: opt.method || 'GET', body: opt.body ? JSON.stringify(opt.body) : undefined });
    let d = {}; try { d = await res.json(); } catch { }
    if (!res.ok || d.ok === false) throw new Error(d.error || '요청에 실패했어요.');
    return d;
  };
  const toast = m => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };
  const pill = (map, k) => { const [t, c] = map[k] || [k, '']; return `<span class="pill ${c}">${t}</span>`; };
  const NAV = [['dash', '대시보드'], ['review', '검수'], ['spaces', '공간'], ['hosts', '호스트'], ['deals', '딜 모니터링'], ['reports', '신고·문의'], ['subs', '알림 구독'], ['regions', '지역'], ['themes', '테마'], ['articles', '매거진'], ['settings', '설정']];

  function shell(inner, cur) {
    app.innerHTML = `<header class="c-hdr"><div class="c-hdr-in"><a class="logo" href="#dash"><span class="logo-t">오늘의파티룸</span><span class="logo-dot"></span></a><span class="pill" style="background:var(--navy);color:#fff">관리자</span><div class="who">${S.admin ? `<span>${h(S.admin.name || S.admin.email)}</span><button type="button" data-act="logout">로그아웃</button>` : ''}<a href="/" target="_blank">사이트</a></div></div></header><div class="c-wrap">${S.admin ? `<nav class="a-nav">${NAV.map(([k, l]) => `<a href="#${k}" class="${k === cur ? 'on' : ''}">${l}</a>`).join('')}</nav>` : ''}${inner}</div>`;
  }
  async function route() {
    const [name, id] = (location.hash.replace(/^#/, '').split('?')[0] || 'dash').split('/');
    if (!S.admin) {
      let st;
      try { st = await api('/api/admin/setup'); }
      catch (e) { shell(`<div class="auth-box"><h1>연결 확인이 필요합니다</h1><p class="msg">${h(e.message)}</p><p class="muted">Cloudflare Pages → Settings → Bindings 에 D1 바인딩(변수명 DB)이 있는지, 추가 후 다시 배포했는지 확인하세요.</p></div>`); return; }
      if (st.needs_install) return renderInstall();
      if (st.needs_setup) return renderSetup();
      return renderLogin();
    }
    const views = { dash, review, spaces, hosts, deals, reports, subs, regions, themes, articles, settings, space: spaceDetail, article: articleEdit };
    try { await (views[name] || dash)(id); } catch (e) { shell(`<div class="panel"><p class="msg">${h(e.message)}</p></div>`, name); }
  }
  window.addEventListener('hashchange', route);

  function renderInstall() {
    shell(`<div class="auth-box"><h1>DB 준비하기</h1><p class="muted">연결된 D1 데이터베이스에 오늘의파티룸 테이블과 기본 지역·테마·설정값을 만듭니다. 처음 한 번만 하면 됩니다.</p>
    <form class="form" data-form="install"><label class="inline"><input type="checkbox" name="seed" checked> 샘플 공간 3곳과 매거진 글도 함께 넣기 <span class="mini">(화면 확인용, 나중에 설정 메뉴에서 한 번에 삭제 가능)</span></label><p class="msg"></p><button class="btn btn-p btn-lg" type="submit">DB 준비하기</button></form></div>`);
  }
  function renderSetup() {
    shell(`<div class="auth-box"><h1>최초 관리자 만들기</h1><p class="muted">아직 관리자가 없습니다. 첫 관리자 계정을 만드세요. 이 화면은 한 번만 나타납니다.</p><form class="form" data-form="setup"><label>이름<input name="name" value="관리자"></label><label>이메일<input name="email" type="email" required></label><label>비밀번호 (10자 이상)<input name="password" type="password" minlength="10" required></label><p class="msg"></p><button class="btn btn-p btn-lg" type="submit">만들고 로그인</button></form></div>`);
  }
  function renderLogin() {
    shell(`<div class="auth-box"><h1>관리자 로그인</h1><form class="form" data-form="login"><label>이메일<input name="email" type="email" required></label><label>비밀번호<input name="password" type="password" required></label><p class="msg"></p><button class="btn btn-p btn-lg" type="submit">로그인</button></form></div>`);
  }

  /* ---- 대시보드 ---- */
  async function dash() {
    const d = await api('/api/admin/dashboard');
    const live = d.spaces.filter(x => x.status === 'approved').reduce((a, x) => a + x.n, 0);
    const bars = d.recent.length ? (() => { const m = Math.max(1, ...d.recent.map(r => r.n)); return `<div class="bars">${d.recent.map(r => `<i style="height:${Math.round(r.n / m * 100)}%" title="${r.day} ${r.n}"></i>`).join('')}</div>`; })() : '<p class="muted">데이터 없음</p>';
    shell(`<div class="c-title"><h1>대시보드</h1></div>
    <div class="kpis"><div class="kpi pt"><b>${d.paying}</b><span>유료 구독 공간</span></div><div class="kpi"><b>${d.trial}</b><span>체험 중</span></div><div class="kpi"><b>${live}</b><span>공개 공간</span></div><div class="kpi"><b>${d.pending}</b><span>검수 대기 <a href="#review">›</a></span></div>
    <div class="kpi"><b>${d.hosts.n}</b><span>호스트 (30일 신규 ${d.hosts.new30 || 0})</span></div><div class="kpi"><b>${d.claims.n || 0}</b><span>30일 코드 발급 (사용 ${d.claims.used || 0})</span></div><div class="kpi"><b>${d.subs}</b><span>알림 구독자</span></div><div class="kpi"><b>${d.reports_open}</b><span>미처리 신고 <a href="#reports">›</a></span></div></div>
    <div class="split"><div class="panel"><h2>최근 14일 예약 채널 이동</h2>${bars}<p class="mini">30일 이벤트: 조회 ${d.events.view_space || 0} · 딜 클릭 ${d.events.click_deal || 0} · 채널 이동 ${d.events.click_channel || 0} · 구독 ${d.events.subscribe || 0}</p></div>
    <div class="panel"><h2>7일 내 구독 만료</h2>${d.expiring.length ? `<table class="stat-tbl">${d.expiring.map(x => `<tr><td><a href="#space/${x.id}">${h(x.name)}</a></td><td>${pill(SUB, x.subscription_status)}</td><td>${h(x.subscription_until)}</td></tr>`).join('')}</table>` : '<p class="muted">없음</p>'}</div></div>
    <div class="panel"><h2>30일 딜 생성</h2><table class="stat-tbl"><thead><tr><th>유형</th><th>출처</th><th>상태</th><th>건수</th></tr></thead><tbody>${d.deals.map(x => `<tr><td>${TYPE[x.type] || x.type}</td><td>${x.origin}</td><td>${x.status}</td><td>${x.n}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">없음</td></tr>'}</tbody></table></div>`, 'dash');
  }

  /* ---- 검수 ---- */
  async function review() {
    const r = await api('/api/admin/spaces?status=pending');
    shell(`<div class="c-title"><h1>검수 대기</h1><span class="sub">${r.spaces.length}건</span></div>${table(r.spaces)}`, 'review');
  }
  function table(rows) {
    return `<div class="tbl-wrap"><table class="a-tbl"><thead><tr><th>ID</th><th>공간</th><th>호스트</th><th>지역</th><th>상태</th><th>구독</th><th>사진/슬롯</th><th>수정</th><th></th></tr></thead><tbody>${rows.map(s => `<tr><td>${s.id}</td><td><b>${h(s.name)}</b><br><span class="mini">${h(s.review_note || '')}</span></td><td>${h(s.host_name)}<br><span class="mini">${h(s.host_email)} ${h(s.host_phone)}</span></td><td>${h(s.region_name || '-')}</td><td>${pill(STATUS, s.status)}</td><td>${pill(SUB, s.subscription_status)}<br><span class="mini">${h(s.subscription_until || '')}</span></td><td>${s.photo_n}장 / ${s.slot_n}개</td><td class="mini">${h((s.updated_at || '').slice(0, 10))}</td><td class="ops"><a class="btn btn-o" href="#space/${s.id}">열기</a></td></tr>`).join('') || '<tr><td colspan="9" class="muted">없음</td></tr>'}</tbody></table></div>`;
  }
  async function spaces() {
    const u = new URLSearchParams(location.hash.split('?')[1] || '');
    const status = u.get('status') || '', q = u.get('q') || '';
    const r = await api(`/api/admin/spaces?status=${status}&q=${encodeURIComponent(q)}`);
    shell(`<div class="c-title"><h1>공간</h1><span class="sub">${r.spaces.length}건</span></div><form class="form" data-form="spaces-filter" style="margin-bottom:10px"><div class="row3"><select name="status"><option value="">전체 상태</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === status ? 'selected' : ''}>${v[0]}</option>`).join('')}</select><input name="q" value="${h(q)}" placeholder="공간·호스트·이메일 검색"><button class="btn btn-o" type="submit">검색</button></div></form>${table(r.spaces)}`, 'spaces');
  }
  async function spaceDetail(id) {
    const r = await api(`/api/admin/spaces/${id}`); const s = r.space;
    shell(`<div class="c-title"><a class="btn btn-o" href="#review" style="height:34px;padding:0 10px">‹</a><h1>${h(s.name)}</h1>${pill(STATUS, s.status)}${pill(SUB, s.subscription_status)}<div class="right"><a class="btn btn-o" href="/space/${h(s.slug)}" target="_blank">페이지 보기</a></div></div>
    <div class="split"><div>
      <div class="panel"><h2>자동 검사</h2>${r.issues.length ? `<div class="issues"><ul>${r.issues.map(i => `<li>${h(i)}</li>`).join('')}</ul></div>` : '<div class="issues ok">필수 항목 충족</div>'}${r.duplicates.length ? `<div class="issues">같은 주소의 공간: ${r.duplicates.map(d => `#${d.id} ${h(d.name)}(${d.status})`).join(', ')}</div>` : ''}</div>
      <div class="panel"><h2>판정</h2><form class="form" data-form="judge"><label>메모(호스트에게 표시)<textarea name="note" rows="3" placeholder="보완 요청 사유를 구체적으로">${h(s.review_note || '')}</textarea></label><div class="actions"><button class="btn btn-p" data-judge="approve">승인(공개)</button><button class="btn btn-o" data-judge="revision">보완 요청</button><button class="btn btn-o" data-judge="reject">반려</button>${s.status === 'approved' ? '<button class="btn btn-o" data-judge="hide">비공개</button>' : ''}${s.status === 'hidden' ? '<button class="btn btn-o" data-judge="unhide">공개 복구</button>' : ''}</div></form></div>
      <div class="panel"><h2>구독</h2><form class="form" data-form="subscription"><div class="row3"><label>상태<select name="status">${Object.entries(SUB).map(([k, v]) => `<option value="${k}" ${k === s.subscription_status ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label><label>만료일<input type="date" name="until" value="${h(s.subscription_until || '')}"></label><label>&nbsp;<button class="btn btn-o" type="submit">저장</button></label></div></form><div class="actions"><span class="mini">입금 확인 시:</span>${[1, 3, 6, 12].map(m => `<button type="button" class="btn btn-o" data-extend="${m}">+${m}개월 활성화</button>`).join('')}</div></div>
      <div class="panel"><h2>정가 변경 이력</h2>${r.price_history.length ? `<table class="stat-tbl">${r.price_history.map(p => `<tr><td>${h(p.changed_at.slice(0, 10))}</td><td>${h(p.slot_name)}</td><td>${won(p.old_weekday)}/${won(p.old_weekend)} → <b>${won(p.new_weekday)}/${won(p.new_weekend)}</b></td></tr>`).join('')}</table>` : '<p class="muted">없음</p>'}</div>
    </div><div>
      <div class="panel"><h2>호스트</h2><p>${h(s.host_name)} · ${h(s.host_email)} · ${h(s.host_phone)}<br><span class="mini">사업자 ${h(s.biz_no || '-')} · 대표 ${h(s.representative || '-')}</span></p></div>
      <div class="panel"><h2>사진 ${s.photos.length}장</h2><div class="photo-grid">${s.photos.map(p => `<div class="photo"><img src="${h(p)}" alt=""></div>`).join('')}</div></div>
      <div class="panel"><h2>정보</h2><p><b>${h(s.intro)}</b></p><p class="mini">${h(s.address)} ${h(s.address_detail)} · ${s.capacity_std}~${s.capacity_max}명 · ${h(s.floor_info)} · 주차 ${h(s.parking)}</p><p style="white-space:pre-wrap;font-size:13px">${h(s.description)}</p><p class="mini">규칙: ${h(s.rules)}<br>환불: ${h(s.refund_policy)}</p><p class="mini">채널: ${h(s.booking_type)} · ${h(s.booking_url)} · ${h(s.booking_tel)} · ${h(s.booking_kakao)} · 딜링크 ${h(s.deal_link)}</p>
      <table class="stat-tbl">${s.slots.map(sl => `<tr><td>${h(sl.name)}</td><td>${h(sl.start_time)}~${h(sl.end_time)}</td><td>월~목 ${won(sl.price_weekday)}${sl.price_fri ? ` · 금 ${won(sl.price_fri)}` : ''} · 토 ${won(sl.price_weekend)}${sl.price_sun ? ` · 일 ${won(sl.price_sun)}` : ''}</td><td>${sl.base_people}명</td></tr>`).join('')}</table></div>
    </div></div>`, 'review');
    $$('[data-judge]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); const note = $('[data-form=judge] [name=note]').value; try { await api(`/api/admin/spaces/${id}`, { method: 'PUT', body: { action: b.dataset.judge, note } }); toast('처리했어요.'); spaceDetail(id); } catch (err) { toast(err.message); } }));
    $$('[data-extend]').forEach(b => b.addEventListener('click', async () => { try { await api(`/api/admin/spaces/${id}`, { method: 'PUT', body: { action: 'extend', months: b.dataset.extend } }); toast('활성화했어요.'); spaceDetail(id); } catch (err) { toast(err.message); } }));
  }
  async function hosts() {
    const r = await api('/api/admin/hosts');
    shell(`<div class="c-title"><h1>호스트</h1><span class="sub">${r.hosts.length}명</span></div><div class="tbl-wrap"><table class="a-tbl"><thead><tr><th>ID</th><th>상호</th><th>연락처</th><th>사업자</th><th>공간</th><th>가입</th><th>상태</th><th></th></tr></thead><tbody>${r.hosts.map(x => `<tr><td>${x.id}</td><td><b>${h(x.name)}</b></td><td>${h(x.email)}<br>${h(x.phone)}</td><td>${h(x.biz_no || '-')}</td><td>${x.space_n} (공개 ${x.live_n})</td><td class="mini">${h((x.created_at || '').slice(0, 10))}</td><td>${x.status === 'active' ? '<span class="pill ok">정상</span>' : '<span class="pill bad">정지</span>'}</td><td class="ops">${x.status === 'active' ? `<button class="btn btn-p" data-host-open="${x.id}">호스트센터 열기</button>` : ''}<button class="btn btn-o" data-host-cred="${x.id}" data-email="${h(x.email)}">로그인 정보</button>${x.status === 'active' ? `<button class="btn btn-o" data-host="suspend" data-id="${x.id}">정지</button>` : `<button class="btn btn-o" data-host="activate" data-id="${x.id}">해제</button>`}${/\.local$/.test(x.email) ? '<br><span class="mini">운영 계정 · 로그인 정보를 정하면 이메일로도 들어갈 수 있어요</span>' : ''}</td></tr>`).join('')}</tbody></table></div>`, 'hosts');
  }
  async function deals() {
    const r = await api('/api/admin/deals');
    shell(`<div class="c-title"><h1>딜 모니터링</h1><span class="sub">진행·예정 ${r.deals.length}건</span></div><div class="tbl-wrap"><table class="a-tbl"><thead><tr><th>ID</th><th>공간</th><th>유형</th><th>할인</th><th>대상</th><th>기간</th><th>수량</th><th>플래그</th><th></th></tr></thead><tbody>${r.deals.map(d => `<tr><td>${d.id}</td><td><a href="#space/${d.space_id}"><b>${h(d.space_name)}</b></a><br><span class="mini">${h(d.host_name)}</span></td><td><span class="badge b-${d.type.toLowerCase()}">${TYPE[d.type]}</span> ${d.origin === 'AUTO' ? '<span class="pill pt">자동</span>' : ''}</td><td>${d.type === 'EVENT' ? h(d.benefit_text) : d.discount_mode === 'RATE' ? d.discount_value + '%' : won(d.discount_value)}</td><td class="mini">${d.targets.length}개</td><td class="mini">${h(d.starts_at.replace('T', ' '))}<br>~${h(d.ends_at.replace('T', ' '))}</td><td>${d.quantity != null ? `${d.claimed}/${d.quantity}` : d.claimed}</td><td>${d.flags.map(f => `<span class="flag">${h(f)}</span>`).join('') || '-'}</td><td class="ops"><a class="btn btn-o" href="/space/${h(d.slug)}/deal/${d.id}" target="_blank">보기</a><button class="btn btn-o" data-dealstop="${d.id}">중지</button></td></tr>`).join('') || '<tr><td colspan="9" class="muted">없음</td></tr>'}</tbody></table></div>`, 'deals');
  }
  async function reports() {
    const u = new URLSearchParams(location.hash.split('?')[1] || ''); const st = u.get('status') || 'open';
    const r = await api(`/api/admin/reports?status=${st}`);
    const KIND = { deal_unfulfilled: '딜 미이행', content: '콘텐츠', inquiry: '문의', other: '기타' };
    shell(`<div class="c-title"><h1>신고·문의</h1><div class="right"><a class="btn btn-o" href="#reports?status=open">미처리</a><a class="btn btn-o" href="#reports?status=resolved">처리됨</a><a class="btn btn-o" href="#reports?status=all">전체</a></div></div>${r.reports.map(x => `<div class="panel"><p><span class="pill ${x.status === 'open' ? 'warn' : 'ok'}">${x.status === 'open' ? '미처리' : '처리됨'}</span> <b>${KIND[x.kind] || x.kind}</b> <span class="mini">#${x.id} · ${h(x.created_at)} · ${h(x.contact)}${x.target_type === 'space' ? ` · <a href="#space/${x.target_id}">공간 #${x.target_id}</a>` : ''}</span></p><p style="white-space:pre-wrap;font-size:14px">${h(x.content)}</p><form class="form" data-form="report" data-id="${x.id}"><div class="row"><input name="admin_note" value="${h(x.admin_note || '')}" placeholder="처리 메모"><div class="actions"><button class="btn btn-o" name="status" value="${x.status === 'open' ? 'resolved' : 'open'}">${x.status === 'open' ? '처리 완료' : '다시 열기'}</button></div></div></form></div>`).join('') || '<div class="panel"><p class="muted">없음</p></div>'}`, 'reports');
  }
  async function subs() {
    const r = await api('/api/admin/subs');
    shell(`<div class="c-title"><h1>알림 구독</h1><span class="sub">${r.subs.length}명 · 알림 발송(카카오·이메일) 연동 전까지는 이 목록으로 수동 안내</span></div><div class="tbl-wrap"><table class="a-tbl"><thead><tr><th>ID</th><th>연락처</th><th>채널</th><th>지역</th><th>요일</th><th>인원</th><th>유형</th><th>등록</th></tr></thead><tbody>${r.subs.map(x => `<tr><td>${x.id}</td><td>${h(x.contact)}</td><td>${h(x.channel)}</td><td class="mini">${h(x.regions_json)}</td><td class="mini">${h(x.days_json)}</td><td>${x.size || '-'}</td><td class="mini">${h(x.types_json)}</td><td class="mini">${h((x.created_at || '').slice(0, 10))}</td></tr>`).join('')}</tbody></table></div>`, 'subs');
  }
  async function regions() {
    const r = await api('/api/admin/regions'); S.regions = r.regions;
    const name = id => (r.regions.find(x => x.id === id) || {}).name || '';
    shell(`<div class="c-title"><h1>지역</h1><span class="sub">시 › 구 › 상권. 상권 설명·FAQ는 검색 노출용 허브 페이지에 들어갑니다</span></div>
    <div class="panel"><h2>추가</h2><form class="form" data-form="region-add"><div class="row3"><label>레벨<select name="level"><option value="area">상권</option><option value="gu">구/시</option><option value="si">시/도</option></select></label><label>상위<select name="parent_id"><option value="">(없음)</option>${r.regions.filter(x => x.level !== 'area').map(x => `<option value="${x.id}">${x.level === 'si' ? '' : name(x.parent_id) + ' › '}${h(x.name)}</option>`).join('')}</select></label><label>이름<input name="name" required placeholder="예: 성수"></label></div><div class="row"><label>슬러그(영문)<input name="slug" placeholder="seongsu"></label><label>&nbsp;<button class="btn btn-p" type="submit">추가</button></label></div></form></div>
    <div class="tbl-wrap"><table class="a-tbl"><thead><tr><th>ID</th><th>경로</th><th>슬러그</th><th>설명</th><th>색인</th><th></th></tr></thead><tbody>${r.regions.filter(x => x.level === 'area').map(x => `<tr><td>${x.id}</td><td>${h(name(x.parent_id))} › <b>${h(x.name)}</b></td><td class="mini">${h(x.slug)}</td><td class="mini">${h((x.description || '').slice(0, 60))}</td><td>${x.indexable ? '예' : '아니오'}</td><td class="ops"><button class="btn btn-o" data-region-edit="${x.id}">편집</button></td></tr>`).join('')}</tbody></table></div><div id="region-editor"></div>`, 'regions');
  }
  function regionEditor(id) {
    const x = S.regions.find(r => r.id === id); if (!x) return;
    const faq = JSON.parse(x.faq_json || '[]');
    $('#region-editor').innerHTML = `<div class="panel"><h2>${h(x.name)} 편집</h2><form class="form" data-form="region-edit" data-id="${x.id}"><div class="row3"><label>이름<input name="name" value="${h(x.name)}"></label><label>정렬<input name="sort" type="number" value="${x.sort}"></label><label class="inline" style="align-self:end"><input type="checkbox" name="indexable" ${x.indexable ? 'checked' : ''}> 검색 색인 허용</label></div><label>상권 설명 (허브 페이지 상단, 150~300자 권장)<textarea name="description" rows="4">${h(x.description || '')}</textarea></label><label>FAQ (한 줄에 "질문 | 답변")<textarea name="faq" rows="5" placeholder="홍대 파티룸은 몇 명까지 되나요? | 등록된 공간 기준 4~20명입니다.">${faq.map(f => `${f.q} | ${f.a}`).join('\n')}</textarea></label><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">저장</button></div></form></div>`;
    $('#region-editor').scrollIntoView({ behavior: 'smooth' });
  }
  async function themes() {
    const r = await api('/api/admin/themes');
    shell(`<div class="c-title"><h1>테마</h1></div><div class="panel"><form class="form" data-form="theme-add"><div class="row3"><input name="name" placeholder="이름" required><input name="icon" placeholder="아이콘(이모지)"><input name="slug" placeholder="slug(영문)"></div><div class="row"><input name="description" placeholder="설명"><button class="btn btn-p" type="submit">추가</button></div></form></div><div class="tbl-wrap"><table class="a-tbl"><thead><tr><th>ID</th><th>아이콘</th><th>이름</th><th>슬러그</th><th>설명</th><th>정렬</th><th></th></tr></thead><tbody>${r.themes.map(t => `<tr><form data-form="theme-edit" data-id="${t.id}"><td>${t.id}</td><td><input name="icon" value="${h(t.icon)}" style="width:50px"></td><td><input name="name" value="${h(t.name)}"></td><td class="mini">${h(t.slug)}</td><td><input name="description" value="${h(t.description)}"></td><td><input name="sort" type="number" value="${t.sort}" style="width:60px"></td><td class="ops"><button class="btn btn-o" type="submit">저장</button></td></form></tr>`).join('')}</tbody></table></div>`, 'themes');
  }
  async function articles() {
    const r = await api('/api/admin/articles');
    shell(`<div class="c-title"><h1>매거진</h1><div class="right"><a class="btn btn-p" href="#article/new">+ 새 글</a></div></div><div class="tbl-wrap"><table class="a-tbl"><thead><tr><th>ID</th><th>제목</th><th>분류</th><th>공개</th><th>수정</th><th></th></tr></thead><tbody>${r.articles.map(a => `<tr><td>${a.id}</td><td><b>${h(a.title)}</b><br><span class="mini">/magazine/${h(a.slug)}</span></td><td>${h(a.category)}</td><td>${a.published ? '<span class="pill ok">공개</span>' : '<span class="pill">비공개</span>'}</td><td class="mini">${h((a.updated_at || '').slice(0, 10))}</td><td class="ops"><a class="btn btn-o" href="#article/${a.id}">편집</a></td></tr>`).join('') || '<tr><td colspan="6" class="muted">없음</td></tr>'}</tbody></table></div>`, 'articles');
  }
  async function articleEdit(id) {
    const a = id === 'new' ? { title: '', summary: '', body: '', category: 'guide', region_id: '', published: 0 } : (await api(`/api/admin/articles/${id}`)).article;
    if (!S.regions) S.regions = (await api('/api/admin/regions')).regions;
    shell(`<div class="c-title"><a class="btn btn-o" href="#articles" style="height:34px;padding:0 10px">‹</a><h1>${id === 'new' ? '새 글' : '글 편집'}</h1></div><div class="panel"><form class="form" data-form="article" data-id="${id}"><div class="row"><label>제목<input name="title" value="${h(a.title)}" required></label><label>영문 주소(slug)<input name="slug" value="${h(a.slug || '')}" placeholder="hongdae-partyroom-guide" ${id !== 'new' ? 'readonly' : ''}></label></div><div class="row3"><label>분류<select name="category">${['guide', 'region', 'host', 'report', 'season', 'party'].map(c => `<option value="${c}" ${a.category === c ? 'selected' : ''}>${{ guide: '가이드', region: '지역', host: '호스트 이야기', report: '시세 리포트', season: '시즌', party: '파티 준비' }[c]}</option>`).join('')}</select></label><label>연결 상권<select name="region_id"><option value="">없음</option>${S.regions.filter(r => r.level === 'area').map(r => `<option value="${r.id}" ${a.region_id === r.id ? 'selected' : ''}>${h(r.name)}</option>`).join('')}</select></label><label class="inline" style="align-self:end"><input type="checkbox" name="published" ${a.published ? 'checked' : ''}> 공개</label></div><label>요약(검색 설명, 80~120자)<input name="summary" value="${h(a.summary)}" maxlength="300"></label><label>본문 (빈 줄로 단락, "## 소제목", "- 목록", [링크 텍스트](/주소))<textarea name="body" rows="18">${h(a.body)}</textarea></label><p class="hint">소제목은 사람들이 실제로 묻는 질문 형태로 쓰고, 첫 문장에서 바로 답하세요. 숫자에는 기준일을 적습니다.</p><p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">저장</button>${id !== 'new' ? `<button type="button" class="btn btn-o" data-article-del="${id}">삭제</button>` : ''}</div></form></div>`, 'articles');
  }
  async function settings() {
    const r = await api('/api/admin/settings'); const s = r.settings;
    const F = (k, l, hint = '') => `<label>${l}<input name="${k}" value="${h(s[k] || '')}">${hint ? `<span class="mini">${hint}</span>` : ''}</label>`;
    shell(`<div class="c-title"><h1>설정</h1></div><div class="panel"><form class="form" data-form="settings">
      <h2>사이트</h2><div class="row">${F('site_name', '사이트 이름')}${F('site_tagline', '한 줄 슬로건')}</div><div class="row">${F('company_name', '회사명')}${F('contact_email', '문의 이메일')}</div>${F('company_info', '사업자 정보(푸터)')}${F('contact_kakao', '카카오톡 채널 링크')}
      <h2>호스트·구독</h2><div class="row3">${F('host_fee_text', '요금 문구')}${F('trial_days', '무료 체험 일수(0=없음)')}${F('bank_account', '입금 계좌 안내')}</div>
      <h2>딜·검색</h2><div class="row">${F('deal_cutoff_minutes', '딜 종료 여유(슬롯 시작 N분 전)')}${F('index_min_spaces', '지역 허브 색인 허용 최소 공간 수')}</div>
      <label>공휴일 (JSON 배열)<textarea name="holidays" rows="3" class="code">${h(s.holidays || '[]')}</textarea></label>
      <label>편의시설 목록 (JSON 배열)<textarea name="amenities" rows="3" class="code">${h(s.amenities || '[]')}</textarea></label>
      <label>함께하는 사이트(푸터, JSON: [{"name":"...","url":"..."}])<textarea name="footer_links" rows="3" class="code">${h(s.footer_links || '[]')}</textarea></label>
      <p class="msg"></p><div class="actions"><button class="btn btn-p" type="submit">저장</button></div></form></div>
      <div class="panel"><h2>DB 관리</h2><p class="mini" data-dbstate>상태 확인 중…</p><div class="actions"><button type="button" class="btn btn-o" data-db="install">DB 점검·업데이트</button><button type="button" class="btn btn-o" data-db="seed">샘플 데이터 넣기</button><button type="button" class="btn btn-o" data-db="remove_demo">샘플 데이터 삭제</button></div><p class="hint">DB 점검·업데이트는 빠진 테이블과 기본값만 채우고 기존 데이터는 건드리지 않습니다. 실제 오픈 전에는 샘플 데이터를 삭제하세요.</p></div>`, 'settings');
    try { const st = await api('/api/admin/install'); $('[data-dbstate]').textContent = `테이블 ${st.tables}개 · 관리자 ${st.admins}명 · 샘플 데이터 ${st.demo ? '있음' : '없음'} · 스키마 v${st.version}`; } catch (e) { $('[data-dbstate]').textContent = e.message; }
  }

  /* ---- 이벤트 ---- */
  const fd2obj = f => Object.fromEntries(new FormData(f).entries());
  document.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
    const k = f.dataset.form, o = fd2obj(f), msg = $('.msg', f), id = f.dataset.id;
    if (msg) { msg.textContent = ''; msg.classList.remove('ok'); }
    try {
      if (k === 'install') { const btn = $('button[type=submit]', f); btn.disabled = true; btn.textContent = '준비 중…'; await api('/api/admin/install', { method: 'POST', body: { action: 'install', seed: !!o.seed } }); toast('DB를 준비했어요. 이제 관리자 계정을 만드세요.'); route(); }
      else if (k === 'setup') { await api('/api/admin/setup', { method: 'POST', body: o }); S.admin = (await api('/api/admin/me')).admin; location.hash = 'dash'; route(); }
      else if (k === 'login') { await api('/api/admin/login', { method: 'POST', body: o }); S.admin = (await api('/api/admin/me')).admin; route(); }
      else if (k === 'spaces-filter') { location.hash = `spaces?status=${o.status}&q=${encodeURIComponent(o.q)}`; }
      else if (k === 'subscription') { await api(`/api/admin/spaces/${location.hash.split('/')[1]}`, { method: 'PUT', body: { action: 'subscription', status: o.status, until: o.until } }); toast('저장했어요.'); }
      else if (k === 'report') { const st = e.submitter?.value || 'resolved'; await api(`/api/admin/reports/${id}`, { method: 'PUT', body: { status: st, admin_note: o.admin_note } }); route(); }
      else if (k === 'region-add') { await api('/api/admin/regions', { method: 'POST', body: o }); toast('추가했어요.'); route(); }
      else if (k === 'region-edit') { const faq = (o.faq || '').split('\n').map(l => l.split('|')).filter(p => p.length >= 2).map(p => ({ q: p[0].trim(), a: p.slice(1).join('|').trim() })); await api('/api/admin/regions', { method: 'PUT', body: { id: Number(id), name: o.name, sort: o.sort, indexable: !!o.indexable, description: o.description, faq } }); msg.textContent = '저장했어요.'; msg.classList.add('ok'); }
      else if (k === 'theme-add') { await api('/api/admin/themes', { method: 'POST', body: o }); route(); }
      else if (k === 'theme-edit') { await api('/api/admin/themes', { method: 'PUT', body: { id: Number(id), ...o } }); toast('저장했어요.'); }
      else if (k === 'article') { const body = { ...o, published: !!o.published, region_id: o.region_id || null }; if (id === 'new') { const r = await api('/api/admin/articles', { method: 'POST', body }); location.hash = `article/${r.id}`; } else { await api(`/api/admin/articles/${id}`, { method: 'PUT', body }); msg.textContent = '저장했어요.'; msg.classList.add('ok'); } }
      else if (k === 'settings') { await api('/api/admin/settings', { method: 'PUT', body: o }); msg.textContent = '저장했어요.'; msg.classList.add('ok'); }
    } catch (err) { if (msg) msg.textContent = err.message; else toast(err.message); }
  });
  document.addEventListener('click', async e => {
    const a = e.target.closest('[data-act=logout]'); if (a) { await api('/api/admin/logout', { method: 'POST' }); S.admin = null; route(); }
    const ho = e.target.closest('[data-host-open]'); if (ho) { try { const r = await api(`/api/admin/hosts/${ho.dataset.hostOpen}`, { method: 'PUT', body: { action: 'impersonate' } }); window.open(r.url, '_blank'); } catch (err) { toast(err.message); } return; }
    const hc = e.target.closest('[data-host-cred]'); if (hc) {
      const email = prompt('호스트가 로그인할 이메일', /\.local$/.test(hc.dataset.email) ? '' : hc.dataset.email); if (email === null) return;
      const pw = prompt('새 비밀번호 (8자 이상, 비우면 이메일만 바꿉니다)', ''); if (pw === null) return;
      try { const r = await api(`/api/admin/hosts/${hc.dataset.hostCred}`, { method: 'PUT', body: { action: 'credentials', email, password: pw } }); toast(r.message); route(); } catch (err) { toast(err.message); }
      return;
    }
    const hs = e.target.closest('[data-host]'); if (hs) { try { await api(`/api/admin/hosts/${hs.dataset.id}`, { method: 'PUT', body: { action: hs.dataset.host } }); route(); } catch (err) { toast(err.message); } }
    const ds = e.target.closest('[data-dealstop]'); if (ds && confirm('이 딜을 중지할까요?')) { try { await api(`/api/admin/deals/${ds.dataset.dealstop}`, { method: 'PUT', body: { action: 'stop' } }); route(); } catch (err) { toast(err.message); } }
    const db = e.target.closest('[data-db]'); if (db) { const label = { install: 'DB 점검·업데이트를 실행할까요?', seed: '샘플 공간 3곳과 매거진 글을 넣을까요?', remove_demo: '샘플 데이터(공간 3곳·샘플 호스트·매거진 글)를 삭제할까요?' }[db.dataset.db]; if (confirm(label)) { try { await api('/api/admin/install', { method: 'POST', body: { action: db.dataset.db } }); toast('완료했어요.'); route(); } catch (err) { toast(err.message); } } }
    const re = e.target.closest('[data-region-edit]'); if (re) regionEditor(Number(re.dataset.regionEdit));
    const ad = e.target.closest('[data-article-del]'); if (ad && confirm('삭제할까요?')) { await api(`/api/admin/articles/${ad.dataset.articleDel}`, { method: 'DELETE' }); location.hash = 'articles'; }
  });
  (async () => { try { S.admin = (await api('/api/admin/me')).admin; } catch { S.admin = null; } route(); })();
})();
