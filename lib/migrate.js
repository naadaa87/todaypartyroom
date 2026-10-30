// DB 스키마 적용·자동 업데이트
import { SCHEMA, SCHEMA_VERSION } from './schema-sql.js';

/** 스키마 전체 적용(여러 번 실행해도 안전) + 버전 기록 */
export async function applySchema(db) {
  await db.batch(SCHEMA.map(sql => db.prepare(sql)));
  await db.prepare(`INSERT INTO settings (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(SCHEMA_VERSION).run();
}

let checked = false;
let pending = null;
/**
 * 배포 후 첫 요청에서 한 번: 이미 설치된 DB인데 버전이 낮으면 새 테이블을 자동으로 추가합니다.
 * 아직 설치 전(빈 DB)이면 아무것도 하지 않습니다 — 관리자 화면의 'DB 준비하기'가 처리합니다.
 */
export async function ensureSchema(db) {
  if (checked) return;
  if (pending) return pending;
  pending = (async () => {
    try {
      const row = await db.prepare(`SELECT value FROM settings WHERE key = 'schema_version'`).first();
      if (!row || row.value !== SCHEMA_VERSION) await applySchema(db);
      checked = true;
    } catch (e) {
      // settings 테이블이 없으면 설치 전 → 다음 요청에서 다시 확인
      if (!/no such table/i.test(String(e.message || e))) console.error('ensureSchema', e);
    } finally { pending = null; }
  })();
  return pending;
}
