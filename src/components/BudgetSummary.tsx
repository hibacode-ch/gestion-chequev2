import React, { useState } from 'react';
import { Budget, Cheque } from '../types';
import { Wallet, AlertTriangle, CheckCircle, Clock, XCircle, Settings, Check } from 'lucide-react';
import { updateBudgetCap } from '../api';

interface BudgetSummaryProps {
  budget: Budget | null;
  cheques: Cheque[];
  isAdmin: boolean;
  onBudgetUpdated: (b: Budget) => void;
}

export const BudgetSummary: React.FC<BudgetSummaryProps> = ({
  budget,
  cheques,
  isAdmin,
  onBudgetUpdated
}) => {
  const [editingCap, setEditingCap] = useState(false);
  const [newCapValue, setNewCapValue] = useState('');
  const [loading, setLoading] = useState(false);

  const spent = budget?.spent || 0;
  const maxAmount = budget?.maxAmount || 40000;
  const reste = budget?.reste !== undefined ? budget.reste : (maxAmount - spent);
  const percentage = maxAmount > 0 ? Math.round((spent / maxAmount) * 100) : 0;

  const totalPaye = cheques.filter(c => c.statut === 'paye').reduce((s, c) => s + c.montant, 0);
  const totalEnAttente = cheques.filter(c => c.statut === 'en_attente').reduce((s, c) => s + c.montant, 0);
  const totalImpaye = cheques.filter(c => c.statut === 'impaye').reduce((s, c) => s + c.montant, 0);

  const handleSaveCap = async () => {
    const val = parseFloat(newCapValue);
    if (isNaN(val) || val <= 0 || !budget) return;
    setLoading(true);
    try {
      const updated = await updateBudgetCap(budget.month, budget.year, val);
      onBudgetUpdated(updated);
      setEditingCap(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (percentage >= 100) return 'bg-rose-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBg = () => {
    if (percentage >= 100) return 'bg-rose-50 border-rose-200 text-rose-800';
    if (percentage >= 80) return 'bg-amber-50 border-amber-200 text-amber-800';
    return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  };

  return (
    <div className="space-y-6">
      {/* Primary Budget Card */}
      <div id="budgetCard" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Budget Mensuel en Cours</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBg()}`}>
                  {percentage}% engagé
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Période {budget?.month ? `${budget.month}/${budget.year}` : 'actuelle'}
              </p>
            </div>
          </div>

          {/* Admin budget cap controls */}
          <div className="flex items-center gap-2">
            {editingCap ? (
              <div className="flex items-center gap-2">
                <input
                  id="budgetCapInput"
                  type="number"
                  defaultValue={maxAmount}
                  onChange={(e) => setNewCapValue(e.target.value)}
                  className="w-32 px-3 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nouveau plafond"
                />
                <button
                  id="saveBudgetCapBtn"
                  onClick={handleSaveCap}
                  disabled={loading}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  title="Enregistrer"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingCap(false)}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                >
                  Annuler
                </button>
              </div>
            ) : (
              isAdmin && (
                <button
                  id="editBudgetCapBtn"
                  onClick={() => {
                    setNewCapValue(String(maxAmount));
                    setEditingCap(true);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Modifier le plafond
                </button>
              )
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getStatusColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        {/* Figures summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Plafond Maximum</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {maxAmount.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-400">DH</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Total Engagé</span>
            <div className="text-xl font-bold text-blue-600 mt-0.5">
              {spent.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-blue-400">DH</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">Reste Disponible</span>
            <div className={`text-xl font-bold mt-0.5 ${reste < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {reste.toLocaleString('fr-FR')} <span className="text-xs font-semibold opacity-75">DH</span>
            </div>
          </div>
        </div>

        {percentage >= 100 && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Attention: Le budget de dépenses mensuel fixé a été dépassé. Vérifiez vos prochains décaissements.</span>
          </div>
        )}
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Chèques</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
              {cheques.length}
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {spent.toLocaleString('fr-FR')} <span className="text-xs font-medium text-slate-400">DH</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Tous statuts confondus</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chèques Payés</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {totalPaye.toLocaleString('fr-FR')} <span className="text-xs font-medium text-emerald-400">DH</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {cheques.filter(c => c.statut === 'paye').length} chèque(s) réglé(s)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">En Attente</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {totalEnAttente.toLocaleString('fr-FR')} <span className="text-xs font-medium text-amber-400">DH</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {cheques.filter(c => c.statut === 'en_attente').length} chèque(s) à décaisser
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Impayés / Rejetés</span>
            <XCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {totalImpaye.toLocaleString('fr-FR')} <span className="text-xs font-medium text-rose-400">DH</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {cheques.filter(c => c.statut === 'impaye').length} chèque(s) en incident
          </p>
        </div>
      </div>
    </div>
  );
};
