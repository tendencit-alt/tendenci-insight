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
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { DynamicRouteHandler } from "@/components/routing/DynamicRouteHandler";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProjectSettings from "./pages/ProjectSettings";
import UserManagement from "./pages/UserManagement";
import Auth from "./pages/Auth";
import Production from "./pages/Production";
import Orders from "./pages/Orders";
import Suppliers from "./pages/Suppliers";
import Inventory from "./pages/Inventory";

import ActivityCenter from "./pages/ActivityCenter";
import Catalogo from "./pages/Catalogo";
import Financeiro from "./pages/Financeiro";
import CadastrosFinanceiros from "./pages/CadastrosFinanceiros";

import ResetPassword from "./pages/ResetPassword";
import SuperAdmin from "./pages/SuperAdmin";
import Onboarding from "./pages/Onboarding";
import Auditoria from "./pages/Auditoria";
import Aprovacoes from "./pages/Aprovacoes";
import Documentos from "./pages/Documentos";
import Tarefas from "./pages/Tarefas";
import Automacoes from "./pages/Automacoes";
import Relatorios from "./pages/Relatorios";
import HomeLauncher from "./pages/HomeLauncher";
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
            <MinimizedDialogsProvider>
            <MinimizedDialogsBar />
            <PermissionsProvider>
              <CommandBar />
               <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/" element={<ProtectedRoute><Navigate to="/central-navegacao" replace /></ProtectedRoute>} />
              <Route path="/central-navegacao" element={<ProtectedRoute><HomeLauncher /></ProtectedRoute>} />
               <Route path="/super-admin" element={<ProtectedRoute><SuperAdmin /></ProtectedRoute>} />
               <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
               <Route path="/auditoria" element={<ProtectedRoute><Auditoria /></ProtectedRoute>} />
               <Route path="/aprovacoes" element={<ProtectedRoute><Aprovacoes /></ProtectedRoute>} />
               <Route path="/documentos" element={<ProtectedRoute><Documentos /></ProtectedRoute>} />
               <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
               <Route path="/automacoes" element={<ProtectedRoute><Automacoes /></ProtectedRoute>} />
               <Route path="/bi-dashboard" element={<ProtectedRoute><DashboardBI /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><PermissionGuard module="configuracoes"><ProjectSettings /></PermissionGuard></ProtectedRoute>} />
              <Route path="/settings/users" element={<ProtectedRoute><PermissionGuard module="configuracoes"><UserManagement /></PermissionGuard></ProtectedRoute>} />
              <Route path="/producao" element={<ProtectedRoute><PermissionGuard module="producao"><Production /></PermissionGuard></ProtectedRoute>} />
              <Route path="/pedidos" element={<ProtectedRoute><PermissionGuard module="pedidos"><Orders /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fornecedores" element={<ProtectedRoute><PermissionGuard module="fornecedores"><Suppliers /></PermissionGuard></ProtectedRoute>} />
              <Route path="/estoque" element={<ProtectedRoute><PermissionGuard module="estoque"><Inventory /></PermissionGuard></ProtectedRoute>} />
              <Route path="/financeiro" element={<ProtectedRoute><PermissionGuard module="financeiro"><Financeiro /></PermissionGuard></ProtectedRoute>} />
              <Route path="/cadastros-financeiros" element={<ProtectedRoute><PermissionGuard module="cadastros_financeiros"><CadastrosFinanceiros /></PermissionGuard></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
              <Route path="/atividades" element={<ProtectedRoute><ActivityCenter /></ProtectedRoute>} />
              <Route path="/system-errors" element={<Navigate to="/" replace />} />
              <Route path="/excluidos" element={<Navigate to="/" replace />} />
              {/* Redirects para rotas removidas */}
              <Route path="/leads" element={<Navigate to="/" replace />} />
              <Route path="/kanban" element={<Navigate to="/" replace />} />
              <Route path="/crm" element={<Navigate to="/" replace />} />
              <Route path="/projects" element={<Navigate to="/" replace />} />
              <Route path="/prospeccao" element={<Navigate to="/" replace />} />
              <Route path="/metas" element={<Navigate to="/" replace />} />
              <Route path="/dashboards" element={<Navigate to="/" replace />} />
              <Route path="/ia-configuracao" element={<Navigate to="/" replace />} />
              <Route path="/compras" element={<Navigate to="/financeiro" replace />} />
              {/* Rotas dinâmicas */}
              <Route path="*" element={
                <ProtectedRoute>
                  <DynamicRouteHandler />
                </ProtectedRoute>
              } />
              </Routes>
            </PermissionsProvider>
            </MinimizedDialogsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
