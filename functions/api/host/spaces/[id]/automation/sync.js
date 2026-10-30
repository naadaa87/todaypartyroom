// POST /api/host/spaces/:id/automation/sync — 캘린더 연동 지금 실행
import { api, requireHost } from '../../../../../../lib/auth.js';
import { getSettings } from '../../../../../../lib/db.js';
import { json } from '../../../../../../lib/util.js';
import { ownSpace } from '../../../../../../lib/host-api.js';
import { syncIcal, runSchedules } from '../../../../../../lib/automation.js';
export const onRequestPost = api(async (context) => {
  const host = await requireHost(context);
  const s = await ownSpace(context.env, host, context.params.id);
  const settings = await getSettings(context.env.DB);
  const r = await syncIcal(context.env, settings, s.id);
  if (r.ok) await runSchedules(context.env, settings, { spaceIds: [s.id] });
  return json({ ok: r.ok, ...r });
});
