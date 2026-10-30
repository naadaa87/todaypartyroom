/* 오늘의파티룸 게스트 스크립트: 카운트다운, 지역 선택, 딜 받기, 알림 구독, 필터, 공유 */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const KST = 9 * 60 * 60 * 1000;
  const nowKST = () => new Date(Date.now() + KST);
  const api = async (url, opt = {}) => {
    const res = await fetch(url, { headers: { 'content-type': 'application/json' }, credentials: 'same-origin', ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
    let data = {}; try { data = await res.json(); } catch { }
    if (!res.ok || data.ok === false) throw new Error(data.error || '요청에 실패했어요.');
    return data;
  };
  const toast = (msg) => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  const setCookie = (k, v, days = 180) => { document.cookie = `${k}=${encodeURIComponent(v)}; path=/; max-age=${days * 86400}; samesite=lax`; };
  const delCookie = (k) => { document.cookie = `${k}=; path=/; max-age=0`; };
  const track = (payload) => { try { navigator.sendBeacon('/api/track', new Blob([JSON.stringify(payload)], { type: 'application/json' })); } catch { } };
  const spaceData = (() => { const el = $('#space-data'); try { return el ? JSON.parse(el.textContent) : null; } catch { return null; } })();

  /* ---- 바텀시트 ---- */
  const root = $('#sheet-root');
  function openSheet(html) {
    closeSheet();
    root.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><button class="x" data-close aria-label="닫기">✕</button>${html}</div>`;
    root.addEventListener('click', e => { if (e.target.matches('[data-close]')) closeSheet(); });
    document.body.style.overflow = 'hidden';
    return $('.sheet', root);
  }
  function closeSheet() { root.innerHTML = ''; document.body.style.overflow = ''; }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  /* ---- 카운트다운 ---- */
  function tickCountdown() {
    const now = nowKST();
    $$('.cd[data-ends]').forEach(el => {
      const ends = new Date(el.dataset.ends + ':00Z');
      const diff = ends - now;
      if (diff <= 0) { el.textContent = '종료됨'; el.classList.add('ended'); return; }
      const m = Math.floor(diff / 60000), h = Math.floor(m / 60);
      if (h >= 1) el.textContent = `${h}시간 ${m % 60}분 남음`;
      else if (m >= 10) el.textContent = `${m}분 남음`;
      else { const s = Math.floor((diff % 60000) / 1000); el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} 남음`; }
    });
  }
  tickCountdown(); setInterval(tickCountdown, 1000);

  /* ---- 지역 선택 ---- */
  let regionTree = null;
  async function loadRegions() { if (!regionTree) regionTree = (await api('/api/regions')).tree; return regionTree; }
  async function openRegionPicker() {
    const sheet = openSheet(`<h3>지역 선택</h3><p class="muted">상권을 고르면 해당 지역의 오늘 비는 곳이 바로 보여요.</p><div class="region-cols"><ul data-col="si"></ul><ul data-col="gu"></ul><ul data-col="area"></ul></div><div class="row-act"><button type="button" class="btn btn-o" data-all>전국 보기</button></div>`);
    const tree = await loadRegions();
    const cols = { si: $('[data-col=si]', sheet), gu: $('[data-col=gu]', sheet), area: $('[data-col=area]', sheet) };
    const cnt = n => n.children ? n.children.reduce((a, c) => a + cnt(c), 0) : (n.n || 0);
    const render = (col, list, onPick) => { col.innerHTML = list.map(n => `<li data-id="${n.id}">${n.name}<b>${cnt(n) || ''}</b></li>`).join(''); $$('li', col).forEach(li => li.onclick = () => { $$('li', col).forEach(x => x.classList.remove('on')); li.classList.add('on'); onPick(list.find(n => String(n.id) === li.dataset.id)); }); };
    render(cols.si, tree, si => { cols.area.innerHTML = ''; render(cols.gu, si.children, gu => render(cols.area, gu.children, area => { setCookie('tpr_region', area.id); location.href = area.path; })); });
    if (tree[0]) cols.si.firstElementChild?.click();
    $('[data-all]', sheet).onclick = () => { delCookie('tpr_region'); location.href = location.pathname.startsWith('/deals/') || location.pathname === '/events' ? location.pathname : '/'; };
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open-region]'); if (t) { e.preventDefault(); openRegionPicker(); }
    const c = e.target.closest('[data-clear-region]'); if (c) { delCookie('tpr_region'); }
  });
  const metaRegion = $('meta[name=tpr-region]'); if (metaRegion) setCookie('tpr_region', metaRegion.content);

  /* ---- 딜 받기 ---- */
  function channelButtons(sp, link) {
    const b = [];
    if (link) b.push(`<a class="btn btn-p btn-lg" href="${link}" target="_blank" rel="noopener" data-ch="link">${/naver/.test(link) ? '네이버 예약(딜 상품)으로 이동' : '딜 예약 페이지로 이동'}</a>`);
    if (sp.tel) b.push(`<a class="btn ${link ? 'btn-o' : 'btn-p'} btn-lg" href="tel:${sp.tel}" data-ch="tel">📞 전화로 예약 (${sp.tel})</a>`);
    if (sp.kakao) b.push(`<a class="btn btn-o btn-lg" href="${sp.kakao}" target="_blank" rel="noopener" data-ch="kakao">💬 카카오톡으로 예약</a>`);
    if (sp.url && !link) b.push(`<a class="btn btn-o btn-lg" href="${sp.url}" target="_blank" rel="noopener" data-ch="link">🔗 ${/naver/.test(sp.url) ? '네이버 예약' : '예약 페이지'}로 이동</a>`);
    return b.join('');
  }
  async function claim(dealId, link) {
    const sp = spaceData ? spaceData.booking : {};
    if (link) { track({ type: 'click_channel', space_id: spaceData?.id, deal_id: dealId, channel: 'deal_link' }); window.open(link, '_blank', 'noopener'); toast('딜 전용 예약 페이지로 이동합니다'); return; }
    const sheet = openSheet(`<h3>딜 받기</h3><p class="muted">휴대폰 번호로 딜 코드를 발급해 드려요. 예약할 때 코드를 말씀하시면 할인가가 적용됩니다.</p>
      <form class="form" data-claim-form><label>휴대폰 번호<input name="phone" type="tel" inputmode="numeric" placeholder="01012345678" required autocomplete="tel"></label><label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" name="agree" required style="height:auto"> 코드 발급을 위한 휴대폰 번호 수집에 동의합니다</label><p class="msg"></p><button class="btn btn-p btn-lg" type="submit">코드 받기</button></form>`);
    const form = $('form', sheet), msg = $('.msg', sheet);
    form.onsubmit = async (e) => {
      e.preventDefault(); msg.textContent = ''; form.querySelector('button').disabled = true;
      try {
        const r = await api('/api/claim', { method: 'POST', body: { deal_id: dealId, phone: form.phone.value } });
        const exp = (r.expires_at || '').replace('T', ' ');
        sheet.innerHTML = `<div class="grab"></div><button class="x" data-close aria-label="닫기">✕</button><h3>${r.reused ? '이미 받은 코드예요' : '코드가 발급됐어요'}</h3>
          <div class="code-box"><div class="code">${r.code}</div><p>${r.space.name} · ${r.slot} · ${r.date}<br><b>${Number(r.price).toLocaleString()}원</b> <s>${Number(r.base).toLocaleString()}원</s> · ${exp}까지 유효</p></div>
          <p class="muted">예약할 때 이 코드를 말씀해 주세요. 코드는 <a href="/me">마이</a>에서 다시 볼 수 있어요.</p>
          <div class="row-act" style="flex-direction:column"><button type="button" class="btn btn-o" data-copy="${r.code}">코드 복사</button>${channelButtons(r.space, r.deal_link)}</div>`;
        $$('[data-ch]', sheet).forEach(a => a.addEventListener('click', () => track({ type: 'click_channel', space_id: spaceData?.id, deal_id: r.deal_id, channel: a.dataset.ch })));
        track({ type: 'click_deal', space_id: spaceData?.id, deal_id: dealId });
      } catch (err) { msg.textContent = err.message; form.querySelector('button').disabled = false; }
    };
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-claim]'); if (b) { e.preventDefault(); claim(b.dataset.claim, b.dataset.link || ''); }
    const ch = e.target.closest('[data-channel]'); if (ch) track({ type: 'click_channel', space_id: ch.dataset.space, channel: ch.dataset.channel });
    const cp = e.target.closest('[data-copy]'); if (cp) { navigator.clipboard?.writeText(cp.dataset.copy).then(() => toast('복사했어요')); }
    const sh = e.target.closest('[data-share]'); if (sh) { const url = sh.dataset.share; if (navigator.share) navigator.share({ url, title: document.title }).catch(() => { }); else navigator.clipboard?.writeText(url).then(() => toast('링크를 복사했어요')); }
    const dc = e.target.closest('.deal-card'); if (dc) track({ type: 'click_deal', space_id: dc.dataset.space, deal_id: dc.dataset.deal, source: location.pathname });
  });
  if (spaceData) {
    track({ type: 'view_space', space_id: spaceData.id, region_id: spaceData.region, source: (document.referrer || '').replace(/^https?:\/\//, '').split('/')[0].slice(0, 40) });
    const sel = new URLSearchParams(location.search).get('deal'); if (sel) { const box = document.getElementById('deal-' + sel); if (box) setTimeout(() => box.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200); }
  }

  /* ---- 알림 구독 ---- */
  async function openSubscribe(presetRegion) {
    const sheet = openSheet(`<h3>딜 알림 받기</h3><p class="muted">조건에 맞는 당일·전날 할인, 반짝딜이 열리면 알려드려요.</p>
      <form class="form" data-sub-form>
        <label>지역 (여러 개 선택)<div class="toggle-chips" data-regions><span class="muted">불러오는 중…</span></div></label>
        <label>요일<div class="toggle-chips">${['일', '월', '화', '수', '목', '금', '토'].map((d, i) => `<label><input type="checkbox" name="days" value="${i}">${d}</label>`).join('')}</div></label>
        <label>인원<select name="size"><option value="">무관</option><option value="4">4명 이상</option><option value="8">8명 이상</option><option value="12">12명 이상</option><option value="20">20명 이상</option></select></label>
        <label>딜 유형<div class="toggle-chips"><label><input type="checkbox" name="types" value="TODAY" checked>당일</label><label><input type="checkbox" name="types" value="TOMORROW" checked>전날</label><label><input type="checkbox" name="types" value="FLASH" checked>반짝</label><label><input type="checkbox" name="types" value="HOT">핫딜</label><label><input type="checkbox" name="types" value="TIME">타임딜</label></div></label>
        <label>받을 곳<select name="channel"><option value="kakao">카카오톡·문자 (휴대폰 번호)</option><option value="email">이메일</option></select></label>
        <label>연락처<input name="contact" placeholder="01012345678" required></label>
        <label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" required style="height:auto"> 알림 수신과 연락처 수집에 동의합니다</label>
        <p class="msg"></p><button class="btn btn-p btn-lg" type="submit">알림 받기</button></form>`);
    const tree = await loadRegions();
    const areas = []; tree.forEach(si => si.children.forEach(gu => gu.children.forEach(a => areas.push({ ...a, label: `${a.name}` }))));
    areas.sort((a, b) => (b.n || 0) - (a.n || 0));
    const box = $('[data-regions]', sheet);
    box.innerHTML = areas.slice(0, 40).map(a => `<label><input type="checkbox" name="regions" value="${a.id}" ${String(a.id) === String(presetRegion) ? 'checked' : ''}>${a.label}</label>`).join('');
    const form = $('form', sheet), msg = $('.msg', sheet);
    form.onsubmit = async (e) => {
      e.preventDefault(); msg.textContent = '';
      const fd = new FormData(form);
      try {
        await api('/api/subscribe', { method: 'POST', body: { regions: fd.getAll('regions'), days: fd.getAll('days'), types: fd.getAll('types'), size: fd.get('size'), channel: fd.get('channel'), contact: fd.get('contact') } });
        sheet.innerHTML = `<div class="grab"></div><button class="x" data-close aria-label="닫기">✕</button><h3>알림을 등록했어요</h3><p>조건에 맞는 딜이 열리면 바로 알려드릴게요. <a href="/me">마이</a>에서 관리할 수 있어요.</p><button type="button" class="btn btn-p" data-close>확인</button>`;
      } catch (err) { msg.textContent = err.message; }
    };
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-open-subscribe]'); if (b) { e.preventDefault(); openSubscribe(b.dataset.region || (spaceData && spaceData.region) || ''); } });
  document.addEventListener('click', async e => { const u = e.target.closest('[data-unsub]'); if (u) { try { await api('/api/subscribe?id=' + u.dataset.unsub, { method: 'DELETE' }); u.closest('li').remove(); toast('해지했어요'); } catch (err) { toast(err.message); } } });

  /* ---- 신고 폼 ---- */
  const rf = $('[data-report-form]');
  if (rf) rf.onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(rf); const m = $('[data-report-msg]', rf); try { await api('/api/report', { method: 'POST', body: Object.fromEntries(fd.entries()) }); rf.reset(); m.textContent = '접수했어요. 확인 후 연락드릴게요.'; } catch (err) { m.textContent = err.message; } };

  /* ---- 목록 필터·정렬 ---- */
  $$('[data-filter-bar]').forEach(bar => {
    const grid = bar.nextElementSibling && bar.nextElementSibling.classList.contains('grid') ? bar.nextElementSibling : null; if (!grid) return;
    const cards = $$('.deal-card', grid);
    const apply = () => {
      const cap = Number($('[data-f=cap]', bar)?.value || 0), type = $('[data-f=type]', bar)?.value || '', sort = $('[data-f=sort]', bar)?.value || '';
      let shown = cards.filter(c => (!cap || Number(c.dataset.cap) >= cap) && (!type || c.dataset.type === type));
      cards.forEach(c => c.style.display = shown.includes(c) ? '' : 'none');
      if (sort === 'rate') shown.sort((a, b) => Number(b.dataset.rate) - Number(a.dataset.rate));
      else if (sort === 'price') shown.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
      else shown.sort((a, b) => a.dataset.ends.localeCompare(b.dataset.ends));
      shown.forEach(c => grid.appendChild(c));
      let empty = grid.querySelector('.filter-empty');
      if (!shown.length) { if (!empty) { empty = document.createElement('div'); empty.className = 'empty filter-empty'; empty.innerHTML = '<p>조건에 맞는 딜이 없어요. 필터를 줄여 보세요.</p>'; grid.appendChild(empty); } } else if (empty) empty.remove();
    };
    $$('select', bar).forEach(s => s.addEventListener('change', apply));
  });

  /* ---- 갤러리 카운터 ---- */
  const gal = $('[data-gallery]');
  if (gal) { const track = $('.gal-track', gal), n = $('.gal-n', gal), total = track.children.length; track.addEventListener('scroll', () => { n.textContent = `${Math.round(track.scrollLeft / track.clientWidth) + 1}/${total}`; }, { passive: true }); }
})();
