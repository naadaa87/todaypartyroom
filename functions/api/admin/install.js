// GET  /api/admin/install — DB 준비 상태
// POST /api/admin/install { action: 'install' | 'seed' | 'remove_demo', seed?: boolean }
//  - 관리자가 아직 없을 때(최초 설치)는 로그인 없이 실행 가능
//  - 관리자가 있으면 관리자 로그인 필요
//  - 모든 SQL은 CREATE IF NOT EXISTS / INSERT OR IGNORE 라서 여러 번 실행해도 기존 데이터는 그대로입니다
import { api, currentAdmin, HttpError } from '../../../lib/auth.js';
import { json, readBody } from '../../../lib/util.js';
import { SEED_DEMO, DEMO_DELETE, SCHEMA_VERSION } from '../../../lib/schema-sql.js';
import { applySchema } from '../../../lib/migrate.js';
import { runSchedules } from '../../../lib/automation.js';
import { getSettings } from '../../../lib/db.js';

export async function dbState(db) {
  const t = await db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all();
  const tables = (t.results || []).map(r => r.name);
  const installed = ['regions', 'spaces', 'deals', 'admins', 'settings'].every(n => tables.includes(n));
  let admins = 0, demo = false, version = null;
  if (installed) {
    version = (await db.prepare(`SELECT value FROM settings WHERE key = 'schema_version'`).first())?.value || '1.1';
    admins = (await db.prepare('SELECT COUNT(*) AS n FROM admins').first()).n;
    demo = !!(await db.prepare('SELECT id FROM spaces WHERE id = 9001').first());
  }
  return { installed, admins, demo, tables: tables.length, db_version: version };
}

async function runBatch(db, list) {
  // D1 batch: 하나의 트랜잭션으로 실행 (중간에 실패하면 전부 취소)
  await db.batch(list.map(sql => db.prepare(sql)));
}

export const onRequestGet = api(async ({ env }) => json({ ok: true, version: SCHEMA_VERSION, ...(await dbState(env.DB)) }));

export const onRequestPost = api(async (context) => {
  const db = context.env.DB;
  const state = await dbState(db);
  if (state.installed && state.admins > 0) {
    const admin = await currentAdmin(context);
    if (!admin) throw new HttpError('관리자 로그인이 필요합니다.', 401);
  }
  const b = await readBody(context.request);
  const action = b.action || 'install';
  if (action === 'install') {
    await applySchema(db);
    if (b.seed) { await runBatch(db, SEED_DEMO); await runSchedules(context.env, await getSettings(db), {}); }
  } else if (action === 'seed') {
    await applySchema(db);
    await runBatch(db, SEED_DEMO);
    await runSchedules(context.env, await getSettings(db), {});
  } else if (action === 'remove_demo') {
    if (!state.installed) throw new HttpError('DB가 아직 준비되지 않았습니다.');
    await runBatch(db, DEMO_DELETE);
  } else throw new HttpError('알 수 없는 요청입니다.');
  return json({ ok: true, ...(await dbState(db)) });
});
