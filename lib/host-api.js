// 호스트 API 공통: 소유권 확인, 공간 직렬화, 검증
import { one, all } from './db.js';
import { HttpError } from './auth.js';
import { parseJSON, slugify, toInt, clamp } from './util.js';

export async function ownSpace(env, host, id) {
  const s = await one(env.DB, 'SELECT * FROM spaces WHERE id = ? AND host_id = ?', [Number(id), host.id]);
  if (!s) throw new HttpError('공간을 찾을 수 없습니다.', 404);
  return s;
}

export async function uniqueSlug(env, base, excludeId = null, fallback = 'space') {
  const root = slugify(base) || fallback;
  let slug = root, n = 1;
  while (true) {
    const row = await one(env.DB, 'SELECT id FROM spaces WHERE slug = ?', [slug]);
    if (!row || row.id === excludeId) return slug;
    n += 1; slug = `${root}-${n}`;
  }
}
/** 기본 슬러그: {상권slug}-{id} */
export async function defaultSlug(env, space) {
  let r = null;
  if (space.region_id) r = await one(env.DB, 'SELECT slug FROM regions WHERE id = ?', [space.region_id]);
  return `${r ? r.slug : 'space'}-${space.id}`;
}

const TEXT_FIELDS = ['name', 'intro', 'description', 'address', 'address_detail', 'floor_info', 'parking', 'rules', 'refund_policy', 'transport', 'deposit_text', 'booking_url', 'booking_tel', 'booking_kakao', 'deal_link'];
const LIMITS = { name: 60, intro: 120, description: 4000, address: 200, address_detail: 200, floor_info: 60, parking: 100, rules: 2000, refund_policy: 2000, transport: 300, deposit_text: 200, booking_url: 500, booking_tel: 20, booking_kakao: 500, deal_link: 500 };

/** 요청 본문 → 업데이트 가능한 필드 객체 */
export function pickSpaceFields(b) {
  const out = {};
  for (const f of TEXT_FIELDS) if (b[f] !== undefined) out[f] = String(b[f] || '').slice(0, LIMITS[f]);
  if (b.booking_tel !== undefined) out.booking_tel = String(b.booking_tel || '').replace(/[^0-9-]/g, '').slice(0, 20);
  for (const u of ['booking_url', 'booking_kakao', 'deal_link']) if (out[u] && !/^https?:\/\//.test(out[u])) throw new HttpError(`${u === 'booking_url' ? '예약 링크' : u === 'booking_kakao' ? '카카오톡 링크' : '딜 전용 링크'}는 http(s)://로 시작해야 합니다.`);
  if (b.slug !== undefined && String(b.slug).trim()) { const sl = slugify(b.slug); if (!sl || sl.length < 3) throw new HttpError('영문 주소(slug)는 영문 소문자·숫자·하이픈 3자 이상이어야 합니다.'); out.slug = sl; }
  if (b.booking_type !== undefined) out.booking_type = ['link', 'tel', 'kakao', 'web'].includes(b.booking_type) ? b.booking_type : 'link';
  if (b.region_id !== undefined) out.region_id = toInt(b.region_id, null);
  if (b.capacity_std !== undefined) out.capacity_std = clamp(toInt(b.capacity_std, 4), 1, 500);
  if (b.capacity_max !== undefined) out.capacity_max = clamp(toInt(b.capacity_max, 10), 1, 1000);
  if (b.area_m2 !== undefined) out.area_m2 = b.area_m2 === '' || b.area_m2 == null ? null : Number(b.area_m2);
  if (b.lat !== undefined) out.lat = b.lat === '' ? null : Number(b.lat);
  if (b.lng !== undefined) out.lng = b.lng === '' ? null : Number(b.lng);
  if (b.amenities !== undefined) out.amenities_json = JSON.stringify((Array.isArray(b.amenities) ? b.amenities : []).map(String).slice(0, 40));
  if (b.photos !== undefined) out.photos_json = JSON.stringify((Array.isArray(b.photos) ? b.photos : []).map(String).filter(u => /^(https?:\/\/|\/img\/)/.test(u)).slice(0, 30));
  return out;
}

export async function serializeSpace(env, s) {
  const [slots, themes, rule] = await Promise.all([
    all(env.DB, 'SELECT * FROM slots WHERE space_id = ? AND active = 1 ORDER BY sort, id', [s.id]),
    all(env.DB, 'SELECT theme_id FROM space_themes WHERE space_id = ?', [s.id]),
    one(env.DB, 'SELECT * FROM auto_rules WHERE space_id = ?', [s.id]),
  ]);
  return { ...s, amenities: parseJSON(s.amenities_json, []), photos: parseJSON(s.photos_json, []), slots, theme_ids: themes.map(t => t.theme_id), rule: rule ? { ...rule, steps: parseJSON(rule.steps_json, []), floors: parseJSON(rule.floor_json, {}), exclude_days: parseJSON(rule.exclude_days_json, []), exclude_slots: parseJSON(rule.exclude_slots_json, []) } : null };
}

/** 검수 제출 전 자동 검사 */
export function checkReady(s, slots) {
  const issues = [];
  const photos = parseJSON(s.photos_json, []);
  if (!s.name || s.name.length < 2) issues.push('공간 이름을 입력하세요.');
  if (!s.region_id) issues.push('지역(상권)을 선택하세요.');
  if (!s.address) issues.push('주소를 입력하세요.');
  if (photos.length < 3) issues.push(`사진이 ${photos.length}장입니다. 최소 3장(권장 10장)을 올려 주세요.`);
  if (!s.intro) issues.push('한 줄 소개를 입력하세요.');
  if ((s.description || '').length < 100) issues.push('공간 소개를 100자 이상 적어 주세요.');
  if (!slots.length) issues.push('이용 시간(슬롯)과 요금을 1개 이상 등록하세요.');
  if (!s.booking_url && !s.booking_tel && !s.booking_kakao) issues.push('예약 채널(링크·전화·카카오톡) 중 하나는 입력하세요.');
  if (s.capacity_max < s.capacity_std) issues.push('최대 인원은 기준 인원보다 커야 합니다.');
  return issues;
}

/* ---------- 반복 딜(스케줄) 검증 ---------- */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
export function validateSchedule(b, slots, todayStrValue) {
  const type = ['TIME', 'HOT', 'FLASH', 'EVENT', 'TODAY', 'TOMORROW'].includes(b.type) ? b.type : null;
  if (!type) throw new HttpError('딜 유형을 선택하세요.');
  const days = [...new Set((Array.isArray(b.days) ? b.days : []).map(Number).filter(n => n >= 0 && n <= 6))].sort();
  if (!days.length) throw new HttpError('반복할 요일을 하나 이상 고르세요.');
  const own = new Set(slots.map(s => s.id));
  const slotIds = [...new Set((Array.isArray(b.slot_ids) ? b.slot_ids : []).map(Number).filter(id => own.has(id)))];
  if (!slotIds.length) throw new HttpError('대상 슬롯을 하나 이상 고르세요.');
  let lead = clamp(toInt(b.lead_days, 0), 0, 7);
  if (type === 'TODAY') lead = 0;
  if (type === 'TOMORROW') lead = 1;
  const openTime = HHMM.test(b.open_time || '') ? b.open_time : null;
  if (!openTime) throw new HttpError('여는 시각을 HH:MM 형식으로 입력하세요.');
  let duration = b.duration_min === '' || b.duration_min == null ? null : toInt(b.duration_min, 0);
  if (type === 'FLASH') { duration = clamp(duration || 120, 60, 180); }
  if (type === 'TIME') { if (!duration) throw new HttpError('타임딜은 진행 시간을 정해야 합니다.'); duration = clamp(duration, 30, 1440); }
  if (duration != null && duration < 30) throw new HttpError('진행 시간은 30분 이상이어야 합니다.');
  let mode = ['RATE', 'AMOUNT', 'FIXED'].includes(b.discount_mode) ? b.discount_mode : 'RATE';
  let value = toInt(b.discount_value, 0);
  const benefit = String(b.benefit_text || '').trim().slice(0, 200);
  if (type === 'EVENT') { mode = 'RATE'; value = 0; if (benefit.length < 2) throw new HttpError('이벤트 혜택 내용을 입력하세요.'); }
  else {
    if (mode === 'RATE' && (value < 1 || value > 90)) throw new HttpError('할인율은 1~90% 사이로 입력하세요.');
    if (mode !== 'RATE' && value < 1000) throw new HttpError('금액은 1,000원 이상 입력하세요.');
    if (type === 'HOT' && mode === 'RATE' && value < 10) throw new HttpError('핫딜은 10% 이상이어야 합니다.');
  }
  let quantity = b.quantity === '' || b.quantity == null ? null : clamp(toInt(b.quantity, 1), 1, 999);
  if (type === 'FLASH') quantity = clamp(quantity || 1, 1, 2);
  const start = YMD.test(b.start_date || '') ? b.start_date : todayStrValue;
  const end = YMD.test(b.end_date || '') ? b.end_date : null;
  if (end && end < start) throw new HttpError('종료일이 시작일보다 빠릅니다.');
  const skip = [...new Set((Array.isArray(b.skip_dates) ? b.skip_dates : String(b.skip_dates || '').split(/[\s,]+/)).filter(d => YMD.test(d)))].sort().slice(0, 60);
  const link = /^https?:\/\//.test(b.deal_link || '') ? String(b.deal_link).slice(0, 500) : '';
  return {
    name: String(b.name || '').trim().slice(0, 40), type, days_json: JSON.stringify(days), slot_ids_json: JSON.stringify(slotIds), lead_days: lead, open_time: openTime, duration_min: duration,
    discount_mode: mode, discount_value: value, floor_price: Math.max(0, toInt(b.floor_price, 0)), quantity, only_vacant: b.only_vacant === false || b.only_vacant === 0 || b.only_vacant === '0' ? 0 : 1,
    benefit_text: benefit, deal_link: link, start_date: start, end_date: end, skip_dates_json: JSON.stringify(skip), enabled: b.enabled === false || b.enabled === 0 ? 0 : 1,
  };
}
export const SCHEDULE_FIELDS = ['name', 'type', 'days_json', 'slot_ids_json', 'lead_days', 'open_time', 'duration_min', 'discount_mode', 'discount_value', 'floor_price', 'quantity', 'only_vacant', 'benefit_text', 'deal_link', 'start_date', 'end_date', 'skip_dates_json', 'enabled'];
