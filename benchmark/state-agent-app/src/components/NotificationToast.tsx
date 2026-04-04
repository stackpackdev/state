import React from 'react';
import type { Notification } from '../types';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const TYPE_STYLES: Record<Notification['type'], { bg: string; border: string; icon: string }> = {
  success: { bg: '#f0fdf4', border: '#22c55e', icon: '[ok]' },
  error: { bg: '#fef2f2', border: '#ef4444', icon: '[!!]' },
  info: { bg: '#eff6ff', border: '#3b82f6', icon: '[i]' },
  warning: { bg: '#fffbeb', border: '#f59e0b', icon: '[!]' },
};

export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const style = TYPE_STYLES[notification.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        marginBottom: 8,
        backgroundColor: style.bg,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: 6,
        fontSize: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <span style={{ fontWeight: 700, minWidth: 24 }}>{style.icon}</span>
      <span style={{ flex: 1 }}>{notification.message}</span>
      <button
        onClick={() => onDismiss(notification.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          color: '#666',
        }}
      >
        x
      </button>
    </div>
  );
}
