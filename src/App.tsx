import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { DynamicRouteHandler } from "@/components/routing/DynamicRouteHandler";
import ErrorBoundary from "@/components/ErrorBoundary";
import Leads from "./pages/Leads";
import Projects from "./pages/Projects";
import ProjectSettings from "./pages/ProjectSettings";
import Prospeccao from "./pages/Prospeccao";
import CRM from "./pages/CRM";
import Goals from "./pages/Goals";
import GoalsManagement from "./pages/GoalsManagement";
import SellerPerformance from "./pages/SellerPerformance";
import UserManagement from "./pages/UserManagement";
import DashboardsPersonalizados from "@/pages/DashboardsPersonalizados";
import DashboardEditor from "@/pages/DashboardEditor";
import DashboardView from "@/pages/DashboardView";
import Auth from "./pages/Auth";
import ImportTempArchitects from "./pages/ImportTempArchitects";
import AutoImportArchitects from "./pages/AutoImportArchitects";
import FinalBulkImport from "./pages/FinalBulkImport";
import WhatsAppIntegrationDocs from "./pages/WhatsAppIntegrationDocs";
import N8nTarefasGuide from "./pages/N8nTarefasGuide";
import N8nFollowupGuide from "./pages/N8nFollowupGuide";
import N8nConversationGuide from "./pages/N8nConversationGuide";
import IAWhatsAppSetup from "./pages/IAWhatsAppSetup";
import Production from "./pages/Production";
import Orders from "./pages/Orders";
import Suppliers from "./pages/Suppliers";
import Inventory from "./pages/Inventory";

import SystemErrors from "./pages/SystemErrors";
import ActivityCenter from "./pages/ActivityCenter";
import AutomacoesDocumentacao from "./pages/AutomacoesDocumentacao";
import IAConfiguracao from "./pages/IAConfiguracao";
import IAConversations from "./pages/IAConversations";
import Catalogo from "./pages/Catalogo";
import Financeiro from "./pages/Financeiro";
import DashboardBI from "./pages/DashboardBI";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PermissionsProvider>
              <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/" element={<Navigate to="/bi-dashboard" replace />} />
              <Route path="/bi-dashboard" element={<ProtectedRoute><PermissionGuard module="dashboard"><DashboardBI /></PermissionGuard></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute><PermissionGuard module="leads"><Leads /></PermissionGuard></ProtectedRoute>} />
              <Route path="/kanban" element={<ProtectedRoute><PermissionGuard module="crm"><CRM /></PermissionGuard></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute><PermissionGuard module="crm"><CRM /></PermissionGuard></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><PermissionGuard module="projetos"><Projects /></PermissionGuard></ProtectedRoute>} />
              <Route path="/projects/settings" element={<ProtectedRoute><PermissionGuard module="configuracoes"><ProjectSettings /></PermissionGuard></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><PermissionGuard module="configuracoes"><ProjectSettings /></PermissionGuard></ProtectedRoute>} />
              <Route path="/settings/users" element={<ProtectedRoute><PermissionGuard module="configuracoes"><UserManagement /></PermissionGuard></ProtectedRoute>} />
              <Route path="/prospeccao" element={<ProtectedRoute><PermissionGuard module="arquitetos"><Prospeccao /></PermissionGuard></ProtectedRoute>} />
              <Route path="/producao" element={<ProtectedRoute><PermissionGuard module="producao"><Production /></PermissionGuard></ProtectedRoute>} />
              {/* Rota fichas-tecnicas removida - funcionalidade integrada ao estoque */}
              <Route path="/pedidos" element={<ProtectedRoute><PermissionGuard module="pedidos"><Orders /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fornecedores" element={<ProtectedRoute><PermissionGuard module="fornecedores"><Suppliers /></PermissionGuard></ProtectedRoute>} />
              <Route path="/estoque" element={<ProtectedRoute><PermissionGuard module="estoque"><Inventory /></PermissionGuard></ProtectedRoute>} />
              <Route path="/compras" element={<Navigate to="/financeiro" replace />} />
              <Route path="/financeiro" element={<ProtectedRoute><PermissionGuard module="financeiro"><Financeiro /></PermissionGuard></ProtectedRoute>} />
              <Route path="/metas" element={<ProtectedRoute><PermissionGuard module="metas"><Goals /></PermissionGuard></ProtectedRoute>} />
              <Route path="/metas/gestao" element={<ProtectedRoute><PermissionGuard module="metas"><GoalsManagement /></PermissionGuard></ProtectedRoute>} />
              <Route path="/metas/desempenho/:goalId" element={<ProtectedRoute><PermissionGuard module="metas"><SellerPerformance /></PermissionGuard></ProtectedRoute>} />
              <Route path="/dashboards" element={<ProtectedRoute><DashboardsPersonalizados /></ProtectedRoute>} />
              <Route path="/dashboards/editar/:id" element={<ProtectedRoute><DashboardEditor /></ProtectedRoute>} />
              <Route path="/dashboards/view/:id" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
              <Route path="/import-temp" element={<ImportTempArchitects />} />
              <Route path="/auto-import" element={<AutoImportArchitects />} />
              <Route path="/final-bulk-import" element={<FinalBulkImport />} />
              <Route path="/whatsapp-integration-docs" element={<ProtectedRoute><WhatsAppIntegrationDocs /></ProtectedRoute>} />
              <Route path="/n8n-tarefas" element={<ProtectedRoute><N8nTarefasGuide /></ProtectedRoute>} />
              <Route path="/n8n-followup" element={<ProtectedRoute><N8nFollowupGuide /></ProtectedRoute>} />
              <Route path="/n8n-conversa" element={<ProtectedRoute><N8nConversationGuide /></ProtectedRoute>} />
              <Route path="/ia-whatsapp" element={<ProtectedRoute><IAWhatsAppSetup /></ProtectedRoute>} />
              <Route path="/system-errors" element={<ProtectedRoute><SystemErrors /></ProtectedRoute>} />
              <Route path="/atividades" element={<ProtectedRoute><ActivityCenter /></ProtectedRoute>} />
              <Route path="/automacoes" element={<ProtectedRoute><AutomacoesDocumentacao /></ProtectedRoute>} />
              <Route path="/ia-configuracao" element={<ProtectedRoute><PermissionGuard module="ia_configuracao"><IAConfiguracao /></PermissionGuard></ProtectedRoute>} />
              <Route path="/ia-conversas" element={<ProtectedRoute><PermissionGuard module="ia_configuracao"><IAConversations /></PermissionGuard></ProtectedRoute>} />
              {/* Rotas dinâmicas - verificar se é uma rota editada antes de mostrar 404 */}
              <Route path="*" element={
                <ProtectedRoute>
                  <DynamicRouteHandler />
                </ProtectedRoute>
              } />
              </Routes>
            </PermissionsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
