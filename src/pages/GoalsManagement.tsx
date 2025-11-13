import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trophy, Target, TrendingUp, Users } from "lucide-react";
import { CreateSellerGoalDialog } from "@/components/goals/CreateSellerGoalDialog";
import { CreateCompanyGoalDialog } from "@/components/goals/CreateCompanyGoalDialog";
import { GoalsTable } from "@/components/goals/GoalsTable";
import { GoalsAnalytics } from "@/components/goals/GoalsAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GoalsManagement() {
  const [loading, setLoading] = useState(false);
  const [showSellerDialog, setShowSellerDialog] = useState(false);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Gestão de Metas</h1>
            <p className="text-muted-foreground">Gerencie metas individuais e da empresa</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCompanyDialog(true)} size="sm">
              <Target className="w-4 h-4 mr-2" />
              Meta da Empresa
            </Button>
            <Button onClick={() => setShowSellerDialog(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Meta Individual
            </Button>
          </div>
        </div>

        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList>
            <TabsTrigger value="analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Análises
            </TabsTrigger>
            <TabsTrigger value="individual">
              <Users className="w-4 h-4 mr-2" />
              Metas Individuais
            </TabsTrigger>
            <TabsTrigger value="company">
              <Trophy className="w-4 h-4 mr-2" />
              Metas da Empresa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <GoalsAnalytics refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="individual">
            <GoalsTable type="seller" refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="company">
            <GoalsTable type="company" refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
          </TabsContent>
        </Tabs>

        <CreateSellerGoalDialog
          open={showSellerDialog}
          onOpenChange={setShowSellerDialog}
          onSuccess={handleRefresh}
        />

        <CreateCompanyGoalDialog
          open={showCompanyDialog}
          onOpenChange={setShowCompanyDialog}
          onSuccess={handleRefresh}
        />
      </div>
    </DashboardLayout>
  );
}
