import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// ---------- helpers ----------
function validateCnpj(raw: string): boolean {
  const c = (raw || "").replace(/\D/g, "");
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

function validateEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
}

function validatePassword(p: string): boolean {
  if (!p || p.length < 8) return false;
  // ao menos uma letra e um número
  return /[A-Za-z]/.test(p) && /\d/.test(p);
}

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "empresa";
}

// ---------- handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Resolve client IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  try {
    const body = await req.json().catch(() => ({}));
    const company_name: string = (body.company_name || "").toString().trim();
    const cnpj: string = (body.cnpj || "").toString().trim();
    const email: string = (body.email || "").toString().trim().toLowerCase();
    const password: string = (body.password || "").toString();
    const full_name: string = (body.full_name || "").toString().trim() || "Administrador";
    const accepted_terms: boolean = !!body.accepted_terms;

    // ---- validations ----
    if (!company_name || company_name.length < 2 || company_name.length > 120) {
      return json({ error: "Nome da empresa inválido" }, 400);
    }
    if (!validateCnpj(cnpj)) return json({ error: "CNPJ inválido" }, 400);
    if (!validateEmail(email)) return json({ error: "Email inválido" }, 400);
    if (!validatePassword(password)) {
      return json({ error: "Senha fraca (mínimo 8 caracteres com letras e números)" }, 400);
    }
    if (!accepted_terms) return json({ error: "Você precisa aceitar os Termos e Política" }, 400);

    // ---- rate limit (10/hora por IP) ----
    const { data: rl } = await admin
      .from("rate_limit_signup")
      .select("*")
      .eq("ip", ip)
      .maybeSingle();

    const now = new Date();
    const oneHourMs = 60 * 60 * 1000;
    if (rl) {
      const windowStart = new Date(rl.window_start);
      if (now.getTime() - windowStart.getTime() > oneHourMs) {
        await admin
          .from("rate_limit_signup")
          .update({ attempts: 1, window_start: now.toISOString(), last_attempt_at: now.toISOString() })
          .eq("ip", ip);
      } else if (rl.attempts >= 10) {
        return json({ error: "Limite de tentativas excedido. Tente novamente em 1 hora." }, 429);
      } else {
        await admin
          .from("rate_limit_signup")
          .update({ attempts: rl.attempts + 1, last_attempt_at: now.toISOString() })
          .eq("ip", ip);
      }
    } else {
      await admin
        .from("rate_limit_signup")
        .insert({ ip, attempts: 1, window_start: now.toISOString(), last_attempt_at: now.toISOString() });
    }

    // ---- uniqueness ----
    const cnpjNum = cnpj.replace(/\D/g, "");
    const { data: cnpjDup } = await admin.from("tenants").select("id").eq("cnpj", cnpjNum).maybeSingle();
    if (cnpjDup) return json({ error: "CNPJ já cadastrado" }, 409);

    const { data: emailDup } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (emailDup) return json({ error: "Email já cadastrado" }, 409);

    // ---- unique slug ----
    let base = slugify(company_name);
    let slug = base;
    for (let i = 0; i < 10; i++) {
      const { data: exists } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
      if (!exists) break;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // ---- create tenant ----
    const { data: tenant, error: tenantErr } = await admin
      .from("tenants")
      .insert({ name: company_name, slug, cnpj: cnpjNum, active: true })
      .select()
      .single();
    if (tenantErr) throw new Error("Falha ao criar empresa: " + tenantErr.message);

    // ---- create auth user ----
    const { data: createdUser, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // user can login immediately
      user_metadata: { full_name, tenant_id: tenant.id },
    });
    if (userErr || !createdUser?.user) {
      await admin.from("tenants").delete().eq("id", tenant.id);
      throw new Error("Falha ao criar usuário: " + (userErr?.message ?? "desconhecido"));
    }
    const userId = createdUser.user.id;

    // ---- lookup admin profile_type (global master) ----
    const { data: ptype } = await admin
      .from("profile_types")
      .select("id")
      .eq("name", "master")
      .is("tenant_id", null)
      .maybeSingle();

    // ---- profile (the trigger on auth.users may have created one already) ----
    const username = email.split("@")[0] + "-" + Math.random().toString(36).slice(2, 6);
    const profilePayload: Record<string, unknown> = {
      id: userId,
      email,
      full_name,
      username,
      tenant_id: tenant.id,
      current_tenant_id: tenant.id,
      is_owner: false,
      role: "admin",
    };
    if (ptype?.id) profilePayload.profile_type_id = ptype.id;

    const { error: profileErr } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });
    if (profileErr) {
      await admin.auth.admin.deleteUser(userId);
      await admin.from("tenants").delete().eq("id", tenant.id);
      throw new Error("Falha ao vincular usuário: " + profileErr.message);
    }

    // ---- provisioning (best-effort, never break signup) ----
    const provisioningResults: Record<string, string> = {};
    const tryRpc = async (fn: string, args: Record<string, unknown>) => {
      const { error } = await admin.rpc(fn, args);
      provisioningResults[fn] = error ? `error: ${error.message}` : "ok";
    };
    await tryRpc("seed_chart_of_accounts_from_owner", { p_tenant_id: tenant.id });
    await tryRpc("mirror_owner_strategic_configs_to_tenant", { p_tenant_id: tenant.id });
    await tryRpc("clone_production_types_from_owner", { p_tenant_id: tenant.id });
    await tryRpc("seed_default_cost_centers", { p_tenant_id: tenant.id });

    // ---- subscription ----
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await admin.from("tenant_subscriptions").insert({
      tenant_id: tenant.id,
      plan_slug: "essencial",
      status: "trialing",
      trial_ends_at: trialEnds.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEnds.toISOString(),
    });

    // ---- audit ----
    await admin.from("audit_log").insert({
      tenant_id: tenant.id,
      user_id: userId,
      table_name: "tenants",
      record_id: tenant.id,
      event_type: "tenant_signup",
      event_source: "public_signup",
      ip_address: ip,
      user_agent: req.headers.get("user-agent") || null,
      new_value: company_name,
      metadata: { email, provisioning: provisioningResults },
    });

    // Welcome email (fire-and-forget — não bloqueia signup se falhar)
    try {
      await admin.functions.invoke("send-email", {
        body: {
          template_id: "welcome_signup",
          to: email,
          tenant_id: tenant.id,
          user_id: userId,
          variables: { nome: full_name, empresa: company_name },
        },
      });
    } catch (e) {
      console.warn("welcome_signup email dispatch failed:", e);
    }

    return json({
      success: true,
      tenant_id: tenant.id,
      tenant_slug: slug,
      user_id: userId,
      email,
      trial_ends_at: trialEnds.toISOString(),
    });
  } catch (e: any) {
    console.error("public-signup-tenant error:", e);
    return json({ error: e?.message || "Erro interno" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
