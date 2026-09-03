import React, { useState, useEffect } from 'react';
import { User, Cheque, Fournisseur, Budget, NotificationItem } from './types';
import { checkCurrentAuth, fetchCheques, fetchFournisseurs, fetchBudget, fetchNotifications, logoutUser } from './api';
import { LoginModal } from './components/LoginModal';
import { Header } from './components/Header';
import { BudgetSummary } from './components/BudgetSummary';
import { ChequeList } from './components/ChequeList';
import { ChequeModal } from './components/ChequeModal';
import { FournisseursView } from './components/FournisseursView';
import { StatistiquesView } from './components/StatistiquesView';
import { RapportView } from './components/RapportView';
import { AdminUsersView } from './components/AdminUsersView';
import { BackupImportView } from './components/BackupImportView';
import { NotificationsDrawer } from './components/NotificationsDrawer';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App data state
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Navigation & UI state
  const [activeSection, setActiveSection] = useState<string>('accueil');
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    checkCurrentAuth().then(user => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  const loadAllData = async () => {
    try {
      const now = new Date();
      const [cList, fList, bData, nList] = await Promise.all([
        fetchCheques(),
        fetchFournisseurs(),
        fetchBudget(now.getMonth() + 1, now.getFullYear()),
        fetchNotifications()
      ]);
      setCheques(cList);
      setFournisseurs(fList);
      setBudget(bData);
      setNotifications(nList);
    } catch (err) {
      console.error('Erreur chargement des données:', err);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">Chargement de Chez Sahraoui...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginModal onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        user={currentUser}
        onLogout={handleLogout}
        notifications={notifications}
        onOpenNotifications={() => setShowNotifications(true)}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Section: Accueil */}
        {activeSection === 'accueil' && (
          <div className="space-y-6">
            <BudgetSummary
              budget={budget}
              cheques={cheques}
              isAdmin={isAdmin}
              onBudgetUpdated={(b) => setBudget(b)}
            />

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Derniers Chèques Enregistrés</h2>
                  <p className="text-xs text-slate-500">Aperçu rapide des opérations récentes</p>
                </div>
                <button
                  onClick={() => setActiveSection('cheques')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Voir tous les chèques →
                </button>
              </div>

              <ChequeList
                cheques={cheques.slice(0, 5)}
                fournisseurs={fournisseurs}
                isAdmin={isAdmin}
                onChequeUpdated={(updated) => {
                  setCheques(prev => prev.map(c => c.id === updated.id ? updated : c));
                  loadAllData();
                }}
                onChequeDeleted={(id) => {
                  setCheques(prev => prev.filter(c => c.id !== id));
                  loadAllData();
                }}
                onOpenNewModal={() => setShowChequeModal(true)}
              />
            </div>
          </div>
        )}

        {/* Section: Chèques */}
        {activeSection === 'cheques' && (
          <div className="space-y-6">
            <ChequeList
              cheques={cheques}
              fournisseurs={fournisseurs}
              isAdmin={isAdmin}
              onChequeUpdated={(updated) => {
                setCheques(prev => prev.map(c => c.id === updated.id ? updated : c));
                loadAllData();
              }}
              onChequeDeleted={(id) => {
                setCheques(prev => prev.filter(c => c.id !== id));
                loadAllData();
              }}
              onOpenNewModal={() => setShowChequeModal(true)}
            />
          </div>
        )}

        {/* Section: Fournisseurs */}
        {activeSection === 'fournisseurs' && (
          <FournisseursView
            fournisseurs={fournisseurs}
            cheques={cheques}
            isAdmin={isAdmin}
            onFournisseurAdded={(f) => setFournisseurs(prev => [...prev, f])}
          />
        )}

        {/* Section: Statistiques */}
        {activeSection === 'statistiques' && (
          <StatistiquesView
            cheques={cheques}
            fournisseurs={fournisseurs}
            budget={budget}
          />
        )}

        {/* Section: Rapport */}
        {activeSection === 'rapport' && (
          <RapportView
            cheques={cheques}
            fournisseurs={fournisseurs}
            budget={budget}
            user={currentUser}
          />
        )}

        {/* Section: Sauvegarde & Import */}
        {activeSection === 'sauvegarde' && (
          <BackupImportView
            user={currentUser}
            cheques={cheques}
            fournisseurs={fournisseurs}
            budget={budget}
            onDataChanged={loadAllData}
          />
        )}

        {/* Section: Administration & Paramètres */}
        {activeSection === 'parametres' && isAdmin && (
          <AdminUsersView currentUser={currentUser} />
        )}
      </main>

      {/* Modal for adding a new cheque */}
      <ChequeModal
        fournisseurs={fournisseurs}
        isOpen={showChequeModal}
        onClose={() => setShowChequeModal(false)}
        onSuccess={(newCheque) => {
          setCheques(prev => [newCheque, ...prev]);
          loadAllData();
        }}
      />

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
      />
    </div>
  );
}
