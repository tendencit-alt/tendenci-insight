/**
 * Valida em lote que os perfis autorizados enxergam as abas
 * "Projetos" e "Produção / Operações" (módulo `operacional`) e
 * "Produção (legado)" (módulo `producao`) na sidebar.
 *
 * Fonte da verdade: tabela `profile_type_permissions` no Supabase.
 * O AppSidebar filtra cada item pelo `module` declarado em
 * `src/components/layout/AppSidebar.tsx` (linhas 150-152).
 *
 * Como rodar:
 *   bunx vitest run src/test/permissions/sidebar-tabs-visibility.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Perfis autorizados a ver Projetos + Produção/Operações (módulo `operacional`)
const EXPECTED_OPERACIONAL_VIEW = [
  "owner",
  "administrador",
  "gestor",
  "operacional",
  "comercial",
  "controladoria",
  "auditoria",
];
const EXPECTED_OPERACIONAL_DENIED = ["financeiro"];

// Mesmo conjunto para o módulo `producao` (Produção legado)
const EXPECTED_PRODUCAO_VIEW = EXPECTED_OPERACIONAL_VIEW;
const EXPECTED_PRODUCAO_DENIED = EXPECTED_OPERACIONAL_DENIED;

type Row = { module: string; can_view: boolean; profile_type_id: string };
type Profile = { id: string; name: string };

let rows: Row[] = [];
let profilesById = new Map<string, string>();

beforeAll(async () => {
  const [permRes, profRes] = await Promise.all([
    supabase
      .from("profile_type_permissions")
      .select("module, can_view, profile_type_id")
      .in("module", ["operacional", "producao"]),
    supabase.from("profile_types").select("id, name"),
  ]);
  if (permRes.error) throw permRes.error;
  if (profRes.error) throw profRes.error;
  rows = (permRes.data ?? []) as Row[];
  profilesById = new Map((profRes.data as Profile[]).map((p) => [p.id, p.name]));
});

function viewers(module: string): string[] {
  return rows
    .filter((r) => r.module === module && r.can_view)
    .map((r) => profilesById.get(r.profile_type_id))
    .filter((n): n is string => !!n)
    .sort();
}

function denied(module: string, allProfiles: string[]): string[] {
  const allowed = new Set(viewers(module));
  return allProfiles.filter((p) => !allowed.has(p)).sort();
}

describe("Sidebar — abas Projetos e Produção / Operações (módulo `operacional`)", () => {
  it.each(EXPECTED_OPERACIONAL_VIEW)(
    "perfil %s deve ter can_view=true em `operacional`",
    (profile) => {
      expect(viewers("operacional")).toContain(profile);
    },
  );

  it.each(EXPECTED_OPERACIONAL_DENIED)(
    "perfil %s NÃO deve ver `operacional`",
    (profile) => {
      expect(viewers("operacional")).not.toContain(profile);
    },
  );

  it("matriz exata de viewers de `operacional`", () => {
    expect(viewers("operacional")).toEqual([...EXPECTED_OPERACIONAL_VIEW].sort());
  });
});

describe("Sidebar — aba Produção (legado) (módulo `producao`)", () => {
  it.each(EXPECTED_PRODUCAO_VIEW)(
    "perfil %s deve ter can_view=true em `producao`",
    (profile) => {
      expect(viewers("producao")).toContain(profile);
    },
  );

  it.each(EXPECTED_PRODUCAO_DENIED)(
    "perfil %s NÃO deve ver `producao`",
    (profile) => {
      expect(viewers("producao")).not.toContain(profile);
    },
  );

  it("matriz exata de viewers de `producao`", () => {
    expect(viewers("producao")).toEqual([...EXPECTED_PRODUCAO_VIEW].sort());
  });
});

describe("Consistência cruzada", () => {
  it("operacional e producao devem ter a MESMA lista de viewers", () => {
    expect(viewers("producao")).toEqual(viewers("operacional"));
  });

  it("nenhum perfil esperado pode ficar sem registro em `producao`", () => {
    const all = [...EXPECTED_PRODUCAO_VIEW, ...EXPECTED_PRODUCAO_DENIED];
    const missing = denied("producao", all).filter(
      (p) => !EXPECTED_PRODUCAO_DENIED.includes(p),
    );
    expect(missing).toEqual([]);
  });
});
