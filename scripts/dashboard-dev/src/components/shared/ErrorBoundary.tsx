import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches rendering errors and displays a fallback UI
 * instead of letting React crash the entire component tree (black screen).
 *
 * This is a safety net for the pipeline dashboard. When an error occurs
 * in a child component, this boundary catches it and shows a diagnostic
 * message with the error details, instead of a blank/black screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught rendering error:', error.message);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle ?? '组件渲染错误';
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="text-4xl mb-3 opacity-50">💥</div>
          <div className="text-text text-sm font-semibold mb-2">{title}</div>
          <div className="text-text2 text-xs max-w-md mb-4">
            {this.state.error?.message ?? '未知错误'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-accent text-white text-xs rounded-lg hover:opacity-90 transition-all"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
