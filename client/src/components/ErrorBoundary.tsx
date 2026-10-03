import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in temple sanctuary:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-marble-100 dark:bg-lapis-950 text-ink-900 dark:text-marble-100">
          <div className="max-w-md w-full p-8 rounded-sm border border-terracotta-500/40 bg-white/80 dark:bg-lapis-900/90 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-terracotta-500/10 text-terracotta-500 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="font-cinzel text-2xl font-bold text-ink-950 dark:text-gold-300 mb-2">
              Sanctum Veil Fractured
            </h1>
            <p className="font-cormorant text-lg text-ink-700 dark:text-marble-300 mb-6 leading-relaxed">
              An ominous disturbance occurred within the temple corridors. The Oracle was unable to complete the rite.
            </p>
            {this.state.error && (
              <pre className="p-3 mb-6 bg-black/5 dark:bg-black/30 rounded text-left text-xs font-mono text-terracotta-600 dark:text-terracotta-400 overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="gold" onClick={this.handleReload} leftIcon={<RefreshCw className="w-4 h-4" />}>
                Re-enter Temple
              </Button>
              <Button variant="outline" onClick={this.handleReset}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
