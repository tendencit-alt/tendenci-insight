import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Testes automáticos dos redirects de dashboards.
 *
 * Estes testes leem o src/App.tsx e validam que as rotas legadas
 * /paineis, /dashboards e /painel continuam apontando para /dashboard
 * (DashboardSimple), e que /dashboard segue mapeado para DashboardSimple.
 *
 * Implementação como assertion estática em vez de browser E2E porque
 * o projeto não tem Playwright/Cypress configurado — vitest é o runner
 * disponível e este formato roda em <100ms no CI.
 */

const appSource = readFileSync(
  resolve(__dirname, "../App.tsx"),
  "utf-8"
);

describe("Dashboard redirects", () => {
  const cases: Array<[string, string]> = [
    ["/paineis", "/dashboard"],
    ["/dashboards", "/dashboard"],
    ["/painel", "/dashboard"],
  ];

  it.each(cases)("rota %s redireciona para %s", (from, to) => {
    const pattern = new RegExp(
      `<Route\\s+path=["']${from}["']\\s+element=\\{<Navigate\\s+to=["']${to}["']\\s+replace\\s*/>\\}\\s*/>`
    );
    expect(appSource).toMatch(pattern);
  });

  it("/dashboard renderiza DashboardSimple (versão de 4 KPIs)", () => {
    expect(appSource).toMatch(
      /<Route\s+path=["']\/dashboard["']\s+element=\{<ProtectedRoute><DashboardSimple\s*\/><\/ProtectedRoute>\}/
    );
  });

  it("/bi-dashboard-completo preserva a versão completa (DashboardBI)", () => {
    expect(appSource).toMatch(
      /<Route\s+path=["']\/bi-dashboard-completo["']\s+element=\{<ProtectedRoute><DashboardBI\s*\/><\/ProtectedRoute>\}/
    );
  });
});
