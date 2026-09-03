import React, { useState, useEffect } from 'react';
import { User, AuditLogItem } from '../types';
import { fetchUsers, createUser, deleteUser, fetchAuditLogs } from '../api';
import { UserPlus, Trash2, Shield, User as UserIcon, Activity, Key } from 'lucide-react';

interface AdminUsersViewProps {
  currentUser: User;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'gerant'>('gerant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [uList, logs] = await Promise.all([fetchUsers(), fetchAuditLogs()]);
      setUsers(uList);
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !name) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createUser({ username, name, password, role });
      if (res.success) {
        setShowAddModal(false);
        setUsername('');
        setName('');
        setPassword('');
        loadData();
      } else {
        setError(res.error || 'Erreur création utilisateur');
      }
    } catch (err) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce compte utilisateur ?')) return;
    try {
      const res = await deleteUser(id);
      if (res.success) {
        loadData();
      } else {
        alert(res.error || 'Impossible de supprimer cet utilisateur');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Users Management */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Gestion des Accès & Utilisateurs</h2>
            <p className="text-xs text-slate-500">Comptes avec accès au système Chez Sahraoui (Firestore)</p>
          </div>
          <button
            id="btnOpenNewUserModal"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouveau compte</span>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {users.map((u) => (
            <div key={u.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-base shadow-xs">
                  {u.role === 'admin' ? '👑' : '💼'}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                  <div className="text-[11px] text-slate-500">@{u.username}</div>
                  <span className={`inline-block mt-1 px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                    u.role === 'admin' ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'Gérant'}
                  </span>
                </div>
              </div>

              {u.id !== currentUser.id && (
                <button
                  onClick={() => handleDelete(u.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                  title="Supprimer ce compte"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Journal d'Audit & Sécurité</h2>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Aucune entrée d'audit enregistrée.</p>
          ) : (
            auditLogs.slice(0, 50).map((log) => (
              <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between text-xs gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 font-mono text-[11px] px-1.5 py-0.5 bg-slate-200 rounded">
                      {log.action}
                    </span>
                    <span className="text-slate-600">{log.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Par {log.username} (ID: {log.userId})
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(log.date).toLocaleDateString('fr-FR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-4">Créer un Nouveau Compte</h3>

            {error && (
              <div className="mb-3 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Nom complet</label>
                <input
                  id="newUserNameInput"
                  type="text"
                  placeholder="Ex: المسير 3 (Karim)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Nom d'utilisateur (login)</label>
                <input
                  id="newUserLoginInput"
                  type="text"
                  placeholder="Ex: gerant4"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Mot de passe</label>
                <input
                  id="newUserPasswordInput"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 uppercase mb-1">Rôle</label>
                <select
                  id="newUserRoleSelect"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                >
                  <option value="gerant">Gérant (Ajout et suivi des chèques)</option>
                  <option value="admin">Administrateur (Tous les droits)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  id="btnSubmitNewUser"
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
                >
                  {loading ? 'Création...' : 'Créer l\'accès'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
