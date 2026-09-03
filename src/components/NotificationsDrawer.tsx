import React from 'react';
import { NotificationItem } from '../types';
import { X, Bell, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-900 text-sm">Centre de Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                    n.urgent
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-slate-50 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {n.urgent ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium leading-relaxed">{n.message}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.date).toLocaleString('fr-FR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
