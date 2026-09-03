import React, { useState } from 'react';
import { loginUser } from '../api';
import { User } from '../types';
import { Shield, Briefcase, Lock, User as UserIcon, Database } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loginUser(username, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Identifiants incorrects');
      }
    } catch (err) {
      setError('Erreur réseau de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    loginUser(u, p).then(res => {
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      }
    });
  };

  return (
    <div id="loginModal" className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-blue-500/30">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chez Sahraoui</h1>
          <p className="text-sm text-slate-500 mt-1">Gestion des chèques, budgets & fournisseurs</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full mt-3 border border-emerald-200">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Connecté à Firebase Firestore</span>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Nom d'utilisateur
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                id="loginUsernameInput"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: gerant3"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="loginPasswordInput"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <button
            id="loginSubmitBtn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
            Comptes d'accès rapide (cliquer pour se connecter)
          </p>
          <div className="space-y-2">
            <button
              id="quickLoginHiba"
              type="button"
              onClick={() => handleQuickLogin('gerant3', 'hiba1122.33')}
              className="w-full p-2.5 text-left bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl text-xs flex items-center justify-between text-sky-900 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                <div>
                  <span className="font-bold">المديرة (Hiba)</span>
                  <span className="text-sky-600 ml-1.5">gerant3</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-sky-200 text-sky-800 text-[10px] font-bold rounded-full">Admin</span>
            </button>

            <button
              id="quickLoginBrahim"
              type="button"
              onClick={() => handleQuickLogin('gerant1', 'brahim1122.33')}
              className="w-full p-2.5 text-left bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs flex items-center justify-between text-purple-900 transition"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="font-bold">المسير 1 (Brahim)</span>
                  <span className="text-purple-600 ml-1.5">gerant1</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-[10px] font-bold rounded-full">Gérant</span>
            </button>

            <button
              id="quickLoginAnas"
              type="button"
              onClick={() => handleQuickLogin('gerant2', 'anas1122.33')}
              className="w-full p-2.5 text-left bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs flex items-center justify-between text-purple-900 transition"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="font-bold">المسير 2 (Anas)</span>
                  <span className="text-purple-600 ml-1.5">gerant2</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-[10px] font-bold rounded-full">Gérant</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
