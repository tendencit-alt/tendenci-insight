import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Briefcase, TrendingUp, History, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { ArchitectTags } from "./ArchitectTags";

interface ArchitectDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  architectId: string | null;
}

export function ArchitectDetailSheet({ open, onOpenChange, architectId }: ArchitectDetailSheetProps) {
  const [architect, setArchitect] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    captado: 0,
    orcamento: 0,
    aprovado: 0,
    perdido: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  useEffect(() => {
    if (open && architectId) {
      fetchArchitectData();
    }
  }, [open, architectId]);

  const fetchArchitectData = async () => {
    if (!architectId) return;
    
    setLoading(true);

    // Buscar dados do profissional parceiro
    const { data: archData } = await supabase
      .from('architects')
      .select('*')
      .eq('id', architectId)
      .maybeSingle();

    if (archData) {
      setArchitect(archData);
    }

    // Buscar projetos do profissional parceiro
    const { data: projectsData } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(name, phone)
      `)
      .eq('architect_id', architectId)
      .order('created_at', { ascending: false });

    if (projectsData) {
      setProjects(projectsData);
      
      // Calcular estatísticas
      const stats = {
        total: projectsData.length,
        captado: projectsData.filter(p => p.stage === 'captado').length,
        orcamento: projectsData.filter(p => p.stage === 'orçamento').length,
        aprovado: projectsData.filter(p => p.stage === 'aprovado').length,
        perdido: projectsData.filter(p => p.stage === 'perdido').length,
        totalValue: projectsData
          .filter(p => p.stage === 'aprovado')
          .reduce((sum, p) => sum + (p.value || 0), 0)
      };
      setStats(stats);
    }

    // Buscar histórico
    const { data: historyData } = await supabase
      .from('architect_history')
      .select('*')
      .eq('architect_id', architectId)
      .order('created_at', { ascending: false });

    if (historyData) {
      setHistory(historyData);
    }

    setLoading(false);
  };

  if (!architect) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl">{architect.name}</SheetTitle>
            <Button onClick={() => setIsCreateProjectOpen(true)} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Cadastrar Projeto
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Tags Automáticas */}
          <ArchitectTags
            ultimoProjetoData={architect.ultimo_projeto_data}
            dataUltimoContato={architect.data_ultimo_contato}
            active={architect.active}
          />

          {/* Informações Básicas */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Informações do Profissional Parceiro
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Empresa</p>
                <p className="font-medium">{architect.company || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cidade</p>
                <p className="font-medium">{architect.city || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telefone</p>
                <p className="font-medium">{architect.phone || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">E-mail</p>
                <p className="font-medium">{architect.email || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Instagram</p>
                <p className="font-medium">{architect.instagram || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tier</p>
                <Badge variant="outline">{architect.tier}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Categoria</p>
                <Badge variant={architect.categoria === 'metropolitano' ? 'default' : 'secondary'}>
                  {architect.categoria === 'metropolitano' ? 'Metropolitano' : 'Captado'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Comissão</p>
                <p className="font-medium">{architect.commission_percent}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Aniversário</p>
                <p className="font-medium">
                  {architect.birthday 
                    ? format(new Date(architect.birthday), "dd 'de' MMMM", { locale: ptBR })
                    : '-'}
                </p>
              </div>
            </div>
            {architect.notes && (
              <div>
                <p className="text-muted-foreground text-sm">Observações</p>
                <p className="mt-1">{architect.notes}</p>
              </div>
            )}
          </Card>

          {/* Estatísticas */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Estatísticas de Projetos
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Projetos</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.aprovado}</p>
                <p className="text-sm text-muted-foreground">Aprovados</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{stats.orcamento}</p>
                <p className="text-sm text-muted-foreground">Em Orçamento</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="text-xl font-bold text-purple-600">
                  R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">Valor Aprovado</p>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="projects">
                <Briefcase className="w-4 h-4 mr-2" />
                Projetos ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                Histórico ({history.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="space-y-3 mt-4">
              {projects.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Nenhum projeto vinculado
                </Card>
              ) : (
                projects.map((project) => (
                  <Card key={project.id} className="p-4 hover:shadow-md transition-all">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{project.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Cliente: {project.client?.name || 'Não informado'}
                          </p>
                        </div>
                        <Badge>{project.stage}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {format(new Date(project.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {project.value > 0 && (
                          <span className="font-medium">
                            R$ {Number(project.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-3 mt-4">
              {history.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Nenhum registro no histórico
                </Card>
              ) : (
                history.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.event_type}
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        architectId={architectId || ""}
        onSuccess={fetchArchitectData}
      />
    </Sheet>
  );
}
