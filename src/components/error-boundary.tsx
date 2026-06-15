'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, ClipboardCopy, CheckCircle2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

/**
 * React Error Boundary component that catches JavaScript errors anywhere in its child component tree.
 * Logs errors to console and displays a Persian fallback UI with retry and report functionality.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details to console for debugging
    console.error('[ErrorBoundary] یک خطای رخ‌داده ضبط شد:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
  };

  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorReport = [
      '=== گزارش خطای برنامه ===',
      `زمان: ${new Date().toLocaleString('fa-IR')}`,
      `پیام خطا: ${error.message}`,
      `نوع خطا: ${error.name}`,
      `مسیر کامپوننت: ${errorInfo?.componentStack || 'نامشخص'}`,
      `جزئیات کامل: ${error.toString()}`,
      '=== پایان گزارش ===',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(errorReport);
      this.setState({ copied: true });
      setTimeout(() => {
        this.setState({ copied: false });
      }, 2000);
    } catch (err) {
      console.error('[ErrorBoundary] خطا در کپی کردن:', err);
      // Fallback: select text in a textarea
      const textarea = document.createElement('textarea');
      textarea.value = errorReport;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.setState({ copied: true });
        setTimeout(() => {
          this.setState({ copied: false });
        }, 2000);
      } catch {
        console.error('[ErrorBoundary] کپی از طریق fallback هم ناموفق بود');
      }
      document.body.removeChild(textarea);
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div dir="rtl" className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">خطایی رخ داده است</h2>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-emerald-700/80 text-sm leading-relaxed">
                لطفاً صفحه را مجدداً بارگذاری کنید
              </p>

              {/* Error details (collapsible) */}
              {this.state.error && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-emerald-600/60 hover:text-emerald-700 transition-colors">
                    جزئیات خطا
                  </summary>
                  <div className="mt-2 p-3 bg-emerald-50/80 rounded-lg border border-emerald-100">
                    <pre className="text-[11px] text-emerald-800/70 whitespace-pre-wrap break-words font-mono leading-relaxed direction-ltr" dir="ltr">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <RefreshCw className="h-4 w-4" />
                  تلاش مجدد
                </button>
                <button
                  onClick={this.handleCopyError}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all active:scale-[0.98]"
                >
                  {this.state.copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      کپی شد!
                    </>
                  ) : (
                    <>
                      <ClipboardCopy className="h-4 w-4" />
                      گزارش خطا
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component that wraps a component with an ErrorBoundary.
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: React.ReactNode,
): React.ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}
