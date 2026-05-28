/**
 * Valida o resolver de permissões granular (mesma lógica do front e da
 * função SQL `verificar_acesso_por_perfil`) cobrindo:
 *   - cascata raiz → folha
 *   - override explícito por folha
 *   - herança do módulo agregado quando a folha não tem override
 *
 * Para cada folha do MENU_PERMISSION_MAP rodamos 4 cenários:
 *   somente VER / somente CRIAR / somente EDITAR / somente EXCLUIR
 * e validamos que apenas a ação habilitada retorna true.
 */
import { describe, it, expect } from 'vitest';
import { MENU_PERMISSION_MAP } from '@/config/menuPermissionMap';

type Action = 'view' | 'create' | 'edit' | 'delete';
const ACTIONS: Action[] = ['view', 'create', 'edit', 'delete'];

interface ModulePerm { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; }
interface FeatureOv { can_view: boolean | null; can_create: boolean | null; can_edit: boolean | null; can_delete: boolean | null; }

/** Espelho TS do `verificar_acesso_por_perfil`. */
function resolve(
  modules: Record<string, ModulePerm>,
  overrides: Record<string, FeatureOv>,
  module: string,
  featureKey: string,
  action: Action,
): boolean {
  const col = `can_${action}` as keyof ModulePerm;
  const ov = overrides[featureKey];
  if (ov && ov[col] !== null && ov[col] !== undefined) return !!ov[col];
  const mod = modules[module];
  return !!(mod && mod[col]);
}

const ALL_LEAVES = MENU_PERMISSION_MAP.flatMap(r => r.leaves.map(l => ({ ...l, root: r.label })));

describe('Permission resolver — leaf x action matrix', () => {
  for (const action of ACTIONS) {
    it(`somente "${action}" habilitado: cobre todas as folhas (${ALL_LEAVES.length})`, () => {
      const failures: string[] = [];
      for (const leaf of ALL_LEAVES) {
        const overrides: Record<string, FeatureOv> = {
          [leaf.key]: {
            can_view: action === 'view',
            can_create: action === 'create',
            can_edit: action === 'edit',
            can_delete: action === 'delete',
          },
        };
        for (const a of ACTIONS) {
          const expected = a === action;
          const actual = resolve({}, overrides, leaf.module, leaf.key, a);
          if (actual !== expected) {
            failures.push(`${leaf.root} > ${leaf.label} (${leaf.key}) ${a}: esperado=${expected} recebido=${actual}`);
          }
        }
      }
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }

  it('herança: liberar módulo agregado libera todas as folhas daquele módulo', () => {
    const modules: Record<string, ModulePerm> = {
      comercial: { can_view: true, can_create: false, can_edit: false, can_delete: false },
    };
    const inCommercial = ALL_LEAVES.filter(l => l.module === 'comercial');
    const outside = ALL_LEAVES.filter(l => l.module !== 'comercial');
    expect(inCommercial.length).toBeGreaterThan(0);
    for (const l of inCommercial) {
      expect(resolve(modules, {}, l.module, l.key, 'view'), `${l.label} deveria herdar view`).toBe(true);
    }
    for (const l of outside) {
      expect(resolve(modules, {}, l.module, l.key, 'view'), `${l.label} não deveria vazar`).toBe(false);
    }
  });

  it('override por folha vence o módulo agregado', () => {
    const modules: Record<string, ModulePerm> = {
      comercial: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    };
    const overrides: Record<string, FeatureOv> = {
      '/contatos': { can_view: false, can_create: null, can_edit: null, can_delete: null },
    };
    expect(resolve(modules, overrides, 'comercial', '/contatos', 'view')).toBe(false);
    // ações sem override caem no módulo
    expect(resolve(modules, overrides, 'comercial', '/contatos', 'create')).toBe(true);
    expect(resolve(modules, overrides, 'comercial', '/contatos', 'edit')).toBe(true);
    expect(resolve(modules, overrides, 'comercial', '/contatos', 'delete')).toBe(true);
    // outras folhas do módulo continuam true
    expect(resolve(modules, overrides, 'comercial', '/crm', 'view')).toBe(true);
  });

  it('sem registros: tudo false (default seguro)', () => {
    for (const leaf of ALL_LEAVES) {
      for (const a of ACTIONS) {
        expect(resolve({}, {}, leaf.module, leaf.key, a)).toBe(false);
      }
    }
  });
});
