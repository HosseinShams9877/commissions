import Link from 'next/link';
import { FileQuestion, Home, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 mb-6">
            <div className="flex flex-col items-center">
              <FileQuestion className="h-12 w-12 text-emerald-500 mb-1" />
              <span className="text-3xl font-black text-emerald-600">۴۰۴</span>
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-emerald-900 mb-3">
          صفحه مورد نظر یافت نشد
        </h1>
        <p className="text-emerald-600/70 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا حذف شده است. لطفاً به صفحه اصلی بازگردید.
        </p>

        {/* Decorative dots */}
        <div className="flex justify-center gap-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-emerald-300" />
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <div className="w-2 h-2 rounded-full bg-teal-400" />
        </div>

        {/* Action */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
        >
          <Home className="h-4 w-4" />
          بازگشت به صفحه اصلی
          <ArrowRight className="h-4 w-4 rotate-180" />
        </Link>
      </div>
    </div>
  );
}
