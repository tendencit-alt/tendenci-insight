import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { newCorrelationId } from '@/lib/errorReporter';
import { humanizeError } from '@/lib/errorMessage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  correlationId: string | null;
}

const isRecoverableDomNotFoundError = (error: Error): boolean => {
  if (typeof window === 'undefined') return false;

  const message = (error.message || '').toLowerCase();

  return (
    error.name === 'NotFoundError' &&
    (message.includes('insertbefore') ||
      message.includes('removechild') ||
      message.includes('not a child of this node') ||
      message.includes('object can not be found here'))
  );
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, correlationId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (isRecoverableDomNotFoundError(error)) {
      return { hasError: false, error: null, errorInfo: null, correlationId: null };
    }

    return { hasError: true, error, correlationId: newCorrelationId() };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isRecoverableDomNotFoundError(error)) {
      console.warn('Recoverable DOM error on auth flow:', error.message);
      this.setState({ hasError: false, error: null, errorInfo: null, correlationId: null });
      return;
    }

    this.setState({ errorInfo });

    const id = this.state.correlationId ?? newCorrelationId();
    console.error(`[${id}] Frontend crash`, { error, errorInfo });

    // Sentry: reporta com correlation_id para correlacionar com logs do backend
    Sentry.withScope((scope) => {
      scope.setTag('correlation_id', id);
      scope.setContext('react', { componentStack: errorInfo.componentStack });
      Sentry.captureException(error);
    });

    // Log error to system_errors table
    this.logErrorToBackend(error, errorInfo, id);
  }

  private async logErrorToBackend(error: Error, errorInfo: ErrorInfo, correlationId: string) {
    try {
      const currentPath = window.location.pathname;
      const module = this.detectModule(currentPath);

      await supabase.functions.invoke('log-system-error', {
        body: {
          title: `Frontend Error: ${error.name || 'Unknown'} (${correlationId})`,
          description: error.message || 'Erro não tratado no frontend',
          module,
          severity: 'high',
          source: 'frontend',
          error_code: error.name,
          stack_trace: `${error.stack || ''}\n\nComponent Stack:\n${errorInfo.componentStack || ''}`,
          metadata: {
            correlation_id: correlationId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            path: currentPath
          }
        }
      });

      console.log(`✅ [${correlationId}] Frontend error logged to system`);
    } catch (logError) {
      console.error(`[${correlationId}] Failed to log frontend error:`, logError);
    }
  }

  private detectModule(path: string): string {
    if (path.includes('crm') || path.includes('kanban')) return 'crm';
    if (path.includes('prospeccao')) return 'prospeccao';
    if (path.includes('project')) return 'projetos';
    if (path.includes('pedidos')) return 'pedidos';
    if (path.includes('producao')) return 'producao';
    if (path.includes('estoque')) return 'estoque';
    if (path.includes('fornecedor')) return 'fornecedores';
    if (path.includes('compras')) return 'compras';
    if (path.includes('meta')) return 'metas';
    if (path.includes('campanha')) return 'campanhas';
    if (path.includes('auth')) return 'autenticacao';
    return 'outro';
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, correlationId: null });
  };

  private handleCopyId = () => {
    if (this.state.correlationId) {
      navigator.clipboard?.writeText(this.state.correlationId).catch(() => {});
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Algo deu errado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Ocorreu um erro inesperado. Nossa equipe foi notificada automaticamente.
              </p>
              
              {this.state.error && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono text-destructive">
                    {humanizeError(this.state.error)}
                  </p>
                </div>
              )}

              {this.state.correlationId && (
                <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Request ID: </span>
                    <span className="font-mono font-medium">{this.state.correlationId}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={this.handleCopyId} className="h-7">
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                </div>
              )}

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={this.handleReset}>
                  Tentar Novamente
                </Button>
                <Button onClick={this.handleReload}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
