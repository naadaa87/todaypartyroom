import { api, requireAdmin } from '../../../lib/auth.js';
import { all, run } from '../../../lib/db.js';
import { json, err, readBody } from '../../../lib/util.js';
const ALLOWED = ['site_name', 'site_tagline', 'company_name', 'company_info', 'contact_email', 'contact_kakao', 'host_fee_text', 'trial_days', 'index_min_spaces', 'deal_cutoff_minutes', 'holidays', 'footer_links', 'amenities', 'bank_account'];
export const onRequestGet = api(async (context) => { await requireAdmin(context); return json({ ok: true, settings: Object.fromEntries((await all(context.env.DB, 'SELECT key, value FROM settings')).map(r => [r.key, r.value])) }); });
export const onRequestPut = api(async (context) => {
  await requireAdmin(context); const b = await readBody(context.request);
  for (const [k, v] of Object.entries(b)) {
    if (!ALLOWED.includes(k)) continue;
    let val = typeof v === 'string' ? v : JSON.stringify(v);
    if (['holidays', 'footer_links', 'amenities'].includes(k)) { try { JSON.parse(val); } catch { return err(`${k} 값은 JSON 형식이어야 합니다.`); } }
    await run(context.env.DB, 'INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [k, val.slice(0, 20000)]);
  }
  return json({ ok: true });
});
