// 호스트센터 SPA 셸 (검색 비노출)
import { getSettings } from '../../lib/db.js';
import { html, esc } from '../../lib/util.js';
export async function onRequestGet(context) {
  const s = await getSettings(context.env.DB);
  return html(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>호스트센터 — ${esc(s.site_name)}</title><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"><link rel="stylesheet" href="/assets/app.css"><link rel="stylesheet" href="/assets/console.css"></head>
<body class="console host-console"><div id="app"><div class="loading">불러오는 중…</div></div>
<script id="cfg" type="application/json">${JSON.stringify({ siteName: s.site_name, feeText: s.host_fee_text, trialDays: s.trial_days, amenities: s.amenities, bankAccount: s.bank_account, contactKakao: s.contact_kakao, contactEmail: s.contact_email }).replace(/</g, '\\u003c')}</script>
<script src="/assets/host.js" defer></script></body></html>`, 200, { 'cache-control': 'no-store' });
}
