// 관리자 SPA 셸 (검색 비노출)
import { html } from '../../lib/util.js';
export async function onRequestGet() {
  return html(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>관리자 — 오늘의파티룸</title><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"><link rel="stylesheet" href="/assets/app.css"><link rel="stylesheet" href="/assets/console.css"></head>
<body class="console admin-console"><div id="app"><div class="loading">불러오는 중…</div></div><script src="/assets/admin.js" defer></script></body></html>`, 200, { 'cache-control': 'no-store' });
}
