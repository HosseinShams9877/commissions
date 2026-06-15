'use client';

import { useNotificationContext, NotificationType } from '@/components/providers/notification-provider';

export function useNotifications() {
  const ctx = useNotificationContext();

  return {
    notifications: ctx.notifications,
    addNotification: (type: NotificationType, title: string, message: string) => {
      ctx.addNotification(type, title, message);
    },
    markAsRead: (id: string) => {
      ctx.markAsRead(id);
    },
    markAllAsRead: () => {
      ctx.markAllAsRead();
    },
    getUnreadCount: () => {
      return ctx.getUnreadCount();
    },
  };
}
