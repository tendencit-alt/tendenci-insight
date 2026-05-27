// Server-side simulation of TimeClockPunchDialog flow.
// Uses service role to: upload a real JPEG to hr-time-photos (private bucket),
// compute geofence distance/within_fence respecting geofence_mode,
// upsert hr_time_records (one row per employee+work_date for time_in/time_out),
// and return a signed URL for the uploaded photo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1x1 red JPEG (real bytes — produces a valid file in storage)
const JPEG_BYTES = new Uint8Array([
  0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,
  0x00,0x01,0x00,0x00,0xff,0xdb,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,
  0x07,0x07,0x07,0x09,0x09,0x08,0x0a,0x0c,0x14,0x0d,0x0c,0x0b,0x0b,0x0c,0x19,0x12,
  0x13,0x0f,0x14,0x1d,0x1a,0x1f,0x1e,0x1d,0x1a,0x1c,0x1c,0x20,0x24,0x2e,0x27,0x20,
  0x22,0x2c,0x23,0x1c,0x1c,0x28,0x37,0x29,0x2c,0x30,0x31,0x34,0x34,0x34,0x1f,0x27,
  0x39,0x3d,0x38,0x32,0x3c,0x2e,0x33,0x34,0x32,0xff,0xc0,0x00,0x0b,0x08,0x00,0x01,
  0x00,0x01,0x01,0x01,0x11,0x00,0xff,0xc4,0x00,0x1f,0x00,0x00,0x01,0x05,0x01,0x01,
  0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,
  0x05,0x06,0x07,0x08,0x09,0x0a,0x0b,0xff,0xc4,0x00,0xb5,0x10,0x00,0x02,0x01,0x03,
  0x03,0x02,0x04,0x03,0x05,0x05,0x04,0x04,0x00,0x00,0x01,0x7d,0x01,0x02,0x03,0x00,
  0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,0x22,0x71,0x14,0x32,
  0x81,0x91,0xa1,0x08,0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,0x24,0x33,0x62,0x72,
  0x82,0xff,0xda,0x00,0x08,0x01,0x01,0x00,0x00,0x3f,0x00,0xfb,0xd0,0xff,0xd9,
]);

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { employee_id, kind, lat, lng, accuracy = 12 } = await req.json();
    if (!employee_id || !["in", "out"].includes(kind) || typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: emp, error: empErr } = await admin.from("hr_employees").select("id, tenant_id, name").eq("id", employee_id).single();
    if (empErr || !emp?.tenant_id) throw new Error("employee not found / no tenant");

    const { data: locs } = await admin.from("hr_work_locations").select("id, name, latitude, longitude, radius_m, active").eq("tenant_id", emp.tenant_id).eq("active", true);
    const { data: settings } = await admin.from("hr_settings").select("geofence_mode").eq("tenant_id", emp.tenant_id).maybeSingle();
    const mode = settings?.geofence_mode ?? "warn";

    let best: any = null; let bestDist = Infinity;
    for (const l of (locs ?? [])) {
      const d = distanceMeters(lat, lng, Number(l.latitude), Number(l.longitude));
      if (d < bestDist) { bestDist = d; best = l; }
    }
    const within = best ? bestDist <= Number(best.radius_m) : null;
    const blocked = mode === "block" && within === false;
    if (blocked) {
      return new Response(JSON.stringify({ error: "blocked by geofence", distance_m: bestDist }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const today = new Date().toISOString().slice(0, 10);
    const ts = Date.now();
    const key = `${emp.tenant_id}/${emp.id}/${today}_${kind}_${ts}.jpg`;
    const up = await admin.storage.from("hr-time-photos").upload(key, JPEG_BYTES, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw up.error;

    const nowIso = new Date().toISOString();
    const nowTime = nowIso.slice(11, 19);
    const fenceFields = within == null ? {} : kind === "in"
      ? { time_in_within_fence: within, time_in_location_id: best?.id ?? null }
      : { time_out_within_fence: within, time_out_location_id: best?.id ?? null };
    const patch: any = kind === "in"
      ? { time_in: nowTime, time_in_at: nowIso, time_in_photo_path: up.data.path, time_in_lat: lat, time_in_lng: lng, time_in_accuracy: accuracy, ...fenceFields }
      : { time_out: nowTime, time_out_at: nowIso, time_out_photo_path: up.data.path, time_out_lat: lat, time_out_lng: lng, time_out_accuracy: accuracy, ...fenceFields };

    const { data: existing } = await admin.from("hr_time_records").select("id").eq("employee_id", emp.id).eq("work_date", today).maybeSingle();
    let recordId: string;
    if (existing) {
      const { data, error } = await admin.from("hr_time_records").update(patch).eq("id", existing.id).select("*").single();
      if (error) throw error; recordId = data.id;
    } else {
      const { data, error } = await admin.from("hr_time_records").insert({ tenant_id: emp.tenant_id, employee_id: emp.id, work_date: today, ...patch }).select("*").single();
      if (error) throw error; recordId = data.id;
    }

    const signed = await admin.storage.from("hr-time-photos").createSignedUrl(up.data.path, 600);
    const { data: record } = await admin.from("hr_time_records").select("*").eq("id", recordId).single();

    return new Response(JSON.stringify({
      ok: true, kind, employee: { id: emp.id, name: emp.name, tenant_id: emp.tenant_id },
      geofence: { mode, nearest: best?.name ?? null, distance_m: Math.round(bestDist), radius_m: best?.radius_m ?? null, within_fence: within },
      photo: { path: up.data.path, signed_url: signed.data?.signedUrl ?? null, expires_in: 600 },
      record,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
