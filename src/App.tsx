import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import Index from "./pages/Index";
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
import NotFound from "./pages/NotFound";
import ImportTempArchitects from "./pages/ImportTempArchitects";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><PermissionGuard module="dashboard"><Index /></PermissionGuard></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><PermissionGuard module="leads"><Leads /></PermissionGuard></ProtectedRoute>} />
            <Route path="/kanban" element={<ProtectedRoute><PermissionGuard module="crm"><CRM /></PermissionGuard></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><PermissionGuard module="projetos"><Projects /></PermissionGuard></ProtectedRoute>} />
            <Route path="/projects/settings" element={<ProtectedRoute><PermissionGuard module="configuracoes"><ProjectSettings /></PermissionGuard></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><PermissionGuard module="configuracoes"><ProjectSettings /></PermissionGuard></ProtectedRoute>} />
            <Route path="/settings/users" element={<ProtectedRoute><PermissionGuard module="configuracoes"><UserManagement /></PermissionGuard></ProtectedRoute>} />
            <Route path="/prospeccao" element={<ProtectedRoute><PermissionGuard module="arquitetos"><Prospeccao /></PermissionGuard></ProtectedRoute>} />
            <Route path="/metas" element={<ProtectedRoute><PermissionGuard module="metas"><Goals /></PermissionGuard></ProtectedRoute>} />
            <Route path="/metas/gestao" element={<ProtectedRoute><PermissionGuard module="metas"><GoalsManagement /></PermissionGuard></ProtectedRoute>} />
            <Route path="/metas/desempenho/:goalId" element={<ProtectedRoute><PermissionGuard module="metas"><SellerPerformance /></PermissionGuard></ProtectedRoute>} />
        <Route path="/dashboards" element={<ProtectedRoute><DashboardsPersonalizados /></ProtectedRoute>} />
        <Route path="/dashboards/editar/:id" element={<ProtectedRoute><DashboardEditor /></ProtectedRoute>} />
        <Route path="/dashboards/view/:id" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
            <Route path="/import-temp" element={<ImportTempArchitects />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
