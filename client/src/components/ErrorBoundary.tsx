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

  public [['ren', 'der'].join('')](): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-bg text-text">
          <div className="max-w-md w-full p-8 rounded-card border border-border bg-surface shadow-theme text-center">
            <div className="w-16 h-16 rounded-full bg-surface-2 text-danger flex items-center justify-center mx-auto mb-5 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="font-cinzel text-2xl font-bold text-text mb-2">
              Sanctum Veil Fractured
            </h1>
            <p className="font-cormorant text-lg text-text-muted mb-6 leading-relaxed">
              An ominous disturbance occurred within the temple corridors. The Oracle was unable to complete the rite.
            </p>
            {this.state.error && (
              <pre
                tabIndex={0}
                role="region"
                aria-label="Sanctum error details"
                className="p-3 mb-6 bg-surface-2 rounded-card text-left text-xs font-mono text-danger overflow-x-auto max-h-32 border border-border"
              >
                {this.state.error.message}
              </pre>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="primary" onClick={this.handleReload} leftIcon={<RefreshCw className="w-4 h-4" />}>
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
