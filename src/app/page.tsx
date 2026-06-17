'use client';

import { useState, useEffect } from 'react';
import { useCommissionStore } from '@/lib/store';
import { PERSIAN_MONTHS, toPersianDigits, formatShamsiDate, getCurrentShamsiDate, cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SalesPersonManager } from '@/components/commission/sales-person-manager';
import { EnhancedDashboardTab } from '@/components/commission/enhanced-dashboard-tab';
import { PercentageCommissionTab } from '@/components/commission/percentage-commission-tab';
import { TieredCommissionTab } from '@/components/commission/tiered-commission-tab';
import { FinderFeeTab } from '@/components/commission/finder-fee-tab';
import { TestCostTab } from '@/components/commission/test-cost-tab';
import { RepairCostTab } from '@/components/commission/repair-cost-tab';
import { SalesShareTab } from '@/components/commission/sales-share-tab';
import { TeamCommissionTab } from '@/components/commission/team-commission-tab';
import { BonusPenaltyTab } from '@/components/commission/bonus-penalty-tab';
import { SalesTargetTab } from '@/components/commission/sales-target-tab';
import { FinancialReportTab } from '@/components/commission/financial-report-tab';
import { PrintReport } from '@/components/commission/print-report';
import { SettingsTab } from '@/components/commission/settings-tab';
import { NotificationProvider, NotificationBell } from '@/components/providers/notification-provider';
import {
  Percent, Layers, Handshake,
  FlaskConical, Wrench, TrendingUp, Users, Calculator,
  ChevronLeft, Menu, X, Sparkles, UsersRound, Gift, Target,
  FileBarChart, Printer, Settings as SettingsIcon, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { id: 'dashboard', label: 'داشبورد پیشرفته', icon: BarChart3, gradient: 'from-emerald-400 to-teal-400' },
  { id: 'salespersons', label: 'فروشندگان', icon: Users, gradient: 'from-blue-400 to-indigo-400' },
  { id: 'percentage', label: 'پورسانت درصدی', icon: Percent, gradient: 'from-emerald-400 to-green-400' },
  { id: 'tiered', label: 'پورسانت پلکانی', icon: Layers, gradient: 'from-violet-400 to-purple-400' },
  { id: 'team', label: 'پورسانت تیمی', icon: UsersRound, gradient: 'from-indigo-400 to-blue-400' },
  { id: 'finderfee', label: 'حق‌النصب', icon: Handshake, gradient: 'from-teal-400 to-cyan-400' },
  { id: 'testcost', label: 'هزینه تست', icon: FlaskConical, gradient: 'from-orange-400 to-amber-400' },
  { id: 'repair', label: 'تعمیرات', icon: Wrench, gradient: 'from-rose-400 to-pink-400' },
  { id: 'sharesshare', label: 'سهم از فروش', icon: TrendingUp, gradient: 'from-cyan-400 to-sky-400' },
  { id: 'bonuspenalty', label: 'پاداش / جریمه', icon: Gift, gradient: 'from-lime-400 to-green-400' },
  { id: 'target', label: 'هدف فروش', icon: Target, gradient: 'from-sky-400 to-blue-400' },
  { id: 'financial', label: 'گزارش مالی', icon: FileBarChart, gradient: 'from-amber-400 to-orange-400' },
  { id: 'printreport', label: 'چاپ گزارش', icon: Printer, gradient: 'from-emerald-400 to-green-300' },
  { id: 'settings', label: 'تنظیمات', icon: SettingsIcon, gradient: 'from-gray-400 to-gray-300' },
];

interface SidebarContentProps {
  sidebarCollapsed: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onToggleSidebar: () => void;
}

function SidebarContent({ sidebarCollapsed, activeTab, onTabChange, onToggleSidebar }: SidebarContentProps) {
  const { currentPeriod, setCurrentPeriod } = useCommissionStore();
  const years = Array.from({ length: 11 }, (_, i) => 1400 + i);
  const [shamsiNow, setShamsiNow] = useState<{ year: number; month: number; day: number } | null>(null);

useEffect(() => {
  setShamsiNow(getCurrentShamsiDate());
}, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-950">
      {/* Logo */}
      <div className="p-4 border-b border-emerald-700/30">
        <div className="flex items-center gap-3">
          <div className="glass text-emerald-200 p-2.5 rounded-xl shrink-0">
            <Calculator className="h-6 w-6" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-hidden">
              <h1 className="text-base font-bold text-emerald-50 leading-tight">محاسبه‌گر پورسانت</h1>
              <p className="text-[11px] text-emerald-300/60 leading-tight flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                سیستم خودکار محاسبه ماهانه
              </p>
            </div>
          )}
          {/* Notification Bell */}
          <NotificationBell />
        </div>
      </div>

      {/* Period Selector */}
      <div className="p-3 border-b border-emerald-700/20 bg-emerald-950/30">
        {!sidebarCollapsed ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-emerald-400/80">دوره حسابداری</label>
            <div className="flex gap-2">
              <Select value={currentPeriod.month.toString()} onValueChange={(val) => setCurrentPeriod({ ...currentPeriod, month: parseInt(val) })}>
                <SelectTrigger className="h-8 text-xs flex-1 bg-emerald-800/50 border-emerald-600/30 text-emerald-100 hover:bg-emerald-700/50 focus-visible:ring-emerald-500/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSIAN_MONTHS.map((m, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={currentPeriod.year.toString()} onValueChange={(val) => setCurrentPeriod({ ...currentPeriod, year: parseInt(val) })}>
                <SelectTrigger className="h-8 text-xs w-20 bg-emerald-800/50 border-emerald-600/30 text-emerald-100 hover:bg-emerald-700/50 focus-visible:ring-emerald-500/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{toPersianDigits(y)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="text-[10px] text-emerald-300/70 text-center leading-tight">
              {toPersianDigits(currentPeriod.year)}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto sidebar-scroll">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative',
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-400/25 shadow-lg shadow-emerald-500/10 backdrop-blur-sm sidebar-active-glow'
                    : 'text-emerald-200/60 hover:bg-emerald-700/25 hover:text-emerald-50 border border-transparent'
                )}
              >
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 rounded-full" />
                )}
                <div className={cn(
                  'p-1.5 rounded-lg shrink-0',
                  isActive ? `bg-gradient-to-br ${item.gradient} shadow-sm` : 'bg-emerald-800/40'
                )}>
                  <item.icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-emerald-300/70')} />
                </div>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-right">{item.label}</span>
                    {isActive && <ChevronLeft className="h-4 w-4 text-emerald-400/70" />}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Today's Date */}
      <div className="p-3 border-t border-emerald-700/20 bg-emerald-950/30">
        {shamsiNow && (!sidebarCollapsed ? (
          <div className="text-xs text-emerald-400/60">
            <span>تاریخ امروز: </span>
            <span className="font-semibold text-emerald-200/80">
              {formatShamsiDate(shamsiNow.year, shamsiNow.month, shamsiNow.day)}
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-emerald-300/50 text-center">
            {toPersianDigits(shamsiNow.day)}
          </div>
        ))}
      </div>

      {/* Collapse Toggle */}
      <div className="hidden md:block p-2 border-t border-emerald-700/20">
        <button
          onClick={onToggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-emerald-300/50 hover:bg-emerald-700/25 hover:text-emerald-100 transition-colors"
        >
          {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {!sidebarCollapsed && <span>بستن منو</span>}
        </button>
      </div>
    </div>
  );
}

function TabContent({ activeTab }: { activeTab: string }) {
  switch (activeTab) {
    case 'dashboard': return <EnhancedDashboardTab />;
    case 'salespersons': return <SalesPersonManager />;
    case 'percentage': return <PercentageCommissionTab />;
    case 'tiered': return <TieredCommissionTab />;
    case 'team': return <TeamCommissionTab />;
    case 'finderfee': return <FinderFeeTab />;
    case 'testcost': return <TestCostTab />;
    case 'repair': return <RepairCostTab />;
    case 'sharesshare': return <SalesShareTab />;
    case 'bonuspenalty': return <BonusPenaltyTab />;
    case 'target': return <SalesTargetTab />;
    case 'financial': return <FinancialReportTab />;
    case 'printreport': return <PrintReport />;
    case 'settings': return <SettingsTab />;
    default: return <EnhancedDashboardTab />;
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setCurrentPeriod } = useCommissionStore();

  // Fix hydration: set current period on client only
  useEffect(() => {
    setCurrentPeriod(getCurrentShamsiDate());
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const activeNav = navItems.find((n) => n.id === activeTab);

  return (
    <NotificationProvider>
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 main-content-bg">
      {/* Mobile Header */}
      <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-emerald-100 shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2 rounded-xl shadow-md shadow-emerald-500/20">
              <Calculator className="h-5 w-5" />
            </div>
            <h1 className="text-base font-bold gradient-text">محاسبه‌گر پورسانت</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} className="h-9 w-9 hover:bg-emerald-50">
            <Menu className="h-5 w-5 text-emerald-700" />
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-emerald-950/50 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar Drawer */}
      <div className={cn('md:hidden fixed top-0 right-0 h-full w-72 shadow-2xl z-50 transition-transform duration-300', mobileOpen ? 'translate-x-0' : 'translate-x-full')}>
        <SidebarContent sidebarCollapsed={false} activeTab={activeTab} onTabChange={handleTabChange} onToggleSidebar={() => setMobileOpen(false)} />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen">
        <aside className={cn('shrink-0 transition-all duration-300 sticky top-0 h-screen overflow-hidden shadow-xl shadow-emerald-900/20', sidebarCollapsed ? 'w-[68px]' : 'w-64')}>
          <SidebarContent sidebarCollapsed={sidebarCollapsed} activeTab={activeTab} onTabChange={handleTabChange} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        </aside>
        <main className="flex-1 min-w-0">
          <div key={activeTab} className="p-6 max-w-6xl mx-auto animate-page-enter">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold gradient-text flex items-center gap-3">
                {activeNav && (
                  <div className={cn('p-2 rounded-xl bg-gradient-to-br shadow-md', activeNav.gradient)}>
                    <activeNav.icon className="h-6 w-6 text-white drop-shadow-sm" />
                  </div>
                )}
                {activeNav?.label}
              </h2>
            </div>
            <TabContent activeTab={activeTab} />
          </div>
        </main>
      </div>

      {/* Mobile Content */}
      <main className="md:hidden p-4 main-content-bg">
        <div className="mb-4">
          <h2 className="text-lg font-bold gradient-text flex items-center gap-2">
            {activeNav && (
              <div className={cn('p-1.5 rounded-lg bg-gradient-to-br shadow-sm', activeNav.gradient)}>
                <activeNav.icon className="h-4 w-4 text-white" />
              </div>
            )}
            {activeNav?.label}
          </h2>
        </div>
        <TabContent activeTab={activeTab} />
      </main>
    </div>
    </NotificationProvider>
  );
}
