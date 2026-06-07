import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CommandBar } from "@/components/command/CommandBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MinimizedDialogsProvider } from "@/contexts/MinimizedDialogsContext";
import { MinimizedDialogsBar } from "@/components/ui/MinimizedDialogsBar";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { PermissionSimulationProvider } from "@/contexts/PermissionSimulationContext";
import { SimulationBanner } from "@/components/smart-permissions/SimulationBanner";


import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { FeatureGate } from "@/components/auth/FeatureGate";
import Assinatura from "./pages/Assinatura";
import { DynamicRouteHandler } from "@/components/routing/DynamicRouteHandler";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProjectSettings from "./pages/ProjectSettings";
import UserManagement from "./pages/UserManagement";
import ConfiguracoesCatalogo from "./pages/ConfiguracoesCatalogo";
import ConfiguracoesModulos from "./pages/ConfiguracoesModulos";
import Perfil from "./pages/Perfil";


import Auth from "./pages/Auth";
import Cadastro from "./pages/Cadastro";
import BoasVindas from "./pages/BoasVindas";

import Orders from "./pages/Orders";
import Suppliers from "./pages/Suppliers";
import Clientes from "./pages/Clientes";
import Contatos from "./pages/Contatos";
import Leads from "./pages/Leads";

import Notificacoes from "./pages/Notificacoes";
import Inventory from "./pages/Inventory";
import Produtos from "./pages/Produtos";


import Catalogo from "./pages/Catalogo";
import CatalogoPublico from "./pages/CatalogoPublico";
import CatalogoPublicoProduto from "./pages/CatalogoPublicoProduto";
import Financeiro from "./pages/Financeiro";
import CadastrosFinanceiros from "./pages/CadastrosFinanceiros";
import FinanceiroRhPj from "./pages/FinanceiroRhPj";
import Bancos from "./pages/Bancos";

import ResetPassword from "./pages/ResetPassword";
import SuperAdmin from "./pages/SuperAdmin";
import Onboarding from "./pages/Onboarding";
import SmartOnboarding from "./pages/SmartOnboarding";



import Documentos from "./pages/Documentos";
import Tarefas from "./pages/Tarefas";

import Relatorios from "./pages/Relatorios";
import DataFlowMap from "./pages/DataFlowMap";
import HomeLauncher from "./pages/HomeLauncher";
import HomeHoje from "./pages/HomeHoje";
import DashboardSimple from "./pages/DashboardSimple";
import DashboardBI from "./pages/DashboardBI";
import RecursosHumanos from "./pages/RecursosHumanos";
import ProducaoOperacoes from "./pages/ProducaoOperacoes";

import CRM from "./pages/CRM";
import Compras from "./pages/Compras";
import EntregasMontagem from "./pages/EntregasMontagem";

import Planning from "./pages/Planning";
import ExecutiveCenter from "./pages/ExecutiveCenter";
import AccessGovernance from "./pages/AccessGovernance";
import Billing from "./pages/Billing";
import CustomerLifecycle from "./pages/CustomerLifecycle";
import CustomerSuccessOps from "./pages/CustomerSuccessOps";

import InProductEducation from "./pages/InProductEducation";

import ControlTower from "./pages/ControlTower";
import SmartAdmin from "./pages/SmartAdmin";
import BillingOps from "./pages/BillingOps";

import Empresas from "./pages/Empresas";
import OwnerControlTower from "./pages/OwnerControlTower";
import AutomationCenter from "./pages/AutomationCenter";
import OwnerEntitlementsCenter from "./pages/OwnerEntitlementsCenter";
import OwnerUpgradeCenter from "./pages/OwnerUpgradeCenter";
import OwnerDependencyImpact from "./pages/OwnerDependencyImpact";
import OwnerRunbooks from "./pages/OwnerRunbooks";
import OwnerSelfHealing from "./pages/OwnerSelfHealing";
import OwnerArchitectureBoard from "./pages/OwnerArchitectureBoard";
import OwnerStabilityGates from "./pages/OwnerStabilityGates";
import OwnerAutonomousRecovery from "./pages/OwnerAutonomousRecovery";
import OwnerCapacityRisk from "./pages/OwnerCapacityRisk";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <MinimizedDialogsProvider>
            <MinimizedDialogsBar />
            <PermissionsProvider>
            <PermissionSimulationProvider>
            
              <SimulationBanner />
              <CommandBar />
               <Routes>
              

              {/* Autenticação (PT canônico + redirects EN) */}
              <Route path="/autenticacao" element={<Auth />} />
              <Route path="/auth" element={<Navigate to="/autenticacao" replace />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route path="/reset-password" element={<Navigate to="/redefinir-senha" replace />} />

              {/* Cadastro público (signup de novo tenant) */}
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/boas-vindas" element={<ProtectedRoute><BoasVindas /></ProtectedRoute>} />

              {/* Catálogo público externo (sem autenticação) */}
              <Route path="/c/:tenant_slug" element={<CatalogoPublico />} />
              <Route path="/c/:tenant_slug/p/:product_id" element={<CatalogoPublicoProduto />} />

              {/* LGPD: páginas legais públicas (removidas) */}
              <Route path="/privacidade" element={<Navigate to="/" replace />} />

              {/* Perfil do usuário (autenticado) */}
              <Route path="/configuracoes/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/configuracoes/assinatura" element={<ProtectedRoute><Assinatura /></ProtectedRoute>} />



              <Route path="/catalogo" element={<ProtectedRoute><PermissionGuard module="comercial"><Catalogo /></PermissionGuard></ProtectedRoute>} />
              {/* Simplificação MVP: "/" mostra a tela "Hoje". HomeLauncher antigo continua em /central-navegacao-completo. */}
              <Route path="/" element={<ProtectedRoute><HomeHoje /></ProtectedRoute>} />
              <Route path="/central-navegacao" element={<ProtectedRoute><HomeHoje /></ProtectedRoute>} />
              <Route path="/central-navegacao-completo" element={<ProtectedRoute><HomeLauncher /></ProtectedRoute>} />
              {/* Dashboard simplificado: 4 KPIs. Versão completa segue em /bi-dashboard-completo. */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardSimple /></ProtectedRoute>} />

              {/* Super administrador (PT canônico + redirect EN) */}
              <Route path="/super-administrador" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
              <Route path="/super-admin" element={<Navigate to="/super-administrador" replace />} />

              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/smart-onboarding" element={<ProtectedRoute><SmartOnboarding /></ProtectedRoute>} />
              
              
              
              <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
              <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
              
              <Route path="/bi-dashboard" element={<ProtectedRoute><DashboardBI /></ProtectedRoute>} />
              <Route path="/bi-dashboard-completo" element={<ProtectedRoute><FeatureGate feature="bi_completo"><DashboardBI /></FeatureGate></ProtectedRoute>} />
              <Route path="/kpis-avancados" element={<ProtectedRoute><FeatureGate feature="kpis_avancados"><DashboardBI /></FeatureGate></ProtectedRoute>} />
              

              {/* Configurações (PT canônico + redirects EN) */}
              <Route path="/configuracoes" element={<ProtectedRoute><PermissionGuard module="configuracoes"><ProjectSettings /></PermissionGuard></ProtectedRoute>} />
              <Route path="/configuracoes/usuarios" element={<ProtectedRoute><PermissionGuard module="configuracoes"><UserManagement /></PermissionGuard></ProtectedRoute>} />
              <Route path="/configuracoes/catalogo" element={<ProtectedRoute><PermissionGuard module="configuracoes"><ConfiguracoesCatalogo /></PermissionGuard></ProtectedRoute>} />
              <Route path="/configuracoes/modulos" element={<ProtectedRoute><ConfiguracoesModulos /></ProtectedRoute>} />
              <Route path="/settings" element={<Navigate to="/configuracoes" replace />} />
              <Route path="/settings/users" element={<Navigate to="/configuracoes/usuarios" replace />} />

              <Route path="/producao" element={<Navigate to="/producao-operacoes" replace />} />
              <Route path="/pedidos" element={<ProtectedRoute><PermissionGuard module="pedidos"><Orders /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fornecedores" element={<ProtectedRoute><PermissionGuard module="fornecedores"><Suppliers /></PermissionGuard></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute><PermissionGuard module="comercial"><Clientes /></PermissionGuard></ProtectedRoute>} />
              <Route path="/contatos" element={<ProtectedRoute><PermissionGuard module="comercial"><Contatos /></PermissionGuard></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute><PermissionGuard module="comercial"><Leads /></PermissionGuard></ProtectedRoute>} />
              {/* CRM unificado (substitui projetos, crm-comercial, prospecção, propostas, contratos) */}
              <Route path="/crm" element={<ProtectedRoute><PermissionGuard module="comercial"><CRM /></PermissionGuard></ProtectedRoute>} />
              <Route path="/crm-comercial" element={<Navigate to="/crm?view=gestor&tab=pipeline" replace />} />
              <Route path="/propostas" element={<Navigate to="/crm?view=consultor&tab=propostas" replace />} />
              <Route path="/contratos" element={<Navigate to="/crm?view=consultor&tab=clientes" replace />} />
              <Route path="/comissoes" element={<Navigate to="/" replace />} />
              <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
              <Route path="/estoque" element={<ProtectedRoute><PermissionGuard module="estoque"><Inventory /></PermissionGuard></ProtectedRoute>} />
              <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute><PermissionGuard module="financeiro"><Financeiro /></PermissionGuard></ProtectedRoute>} />
              <Route path="/cadastros-financeiros" element={<ProtectedRoute><PermissionGuard module="cadastros_financeiros"><CadastrosFinanceiros /></PermissionGuard></ProtectedRoute>} />
              <Route path="/financeiro/rh-pj" element={<ProtectedRoute><PermissionGuard module="financeiro" action="admin"><FinanceiroRhPj /></PermissionGuard></ProtectedRoute>} />
              <Route path="/configuracoes/financeiro/contas-bancarias" element={<ProtectedRoute><PermissionGuard module="cadastros_financeiros"><Bancos /></PermissionGuard></ProtectedRoute>} />
              <Route path="/financeiro/bancos" element={<Navigate to="/configuracoes/financeiro/contas-bancarias" replace />} />
              <Route path="/rh" element={<ProtectedRoute><RecursosHumanos /></ProtectedRoute>} />
              <Route path="/producao-operacoes" element={<ProtectedRoute><ProducaoOperacoes /></ProtectedRoute>} />

              {/* Projetos legado → redireciona para CRM */}
              <Route path="/projetos" element={<Navigate to="/crm?view=gestor&tab=overview" replace />} />
              <Route path="/projects" element={<Navigate to="/crm?view=gestor&tab=overview" replace />} />

              <Route path="/compras" element={<ProtectedRoute><Compras /></ProtectedRoute>} />
              <Route path="/suprimentos" element={<Navigate to="/compras" replace />} />
              <Route path="/entregas-montagem" element={<ProtectedRoute><FeatureGate feature="entregas"><EntregasMontagem /></FeatureGate></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
              
              <Route path="/data-flow" element={<ProtectedRoute><DataFlowMap /></ProtectedRoute>} />
              <Route path="/system-errors" element={<Navigate to="/" replace />} />
              <Route path="/excluidos" element={<Navigate to="/" replace />} />

              {/* CRM / Leads (canonical: /crm) */}
              <Route path="/kanban" element={<Navigate to="/" replace />} />
              <Route path="/prospeccao" element={<Navigate to="/crm?view=sdr&tab=prospeccao" replace />} />

              {/* Planejamento */}
              <Route path="/planejamento" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
              <Route path="/planning" element={<Navigate to="/planejamento" replace />} />
              <Route path="/metas" element={<Navigate to="/planejamento" replace />} />

              <Route path="/executive" element={<ProtectedRoute><ExecutiveCenter /></ProtectedRoute>} />
              <Route path="/governanca" element={<ProtectedRoute><AccessGovernance /></ProtectedRoute>} />

              {/* Cobrança (PT canônico + redirect EN) */}
              <Route path="/cobranca" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/billing" element={<Navigate to="/cobranca" replace />} />

              <Route path="/customer-lifecycle" element={<ProtectedRoute><CustomerLifecycle /></ProtectedRoute>} />
              <Route path="/customer-success" element={<ProtectedRoute><CustomerSuccessOps /></ProtectedRoute>} />
              
              <Route path="/educacao" element={<ProtectedRoute><InProductEducation /></ProtectedRoute>} />
              <Route path="/education" element={<Navigate to="/educacao" replace />} />
              
              <Route path="/control-tower" element={<ProtectedRoute><ControlTower /></ProtectedRoute>} />
              <Route path="/owner/permission-debug" element={<Navigate to="/" replace />} />
              <Route path="/owner/admin" element={<ProtectedRoute><SmartAdmin /></ProtectedRoute>} />
              <Route path="/owner/billing-ops" element={<ProtectedRoute><BillingOps /></ProtectedRoute>} />
              <Route path="/owner/lifecycle" element={<Navigate to="/" replace />} />
              <Route path="/owner/control-tower" element={<ProtectedRoute><OwnerControlTower /></ProtectedRoute>} />
              <Route path="/owner/automation-center" element={<ProtectedRoute><AutomationCenter /></ProtectedRoute>} />
              
              <Route path="/owner/entitlements" element={<ProtectedRoute><OwnerEntitlementsCenter /></ProtectedRoute>} />
              <Route path="/owner/upgrade-center" element={<ProtectedRoute><OwnerUpgradeCenter /></ProtectedRoute>} />
              <Route path="/owner/offer-center" element={<Navigate to="/" replace />} />
              <Route path="/owner/integration-map" element={<Navigate to="/" replace />} />
              <Route path="/owner/dependency-impact" element={<ProtectedRoute><OwnerDependencyImpact /></ProtectedRoute>} />
              <Route path="/owner/recovery-actions" element={<Navigate to="/" replace />} />
              <Route path="/owner/incident-timeline" element={<Navigate to="/" replace />} />
              <Route path="/owner/runbooks" element={<ProtectedRoute><OwnerRunbooks /></ProtectedRoute>} />
              <Route path="/owner/self-healing" element={<ProtectedRoute><OwnerSelfHealing /></ProtectedRoute>} />
              <Route path="/owner/architecture-board" element={<ProtectedRoute><OwnerArchitectureBoard /></ProtectedRoute>} />
              <Route path="/owner/execution-priority" element={<Navigate to="/" replace />} />
              <Route path="/owner/stability-gates" element={<ProtectedRoute><OwnerStabilityGates /></ProtectedRoute>} />
              <Route path="/owner/autonomous-recovery" element={<ProtectedRoute><OwnerAutonomousRecovery /></ProtectedRoute>} />
              <Route path="/owner/predictive-failures" element={<Navigate to="/" replace />} />
              <Route path="/owner/capacity-risk" element={<ProtectedRoute><OwnerCapacityRisk /></ProtectedRoute>} />
              <Route path="/owner/capacity-load-risk" element={<Navigate to="/owner/capacity-risk" replace />} />
              <Route path="/owner" element={<Navigate to="/owner/control-tower" replace />} />
              <Route path="/benchmarking" element={<Navigate to="/" replace />} />
              <Route path="/multi-company" element={<Navigate to="/" replace />} />
              <Route path="/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />

              {/* Painéis (PT canônico + redirect EN) */}
              <Route path="/paineis" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboards" element={<Navigate to="/dashboard" replace />} />
              <Route path="/painel" element={<Navigate to="/dashboard" replace />} />

              <Route path="/ia-configuracao" element={<Navigate to="/" replace />} />
              {/* /compras é a rota canônica (definida acima) */}
              {/* Rotas dinâmicas */}
              <Route path="*" element={
                <ProtectedRoute>
                  <DynamicRouteHandler />
                </ProtectedRoute>
              } />
              </Routes>
            
            </PermissionSimulationProvider>
            </PermissionsProvider>
            </MinimizedDialogsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
