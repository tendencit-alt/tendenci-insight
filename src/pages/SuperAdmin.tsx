import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, Users, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TenantsManager } from '@/components/superadmin/TenantsManager';
import { PlansManager } from '@/components/superadmin/PlansManager';
import { SuperAdminDashboard } from '@/components/superadmin/SuperAdminDashboard';

const SuperAdmin = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bi-dashboard')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              👑 Painel Owner
            </h1>
            <p className="text-muted-foreground text-lg">
              Controle total do sistema — empresas, planos, técnico e financeiro
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="tenants" className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" />
              Planos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 pt-6">
            <SuperAdminDashboard />
          </TabsContent>

          <TabsContent value="tenants" className="space-y-6 pt-6">
            <TenantsManager />
          </TabsContent>

          <TabsContent value="plans" className="space-y-6 pt-6">
            <PlansManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdmin;
