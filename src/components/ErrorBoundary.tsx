import React, { Component, ErrorInfo, ReactNode } from 'react';
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
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    if (isRecoverableDomNotFoundError(error)) {
      return { hasError: false, error: null, errorInfo: null };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isRecoverableDomNotFoundError(error)) {
      console.warn('Recoverable DOM error on auth flow:', error.message);
      this.setState({ hasError: false, error: null, errorInfo: null });
      return;
    }

    this.setState({ errorInfo });
    
    // Log error to system_errors table
    this.logErrorToBackend(error, errorInfo);
  }

  private async logErrorToBackend(error: Error, errorInfo: ErrorInfo) {
    try {
      const currentPath = window.location.pathname;
      const module = this.detectModule(currentPath);

      await supabase.functions.invoke('log-system-error', {
        body: {
          title: `Frontend Error: ${error.name || 'Unknown'}`,
          description: error.message || 'Erro não tratado no frontend',
          module,
          severity: 'high',
          source: 'frontend',
          error_code: error.name,
          stack_trace: `${error.stack || ''}\n\nComponent Stack:\n${errorInfo.componentStack || ''}`,
          metadata: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            path: currentPath
          }
        }
      });
      
      console.log('✅ Frontend error logged to system');
    } catch (logError) {
      console.error('Failed to log frontend error:', logError);
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
    this.setState({ hasError: false, error: null, errorInfo: null });
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
                    {this.state.error.message}
                  </p>
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
