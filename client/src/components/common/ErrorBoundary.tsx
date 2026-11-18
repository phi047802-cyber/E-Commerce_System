import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log error in dev/test environment
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary caught error]:', error, errorInfo);
    }
  }

  handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    window.location.reload();
  };

  handleGoHome = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      if (this.props.compact) {
        return (
          <div className="p-4 rounded-xl bg-[#1A1414] border border-[#E11D2E]/30 text-white text-sm my-2">
            <div className="flex items-center gap-2 text-[#E11D2E] font-semibold mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span>{this.props.fallbackTitle || 'Không thể hiển thị khu vực này'}</span>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              {this.props.fallbackMessage || 'Đã xảy ra lỗi khi hiển thị nội dung.'}
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#241717] hover:bg-[#2F1D1E] border border-[#E11D2E]/40 text-xs text-red-200 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Thử lại</span>
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-[#0E0E0E] text-white">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#141414] border border-[#2A2A2A] shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#E11D2E]/10 border border-[#E11D2E]/30 flex items-center justify-center text-[#E11D2E]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
              {this.props.fallbackTitle || 'Đã xảy ra lỗi hiển thị'}
            </h2>

            <p className="text-xs sm:text-sm text-neutral-400 mb-6 leading-relaxed">
              {this.props.fallbackMessage ||
                'Đã xảy ra lỗi hiển thị. Bạn có thể thử tải lại trang hoặc quay về trang chủ để tiếp tục.'}
            </p>

            {isDev && this.state.error && (
              <div className="mb-6 p-3 rounded-lg bg-[#1B1B1B] border border-[#2F2F2F] text-left overflow-x-auto text-[11px] text-red-300 font-mono">
                <div className="font-semibold text-red-400 mb-1">{this.state.error.name}: {this.state.error.message}</div>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-neutral-400 whitespace-pre-wrap max-h-28 overflow-y-auto">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E11D2E] hover:bg-[#C01525] text-white text-xs sm:text-sm font-semibold transition shadow-lg shadow-[#E11D2E]/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tải lại trang</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F1F1F] hover:bg-[#292929] border border-[#2E2E2E] text-neutral-200 text-xs sm:text-sm font-medium transition"
              >
                <Home className="w-4 h-4" />
                <span>Về trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
