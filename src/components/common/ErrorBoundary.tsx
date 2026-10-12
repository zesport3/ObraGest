import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Download, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  isRoot?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  backupDownloaded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      backupDownloaded: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      backupDownloaded: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log safe error details to console without exposing sensitive data
    console.error('ErrorBoundary capturou erro:', error.message, errorInfo.componentStack);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleEmergencyBackup = () => {
    try {
      const backupData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('obragest_')) {
          try {
            backupData[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            backupData[key] = localStorage.getItem(key);
          }
        }
      }

      const blob = new Blob(
        [
          JSON.stringify(
            {
              exportDate: new Date().toISOString(),
              version: '1.0-emergency',
              data: backupData,
            },
            null,
            2
          ),
        ],
        { type: 'application/json' }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Obragest_Copia_Seguranca_Emergencia_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.setState({ backupDownloaded: true });
    } catch (e) {
      console.error('Falha ao exportar cópia de emergência:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      const isRoot = this.props.isRoot ?? true;

      return (
        <div
          className={`flex flex-col items-center justify-center p-6 text-slate-800 ${
            isRoot ? 'min-h-screen bg-slate-50' : 'p-8 bg-white rounded-2xl border border-rose-200 my-4'
          }`}
        >
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">
                {this.props.fallbackTitle || 'Ocorreu uma falha inesperada'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                A aplicação encontrou um problema temporário ao renderizar esta secção. Os seus dados guardados no
                navegador permanecem seguros.
              </p>
            </div>

            {/* Emergency actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Tentar Novamente</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                <Home className="h-4 w-4" />
                <span>Recarregar Aplicação</span>
              </button>

              <button
                type="button"
                onClick={this.handleEmergencyBackup}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 px-4 py-2 text-xs font-semibold text-amber-900 transition-colors cursor-pointer"
              >
                {this.state.backupDownloaded ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Cópia de Segurança Guardada</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-amber-700" />
                    <span>Descarregar Cópia de Emergência</span>
                  </>
                )}
              </button>
            </div>

            {/* Technical details (collapsible) */}
            {this.state.error && (
              <details className="text-left pt-2 border-t border-slate-100">
                <summary className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Ver detalhes técnicos do erro</span>
                </summary>
                <div className="mt-2 p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[10px] font-mono overflow-auto max-h-36">
                  <p className="font-bold text-rose-400">{this.state.error.name}: {this.state.error.message}</p>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
