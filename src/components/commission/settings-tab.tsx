'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCommissionStore } from '@/lib/store';
import { useNotifications } from '@/hooks/use-notifications';
import { toPersianDigits, cn } from '@/lib/utils';
import {
  Building2, Phone, MapPin, Save, RotateCcw, Database,
  Download, Upload, Shield, Users, Settings as SettingsIcon,
  Percent, Trash2, Eye, EyeOff, Loader2,
} from 'lucide-react';

interface AppSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_logo: string;
  default_percentage: string;
  default_team_personal_percent: string;
  default_team_percent: string;
}

const defaultSettings: AppSettings = {
  company_name: 'شرکت',
  company_address: '',
  company_phone: '',
  company_logo: '',
  default_percentage: '0',
  default_team_personal_percent: '0',
  default_team_percent: '0',
};

export function SettingsTab() {
  const { exportAllData, importAllData, salesPersons } = useCommissionStore();
  const { addNotification } = useNotifications();

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<{ id: string; name: string; username: string; role: string; active: boolean }>>([]);

  // Load settings from API
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(prev => ({
            ...prev,
            ...Object.fromEntries(
              Object.keys(defaultSettings).map(k => [k, data.settings[k] || prev[k as keyof AppSettings]])
            ),
          }));
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  // Load users from API
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      // For now, show a simple list — in production this would be an admin API
      // We'll show the user info from the auth endpoint
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings to API
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        addNotification('success', 'تنظیمات ذخیره شد', 'تنظیمات برنامه با موفقیت ذخیره شد');
      } else {
        addNotification('error', 'خطا', 'ذخیره تنظیمات ناموفق بود');
      }
    } catch {
      addNotification('error', 'خطا', 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  // Reset settings
  const handleResetSettings = () => {
    setSettings(defaultSettings);
    addNotification('info', 'بازنشانی', 'تنظیمات به حالت پیش‌فرض بازنشانی شد');
  };

  // Backup data
  const handleBackup = () => {
    try {
      const json = exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `commission-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addNotification('success', 'پشتیبان‌گیری', 'فایل پشتیبان با موفقیت دانلود شد');
    } catch {
      addNotification('error', 'خطا', 'پشتیبان‌گیری ناموفق بود');
    }
  };

  // Restore data
  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const success = importAllData(text);
        if (success) {
          addNotification('success', 'بازیابی', 'داده‌ها با موفقیت بازیابی شد');
        } else {
          addNotification('error', 'خطا', 'فایل نامعتبر است');
        }
      } catch {
        addNotification('error', 'خطا', 'بازیابی ناموفق بود');
      }
    };
    input.click();
  };

  // Sync localStorage to DB
  const handleSyncToDB = async () => {
    try {
      const allData = exportAllData();
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: allData,
      });
      if (res.ok) {
        addNotification('success', 'همگام‌سازی', 'داده‌ها با موفقیت به پایگاه داده منتقل شد');
      } else {
        addNotification('error', 'خطا', 'همگام‌سازی ناموفق بود');
      }
    } catch {
      addNotification('error', 'خطا', 'همگام‌سازی ناموفق بود');
    }
  };

  const updateSetting = (key: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Company Info */}
      <Card className="rounded-2xl shadow-sm border overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Building2 className="h-4 w-4 text-emerald-600" />
            اطلاعات شرکت
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">نام شرکت</Label>
              <Input
                value={settings.company_name}
                onChange={e => updateSetting('company_name', e.target.value)}
                className="h-9 text-sm rounded-xl"
                placeholder="نام شرکت"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">تلفن</Label>
              <Input
                value={settings.company_phone}
                onChange={e => updateSetting('company_phone', e.target.value)}
                className="h-9 text-sm rounded-xl"
                placeholder="شماره تلفن"
                dir="ltr"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">آدرس</Label>
            <Input
              value={settings.company_address}
              onChange={e => updateSetting('company_address', e.target.value)}
              className="h-9 text-sm rounded-xl"
              placeholder="آدرس شرکت"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">لوگو (URL)</Label>
            <Input
              value={settings.company_logo}
              onChange={e => updateSetting('company_logo', e.target.value)}
              className="h-9 text-sm rounded-xl"
              placeholder="آدرس تصویر لوگو"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Commission Percentages */}
      <Card className="rounded-2xl shadow-sm border overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50/80 to-orange-50/50 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Percent className="h-4 w-4 text-amber-600" />
            درصدهای پیش‌فرض پورسانت
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">درصد پیش‌فرض پورسانت</Label>
              <Input
                type="number"
                value={settings.default_percentage}
                onChange={e => updateSetting('default_percentage', e.target.value)}
                className="h-9 text-sm rounded-xl"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">درصد شخصی تیم</Label>
              <Input
                type="number"
                value={settings.default_team_personal_percent}
                onChange={e => updateSetting('default_team_personal_percent', e.target.value)}
                className="h-9 text-sm rounded-xl"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">درصد تیمی</Label>
              <Input
                type="number"
                value={settings.default_team_percent}
                onChange={e => updateSetting('default_team_percent', e.target.value)}
                className="h-9 text-sm rounded-xl"
                dir="ltr"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="rounded-2xl shadow-sm border overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-sky-50/80 to-blue-50/50 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Database className="h-4 w-4 text-sky-600" />
            مدیریت داده‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={handleSyncToDB}
              className="gap-2 bg-sky-600 hover:bg-sky-700 rounded-xl h-10"
            >
              <Upload className="h-4 w-4" />
              همگام‌سازی با دیتابیس
            </Button>
            <Button
              variant="outline"
              onClick={handleBackup}
              className="gap-2 rounded-xl h-10 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="h-4 w-4" />
              پشتیبان‌گیری
            </Button>
            <Button
              variant="outline"
              onClick={handleRestore}
              className="gap-2 rounded-xl h-10 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Upload className="h-4 w-4" />
              بازیابی از فایل
            </Button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1">
            <p>• تعداد فروشندگان: <span className="font-bold">{toPersianDigits(salesPersons.length)}</span></p>
            <p>• داده‌ها در حافظه مرورگر و پایگاه داده ذخیره می‌شوند</p>
            <p>• همگام‌سازی: انتقال داده‌های حافظه مرورگر به پایگاه داده</p>
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card className="rounded-2xl shadow-sm border overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-violet-50/80 to-purple-50/50 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Shield className="h-4 w-4 text-violet-600" />
            مدیریت کاربران
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2">
            <p>• برای مدیریت کاربران از بخش ورود/ثبت‌نام استفاده کنید</p>
            <p>• نقش‌ها: مدیر (ADMIN)، مدیر میانی (MANAGER)، کاربر (USER)</p>
            <p>• فقط مدیران دسترسی به تنظیمات و حذف داده دارند</p>
          </div>
        </CardContent>
      </Card>

      {/* Save / Reset buttons */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl px-6"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره تنظیمات
        </Button>
        <Button
          variant="outline"
          onClick={handleResetSettings}
          className="gap-2 rounded-xl border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <RotateCcw className="h-4 w-4" />
          بازنشانی
        </Button>
      </div>
    </div>
  );
}
