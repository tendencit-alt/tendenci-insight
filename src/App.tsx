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
import PermissionAuditPage from "./pages/PermissionAuditPage";
import RlsAudit from "./pages/RlsAudit";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { DynamicRouteHandler } from "@/components/routing/DynamicRouteHandler";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProjectSettings from "./pages/ProjectSettings";
import UserManagement from "./pages/UserManagement";
import ConfiguracoesCatalogo from "./pages/ConfiguracoesCatalogo";
import ConfiguracoesModulos from "./pages/ConfiguracoesModulos";
import Auth from "./pages/Auth";
import Production from "./pages/Production";
import Orders from "./pages/Orders";
import Suppliers from "./pages/Suppliers";
import Clientes from "./pages/Clientes";
import Leads from "./pages/Leads";
import Propostas from "./pages/Propostas";
import Contratos from "./pages/Contratos";
import Comissoes from "./pages/Comissoes";
import Notificacoes from "./pages/Notificacoes";
import Inventory from "./pages/Inventory";
import Produtos from "./pages/Produtos";

import ActivityCenter from "./pages/ActivityCenter";
import Catalogo from "./pages/Catalogo";
import Financeiro from "./pages/Financeiro";
import CadastrosFinanceiros from "./pages/CadastrosFinanceiros";

import ResetPassword from "./pages/ResetPassword";
import SuperAdmin from "./pages/SuperAdmin";
import Onboarding from "./pages/Onboarding";
import SmartOnboarding from "./pages/SmartOnboarding";
import SmartAutomations from "./pages/SmartAutomations";
import Auditoria from "./pages/Auditoria";
import Aprovacoes from "./pages/Aprovacoes";
import Documentos from "./pages/Documentos";
import Tarefas from "./pages/Tarefas";
import Automacoes from "./pages/Automacoes";
import Relatorios from "./pages/Relatorios";
import DataFlowMap from "./pages/DataFlowMap";
import HomeLauncher from "./pages/HomeLauncher";
import HomeHoje from "./pages/HomeHoje";
import DashboardSimple from "./pages/DashboardSimple";
import DashboardBI from "./pages/DashboardBI";
import RecursosHumanos from "./pages/RecursosHumanos";
import ProducaoOperacoes from "./pages/ProducaoOperacoes";
import Projetos from "./pages/Projetos";
import Suprimentos from "./pages/Suprimentos";
import CRMCommercial from "./pages/CRMCommercial";
import Planning from "./pages/Planning";
import ExecutiveCenter from "./pages/ExecutiveCenter";
import AccessGovernance from "./pages/AccessGovernance";
import Billing from "./pages/Billing";
import CustomerLifecycle from "./pages/CustomerLifecycle";
import CustomerSuccessOps from "./pages/CustomerSuccessOps";
import SupportKnowledge from "./pages/SupportKnowledge";
import InProductEducation from "./pages/InProductEducation";
import AIDecisionAssistant from "./pages/AIDecisionAssistant";
import ControlTower from "./pages/ControlTower";
import PermissionDebug from "./pages/PermissionDebug";
import SmartAdmin from "./pages/SmartAdmin";
import BillingOps from "./pages/BillingOps";
import TenantLifecycle from "./pages/TenantLifecycle";
import Benchmarking from "./pages/Benchmarking";
import Empresas from "./pages/Empresas";
import OwnerControlTower from "./pages/OwnerControlTower";
import AutomationCenter from "./pages/AutomationCenter";
import OwnerEntitlementsCenter from "./pages/OwnerEntitlementsCenter";
import OwnerUpgradeCenter from "./pages/OwnerUpgradeCenter";
import OwnerOfferCenter from "./pages/OwnerOfferCenter";
import OwnerIntegrationMap from "./pages/OwnerIntegrationMap";
import OwnerDependencyImpact from "./pages/OwnerDependencyImpact";
import OwnerRecoveryActions from "./pages/OwnerRecoveryActions";
import OwnerIncidentTimeline from "./pages/OwnerIncidentTimeline";
import OwnerRunbooks from "./pages/OwnerRunbooks";
import OwnerSelfHealing from "./pages/OwnerSelfHealing";
import OwnerArchitectureBoard from "./pages/OwnerArchitectureBoard";
import OwnerExecutionPriority from "./pages/OwnerExecutionPriority";
import OwnerStabilityGates from "./pages/OwnerStabilityGates";
import OwnerAutonomousRecovery from "./pages/OwnerAutonomousRecovery";
import OwnerPredictiveFailures from "./pages/OwnerPredictiveFailures";
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
            <WorkspaceProvider>
              <SimulationBanner />
              <CommandBar />
               <Routes>
              <Route path="/auditoria-permissoes" element={<ProtectedRoute><PermissionAuditPage /></ProtectedRoute>} />
              <Route path="/auditoria-rls" element={<ProtectedRoute><RlsAudit /></ProtectedRoute>} />

              {/* Autenticação (PT canônico + redirects EN) */}
              <Route path="/autenticacao" element={<Auth />} />
              <Route path="/auth" element={<Navigate to="/autenticacao" replace />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route path="/reset-password" element={<Navigate to="/redefinir-senha" replace />} />

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
              <Route path="/automacoes-inteligentes" element={<ProtectedRoute><SmartAutomations /></ProtectedRoute>} />
              <Route path="/auditoria" element={<ProtectedRoute><Auditoria /></ProtectedRoute>} />
              <Route path="/aprovacoes" element={<ProtectedRoute><Aprovacoes /></ProtectedRoute>} />
              <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
              <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
              <Route path="/automacoes" element={<ProtectedRoute><Automacoes /></ProtectedRoute>} />
              <Route path="/bi-dashboard" element={<ProtectedRoute><DashboardBI /></ProtectedRoute>} />
              <Route path="/bi-dashboard-completo" element={<ProtectedRoute><DashboardBI /></ProtectedRoute>} />

              {/* Configurações (PT canônico + redirects EN) */}
              <Route path="/configuracoes" element={<ProtectedRoute><PermissionGuard module="configuracoes"><ProjectSettings /></PermissionGuard></ProtectedRoute>} />
              <Route path="/configuracoes/usuarios" element={<ProtectedRoute><PermissionGuard module="configuracoes"><UserManagement /></PermissionGuard></ProtectedRoute>} />
              <Route path="/configuracoes/catalogo" element={<ProtectedRoute><PermissionGuard module="configuracoes"><ConfiguracoesCatalogo /></PermissionGuard></ProtectedRoute>} />
              <Route path="/configuracoes/modulos" element={<ProtectedRoute><ConfiguracoesModulos /></ProtectedRoute>} />
              <Route path="/settings" element={<Navigate to="/configuracoes" replace />} />
              <Route path="/settings/users" element={<Navigate to="/configuracoes/usuarios" replace />} />

              <Route path="/producao" element={<ProtectedRoute><PermissionGuard module="producao"><Production /></PermissionGuard></ProtectedRoute>} />
              <Route path="/pedidos" element={<ProtectedRoute><PermissionGuard module="pedidos"><Orders /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fornecedores" element={<ProtectedRoute><PermissionGuard module="fornecedores"><Suppliers /></PermissionGuard></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute><PermissionGuard module="comercial"><Clientes /></PermissionGuard></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute><PermissionGuard module="comercial"><Leads /></PermissionGuard></ProtectedRoute>} />
              <Route path="/crm-comercial" element={<ProtectedRoute><PermissionGuard module="comercial"><CRMCommercial /></PermissionGuard></ProtectedRoute>} />
              
              <Route path="/propostas" element={<ProtectedRoute><PermissionGuard module="comercial"><Propostas /></PermissionGuard></ProtectedRoute>} />
              <Route path="/contratos" element={<ProtectedRoute><PermissionGuard module="comercial"><Contratos /></PermissionGuard></ProtectedRoute>} />
              <Route path="/comissoes" element={<ProtectedRoute><PermissionGuard module="comercial"><Comissoes /></PermissionGuard></ProtectedRoute>} />
              <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
              <Route path="/estoque" element={<ProtectedRoute><PermissionGuard module="estoque"><Inventory /></PermissionGuard></ProtectedRoute>} />
              <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute><PermissionGuard module="financeiro"><Financeiro /></PermissionGuard></ProtectedRoute>} />
              <Route path="/cadastros-financeiros" element={<ProtectedRoute><PermissionGuard module="cadastros_financeiros"><CadastrosFinanceiros /></PermissionGuard></ProtectedRoute>} />
              <Route path="/rh" element={<ProtectedRoute><RecursosHumanos /></ProtectedRoute>} />
              <Route path="/producao-operacoes" element={<ProtectedRoute><ProducaoOperacoes /></ProtectedRoute>} />

              {/* Projetos (PT canônico + redirect EN) */}
              <Route path="/projetos" element={<ProtectedRoute><Projetos /></ProtectedRoute>} />
              <Route path="/projects" element={<Navigate to="/projetos" replace />} />

              <Route path="/suprimentos" element={<ProtectedRoute><Suprimentos /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
              <Route path="/atividades" element={<ProtectedRoute><ActivityCenter /></ProtectedRoute>} />
              <Route path="/data-flow" element={<ProtectedRoute><DataFlowMap /></ProtectedRoute>} />
              <Route path="/system-errors" element={<Navigate to="/" replace />} />
              <Route path="/excluidos" element={<Navigate to="/" replace />} />

              {/* CRM / Leads (canonical routes are above with PermissionGuard) */}
              <Route path="/kanban" element={<Navigate to="/" replace />} />
              <Route path="/crm" element={<Navigate to="/crm-comercial" replace />} />
              <Route path="/prospeccao" element={<Navigate to="/" replace />} />

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
              <Route path="/support-knowledge" element={<ProtectedRoute><SupportKnowledge /></ProtectedRoute>} />
              <Route path="/educacao" element={<ProtectedRoute><InProductEducation /></ProtectedRoute>} />
              <Route path="/education" element={<Navigate to="/educacao" replace />} />
              <Route path="/ai-decision" element={<ProtectedRoute><AIDecisionAssistant /></ProtectedRoute>} />
              <Route path="/control-tower" element={<ProtectedRoute><ControlTower /></ProtectedRoute>} />
              <Route path="/owner/permission-debug" element={<ProtectedRoute><PermissionDebug /></ProtectedRoute>} />
              <Route path="/owner/admin" element={<ProtectedRoute><SmartAdmin /></ProtectedRoute>} />
              <Route path="/owner/billing-ops" element={<ProtectedRoute><BillingOps /></ProtectedRoute>} />
              <Route path="/owner/lifecycle" element={<ProtectedRoute><TenantLifecycle /></ProtectedRoute>} />
              <Route path="/owner/control-tower" element={<ProtectedRoute><OwnerControlTower /></ProtectedRoute>} />
              <Route path="/owner/automation-center" element={<ProtectedRoute><AutomationCenter /></ProtectedRoute>} />
              <Route path="/automation-center" element={<ProtectedRoute><AutomationCenter /></ProtectedRoute>} />
              <Route path="/owner/entitlements" element={<ProtectedRoute><OwnerEntitlementsCenter /></ProtectedRoute>} />
              <Route path="/owner/upgrade-center" element={<ProtectedRoute><OwnerUpgradeCenter /></ProtectedRoute>} />
              <Route path="/owner/offer-center" element={<ProtectedRoute><OwnerOfferCenter /></ProtectedRoute>} />
              <Route path="/owner/integration-map" element={<ProtectedRoute><OwnerIntegrationMap /></ProtectedRoute>} />
              <Route path="/owner/dependency-impact" element={<ProtectedRoute><OwnerDependencyImpact /></ProtectedRoute>} />
              <Route path="/owner/recovery-actions" element={<ProtectedRoute><OwnerRecoveryActions /></ProtectedRoute>} />
              <Route path="/owner/incident-timeline" element={<ProtectedRoute><OwnerIncidentTimeline /></ProtectedRoute>} />
              <Route path="/owner/runbooks" element={<ProtectedRoute><OwnerRunbooks /></ProtectedRoute>} />
              <Route path="/owner/self-healing" element={<ProtectedRoute><OwnerSelfHealing /></ProtectedRoute>} />
              <Route path="/owner/architecture-board" element={<ProtectedRoute><OwnerArchitectureBoard /></ProtectedRoute>} />
              <Route path="/owner/execution-priority" element={<ProtectedRoute><OwnerExecutionPriority /></ProtectedRoute>} />
              <Route path="/owner/stability-gates" element={<ProtectedRoute><OwnerStabilityGates /></ProtectedRoute>} />
              <Route path="/owner/autonomous-recovery" element={<ProtectedRoute><OwnerAutonomousRecovery /></ProtectedRoute>} />
              <Route path="/owner/predictive-failures" element={<ProtectedRoute><OwnerPredictiveFailures /></ProtectedRoute>} />
              <Route path="/owner/capacity-risk" element={<ProtectedRoute><OwnerCapacityRisk /></ProtectedRoute>} />
              <Route path="/owner/capacity-load-risk" element={<Navigate to="/owner/capacity-risk" replace />} />
              <Route path="/owner" element={<Navigate to="/owner/control-tower" replace />} />
              <Route path="/benchmarking" element={<ProtectedRoute><Benchmarking /></ProtectedRoute>} />
              <Route path="/multi-company" element={<Navigate to="/benchmarking" replace />} />
              <Route path="/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />

              {/* Painéis (PT canônico + redirect EN) */}
              <Route path="/paineis" element={<Navigate to="/bi-dashboard" replace />} />
              <Route path="/dashboards" element={<Navigate to="/paineis" replace />} />

              <Route path="/ia-configuracao" element={<Navigate to="/" replace />} />
              <Route path="/compras" element={<Navigate to="/suprimentos" replace />} />
              {/* Rotas dinâmicas */}
              <Route path="*" element={
                <ProtectedRoute>
                  <DynamicRouteHandler />
                </ProtectedRoute>
              } />
              </Routes>
            </WorkspaceProvider>
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
