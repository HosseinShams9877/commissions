export default function Loading() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-emerald-200" />
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-emerald-500 animate-spin" />
        </div>

        {/* Text */}
        <p className="text-sm font-medium text-emerald-700/80">
          در حال بارگذاری...
        </p>
      </div>
    </div>
  );
}
