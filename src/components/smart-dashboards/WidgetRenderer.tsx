import {
  CaixaHojeWidget, ContasVencendoWidget, ContasVencidasWidget,
  InadimplenciaWidget, ConciliacaoPendenteWidget, PedidosAguardandoWidget,
  PropostasAbertasWidget, OrdensAtrasadasWidget, ProjetosAtivosWidget,
  PipelineWidget, PlaceholderWidget,
} from "./widgets/DataWidgets";

const RENDERERS: Record<string, () => JSX.Element> = {
  "caixa-hoje": () => <CaixaHojeWidget />,
  "contas-vencendo": () => <ContasVencendoWidget />,
  "contas-vencidas": () => <ContasVencidasWidget />,
  "inadimplencia": () => <InadimplenciaWidget />,
  "conciliacao-pendente": () => <ConciliacaoPendenteWidget />,
  "pedidos-aguardando": () => <PedidosAguardandoWidget />,
  "propostas-abertas": () => <PropostasAbertasWidget />,
  "ordens-atrasadas": () => <OrdensAtrasadasWidget />,
  "projetos-ativos": () => <ProjetosAtivosWidget />,
  "pipeline": () => <PipelineWidget />,
  "lucro-projetado": () => <PlaceholderWidget message="Aguardando cálculo do BI" />,
  "runway": () => <PlaceholderWidget message="Calculado a partir do burn-rate" />,
  "margem-contribuicao": () => <PlaceholderWidget message="Calculado a partir da DRE" />,
  "forecast-vendas": () => <PlaceholderWidget message="Forecast em construção" />,
  "prioridades-semana": () => <PlaceholderWidget message="Sugestões geradas pela IA" />,
  "fluxo-caixa": () => <PlaceholderWidget message="Veja em BI → Fluxo de Caixa" />,
  "dre-resumida": () => <PlaceholderWidget message="Veja em BI → DRE" />,
  "conversao": () => <PlaceholderWidget message="Em desenvolvimento" />,
  "ticket-medio": () => <PlaceholderWidget message="Em desenvolvimento" />,
  "meta-comercial": () => <PlaceholderWidget message="Configure metas para visualizar" />,
  "producao-andamento": () => <PlaceholderWidget message="Veja no Kanban de Produção" />,
  "tarefas-criticas": () => <PlaceholderWidget message="Aguardando integração com tarefas" />,
  "health-score": () => <PlaceholderWidget message="Score consolidado em construção" />,
};

export function WidgetRenderer({ widgetId }: { widgetId: string }) {
  const Renderer = RENDERERS[widgetId];
  if (!Renderer) return <p className="text-xs text-muted-foreground">Widget indisponível</p>;
  return <Renderer />;
}
