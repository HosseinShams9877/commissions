'use client';

import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[AppError] خطای سطح برنامه:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <ErrorBoundary>
      <div dir="rtl" className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">خطایی رخ داده است</h1>
                  <p className="text-emerald-100 text-sm mt-1">متأسفانه در اجرای برنامه خطایی ایجاد شده است</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              <p className="text-emerald-700/80 text-sm leading-relaxed">
                لطفاً صفحه را مجدداً بارگذاری کنید. اگر مشکل ادامه یافت، با پشتیبانی تماس بگیرید.
              </p>

              {/* Error digest reference */}
              {error.digest && (
                <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600/60">
                    شناسه خطا:{' '}
                    <span className="font-mono text-emerald-700" dir="ltr">
                      {error.digest}
                    </span>
                  </p>
                </div>
              )}

              {/* Error details */}
              <details className="group">
                <summary className="cursor-pointer text-xs text-emerald-600/60 hover:text-emerald-700 transition-colors">
                  جزئیات فنی خطا
                </summary>
                <div className="mt-2 p-3 bg-emerald-50/80 rounded-lg border border-emerald-100">
                  <pre className="text-[11px] text-emerald-800/70 whitespace-pre-wrap break-words font-mono leading-relaxed" dir="ltr">
                    {error.message}
                    {error.stack && `\n\n${error.stack}`}
                  </pre>
                </div>
              </details>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <RefreshCw className="h-4 w-4" />
                  تلاش مجدد
                </button>
                <Link
                  href="/"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-all active:scale-[0.98]"
                >
                  <Home className="h-4 w-4" />
                  بازگشت به صفحه اصلی
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
