# Checklist — Visibilidade das abas Projetos e Produção / Operações

Use após qualquer mudança em RBAC, `profile_type_permissions` ou `AppSidebar.tsx`.

## 0. Pré-requisitos
- [ ] Rodar `bunx vitest run src/test/permissions/sidebar-tabs-visibility.test.ts` — todos os testes verdes.
- [ ] Confirmar via SQL:
  ```sql
  SELECT pt.name, ptp.module, ptp.can_view
  FROM profile_types pt
  JOIN profile_type_permissions ptp ON ptp.profile_type_id = pt.id
  WHERE ptp.module IN ('operacional','producao')
  ORDER BY ptp.module, pt.name;
  ```

## 1. Matriz esperada na sidebar

| Perfil          | Projetos | Produção / Operações | Produção (legado) |
|-----------------|:--------:|:--------------------:|:-----------------:|
| owner           |    ✅    |          ✅          |        ✅         |
| administrador   |    ✅    |          ✅          |        ✅         |
| gestor          |    ✅    |          ✅          |        ✅         |
| operacional     |    ✅    |          ✅          |        ✅         |
| comercial       |    ✅    |          ✅          |        ✅         |
| controladoria   |    ✅    |          ✅          |        ✅         |
| auditoria       |    ✅    |          ✅          |        ✅         |
| financeiro      |    ❌    |          ❌          |        ❌         |

## 2. Roteiro de validação em lote (UI)

Para **cada** perfil da tabela acima:

- [ ] **Login** com usuário do perfil.
- [ ] **Limpar cache de permissões**: abrir DevTools → Application → Local Storage → limpar; ou hard refresh `Ctrl+Shift+R`.
- [ ] Sidebar mostra **Projetos** em `/projetos`? (esperado conforme matriz)
- [ ] Sidebar mostra **Produção** em `/producao-operacoes`? (esperado conforme matriz)
- [ ] Sidebar mostra **Produção (legado)** em `/producao`? (esperado conforme matriz)
- [ ] Clicar em cada aba visível abre a página sem erro 403 / "Sem permissão".
- [ ] Para o perfil `financeiro`: confirmar que as 3 abas ficam **ocultas** e que rotas diretas (`/projetos`, `/producao-operacoes`, `/producao`) bloqueiam o acesso.

## 3. Critério de aceite
- 7 perfis veem as 3 abas; `financeiro` não vê nenhuma.
- Testes automatizados verdes.
- Nenhum console error de permissão após refresh.
