import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8 text-center">
          <div className="space-y-8 max-w-md w-full animate-in fade-in zoom-in duration-500">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-error/20 rounded-full animate-ping" />
              <div className="relative bg-error/10 w-full h-full rounded-full flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-error" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-2xl font-headline font-bold text-on-background">应用程序遇到异常</h1>
              <p className="text-sm text-on-background/50 leading-relaxed">
                我们正在尝试恢复，如果问题持续存在，请尝试重启应用或联系管理员。
              </p>
              <div className="p-4 bg-surface-container rounded-xl text-left font-mono text-[10px] text-on-background/30 overflow-auto max-h-32">
                {this.state.error?.toString()}
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-on-primary rounded-2xl font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              立即重启应用
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
