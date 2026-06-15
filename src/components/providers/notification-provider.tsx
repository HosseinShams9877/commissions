'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { X, Bell, CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ====== Types ======
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (type: NotificationType, title: string, message: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
}

// ====== Icon mapping ======
const typeIcons: Record<NotificationType, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const typeStyles: Record<NotificationType, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

const typeIconStyles: Record<NotificationType, string> = {
  info: 'text-sky-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-rose-500',
};

// ====== Load read IDs from localStorage ======
function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem('notification-read-ids');
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      return new Set(ids);
    }
  } catch {
    // ignore
  }
  return new Set();
}

// ====== Save read IDs to localStorage ======
function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem('notification-read-ids', JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

// ====== Provider ======
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const readIdsRef = useRef<Set<string>>(loadReadIds());

  const addNotification = useCallback((type: NotificationType, title: string, message: string) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const notif: Notification = {
      id,
      type,
      title,
      message,
      read: readIdsRef.current.has(id),
      createdAt: Date.now(),
    };
    setNotifications(prev => [notif, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    readIdsRef.current = new Set(readIdsRef.current).add(id);
    saveReadIds(readIdsRef.current);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const newReadIds = new Set(readIdsRef.current);
      prev.forEach(n => newReadIds.add(n.id));
      readIdsRef.current = newReadIds;
      saveReadIds(newReadIds);
      return prev.map(n => ({ ...n, read: true }));
    });
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        getUnreadCount,
        removeNotification,
      }}
    >
      {children}
      {/* Toast stack — bottom-left in LTR (bottom-right in RTL) */}
      <NotificationToaster notifications={notifications} onDismiss={removeNotification} onRead={markAsRead} />
    </NotificationContext.Provider>
  );
}

// ====== Toast stack ======
function NotificationToaster({
  notifications,
  onDismiss,
  onRead,
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}) {
  // Show only the latest 5
  const visible = notifications.slice(0, 5);

  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 max-w-sm" dir="rtl">
      {visible.map(n => (
        <NotificationToast key={n.id} notification={n} onDismiss={onDismiss} onRead={onRead} />
      ))}
    </div>
  );
}

function NotificationToast({
  notification,
  onDismiss,
  onRead,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}) {
  const [visible, setVisible] = useState(true);
  const Icon = typeIcons[notification.type];

  // Auto-dismiss after 5s
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(notification.id), 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <div
      onClick={() => onRead(notification.id)}
      className={cn(
        'rounded-xl border p-3 shadow-lg transition-all duration-300 cursor-pointer',
        'animate-in slide-in-from-bottom-2 fade-in-0',
        !visible && 'animate-out slide-out-to-bottom-2 fade-out-0',
        typeStyles[notification.type],
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', typeIconStyles[notification.type])} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{notification.title}</p>
          <p className="text-xs mt-0.5 opacity-80">{notification.message}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
          className="shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors"
        >
          <X className="h-3.5 w-3.5 opacity-50" />
        </button>
      </div>
    </div>
  );
}

// ====== Bell icon component for header ======
export function NotificationBell() {
  const { notifications, markAllAsRead, markAsRead, removeNotification, getUnreadCount } = useNotificationContext();
  const [open, setOpen] = useState(false);
  const unreadCount = getUnreadCount();
  const recentNotifications = notifications.slice(0, 20);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-emerald-700/30 text-emerald-200 hover:text-emerald-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? '۹+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between p-3 bg-gradient-to-l from-emerald-50 to-teal-50 border-b border-emerald-100">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                اعلان‌ها
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
                >
                  خواندن همه
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">اعلانی وجود ندارد</p>
                </div>
              ) : (
                recentNotifications.map(n => {
                  const Icon = typeIcons[n.type];
                  return (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={cn(
                        'flex items-start gap-2 p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer',
                        !n.read && 'bg-emerald-50/30',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', typeIconStyles[n.type])} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-semibold', !n.read && 'text-gray-900', n.read && 'text-gray-500')}>{n.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{n.message}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                        className="shrink-0 p-0.5 rounded hover:bg-gray-200"
                      >
                        <X className="h-3 w-3 text-gray-400" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
