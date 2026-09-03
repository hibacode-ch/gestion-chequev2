import React from 'react';
import { User, NotificationItem } from '../types';
import { Shield, Bell, LogOut, Database, Calendar } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  activeSection: string;
  setActiveSection: (s: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  notifications,
  onOpenNotifications,
  activeSection,
  setActiveSection
}) => {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const urgentCount = notifications.filter(n => n.urgent).length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveSection('accueil')}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg leading-tight">Chez Sahraoui</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded-full border border-emerald-200">
                  <Database className="w-3 h-3 text-emerald-600" />
                  Firestore Live
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Gestion financière & chèques</p>
            </div>
          </div>

          {/* Date */}
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="capitalize">{currentDate}</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Notifications toggle */}
            <button
              id="headerNotifBtn"
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className={`absolute top-1 right-1 w-4 h-4 text-[10px] font-bold text-white rounded-full flex items-center justify-center ${
                  urgentCount > 0 ? 'bg-rose-500 ring-2 ring-white animate-pulse' : 'bg-blue-600'
                }`}>
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {/* User Profile info */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm border border-slate-200">
                {user.role === 'admin' ? '👑' : '💼'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
                <div className="text-[11px] text-slate-500 capitalize">
                  {user.role === 'admin' ? 'Administrateur' : 'Gérant'}
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              id="headerLogoutBtn"
              type="button"
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition ml-1"
              title="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 border-t border-slate-100 text-sm font-medium scrollbar-none">
          <button
            id="tabAccueil"
            type="button"
            onClick={() => setActiveSection('accueil')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeSection === 'accueil'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            🏠 Accueil
          </button>
          <button
            id="tabCheques"
            type="button"
            onClick={() => setActiveSection('cheques')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeSection === 'cheques'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            📋 Chèques
          </button>
          <button
            id="tabFournisseurs"
            type="button"
            onClick={() => setActiveSection('fournisseurs')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeSection === 'fournisseurs'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            👥 Fournisseurs
          </button>
          <button
            id="tabStats"
            type="button"
            onClick={() => setActiveSection('statistiques')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeSection === 'statistiques'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            📊 Statistiques
          </button>
          <button
            id="tabRapport"
            type="button"
            onClick={() => setActiveSection('rapport')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeSection === 'rapport'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            📈 Rapport
          </button>
          {user.role === 'admin' && (
            <button
              id="tabParametres"
              type="button"
              onClick={() => setActiveSection('parametres')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                activeSection === 'parametres'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              ⚙️ Administration
            </button>
          )}
          <a
            href="/mobil"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg whitespace-nowrap text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1.5 ml-auto text-xs font-semibold"
          >
            <span>📱 Version Mobile</span>
            <span>↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
};
