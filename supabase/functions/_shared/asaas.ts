// Helpers compartilhados Asaas
export const ASAAS_BASE = Deno.env.get("ASAAS_BASE_URL") ?? "https://www.asaas.com/api/v3";

export function getAsaasKey(): string | null {
  return Deno.env.get("ASAAS_API_KEY") ?? null;
}

export async function asaasFetch(path: string, init: RequestInit = {}) {
  const key = getAsaasKey();
  if (!key) {
    throw new Error("ASAAS_API_KEY_MISSING");
  }
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: key,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    throw new Error(`ASAAS_${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
