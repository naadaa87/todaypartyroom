// 실제 지점 자동 등록 — DB 업데이트(1.3) 때 한 번만 실행됩니다.
// 이미 같은 주소(slug)의 공간이 있으면 건너뛰고, 한 번 등록한 뒤에는 관리자가 지워도 다시 넣지 않습니다.
import { REAL_HOST, REAL_SPACES } from './seed-real-data.js';
import { todayStr, addDays } from './util.js';

export const REAL_SEED_KEY = 'seed_real_v1';
const NEW_AMENITIES = ['게임용 PC', '반려동물 동반'];

export async function applyRealSeed(db) {
  const done = await db.prepare(`SELECT value FROM settings WHERE key = ?`).bind(REAL_SEED_KEY).first();
  if (done) return 0;
  // 편의시설 목록에 새 항목 추가(호스트 화면 체크박스에 보이도록)
  const am = await db.prepare(`SELECT value FROM settings WHERE key = 'amenities'`).first();
  let list = []; try { list = JSON.parse(am?.value || '[]'); } catch { list = []; }
  const add = NEW_AMENITIES.filter(a => !list.includes(a));
  const until = addDays(todayStr(), 365);
  const st = [];
  if (add.length) st.push(db.prepare(`INSERT INTO settings (key, value) VALUES ('amenities', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(JSON.stringify([...list, ...add])));
  // 호스트: 로그인 비밀번호가 없는 운영 계정(관리자 → 호스트 → 로그인 정보에서 이메일·비밀번호를 정하거나 '호스트센터 열기'로 관리)
  st.push(db.prepare(`INSERT OR IGNORE INTO hosts (email, password_hash, name, phone, status) VALUES (?, '!locked', ?, ?, 'active')`).bind(REAL_HOST.email, REAL_HOST.name, REAL_HOST.phone));
  const HOST_ID = `(SELECT id FROM hosts WHERE email = '${REAL_HOST.email}')`;
  for (const s of REAL_SPACES) {
    const SID = `(SELECT id FROM spaces WHERE slug = '${s.slug}')`;
    st.push(db.prepare(`INSERT INTO spaces (host_id, slug, name, intro, description, address, region_id, capacity_std, capacity_max, area_m2, floor_info, parking, amenities_json, rules, refund_policy, transport, deposit_text, booking_type, booking_url, booking_tel, booking_kakao, photos_json, status, subscription_status, subscription_until)
      SELECT ${HOST_ID}, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'link', ?, ?, ?, ?, 'approved', 'active', ?
      WHERE NOT EXISTS (SELECT 1 FROM spaces WHERE slug = ?)`).bind(
      s.slug, s.name, s.intro, s.description, s.address, s.region_id, s.capacity_std, s.capacity_max, s.area_m2, s.floor_info, s.parking,
      JSON.stringify(s.amenities), s.rules, s.refund_policy, s.transport, s.deposit_text, s.booking_url, REAL_HOST.phone, REAL_HOST.kakao,
      JSON.stringify(s.photos), until, s.slug));
    s.slots.forEach((sl, i) => {
      st.push(db.prepare(`INSERT INTO slots (space_id, name, kind, start_time, end_time, price_weekday, price_weekend, price_fri, price_sun, base_people, extra_fee, sort)
        SELECT ${SID}, ?, 'package', ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE ${SID} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM slots WHERE space_id = ${SID} AND name = ?)`).bind(
        sl.name, sl.start, sl.end, sl.wk, sl.sat, sl.fri === sl.wk ? null : sl.fri, sl.sun === sl.sat ? null : sl.sun, sl.base, sl.extra, i + 1, sl.name));
    });
    for (const t of s.themes) st.push(db.prepare(`INSERT OR IGNORE INTO space_themes (space_id, theme_id) SELECT s.id, t.id FROM spaces s, themes t WHERE s.slug = ? AND t.slug = ?`).bind(s.slug, t));
  }
  st.push(db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING`).bind(REAL_SEED_KEY, todayStr()));
  await db.batch(st);
  return REAL_SPACES.length;
}
