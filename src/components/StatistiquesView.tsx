import React from 'react';
import { Cheque, Fournisseur, Budget } from '../types';
import { PieChart, TrendingUp, DollarSign, Award } from 'lucide-react';

interface StatistiquesViewProps {
  cheques: Cheque[];
  fournisseurs: Fournisseur[];
  budget: Budget | null;
}

export const StatistiquesView: React.FC<StatistiquesViewProps> = ({
  cheques,
  fournisseurs,
  budget
}) => {
  const totalAmount = cheques.reduce((s, c) => s + c.montant, 0);
  const paidAmount = cheques.filter(c => c.statut === 'paye').reduce((s, c) => s + c.montant, 0);
  const pendingAmount = cheques.filter(c => c.statut === 'en_attente').reduce((s, c) => s + c.montant, 0);
  const unpaidAmount = cheques.filter(c => c.statut === 'impaye').reduce((s, c) => s + c.montant, 0);

  const paidRatio = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const pendingRatio = totalAmount > 0 ? Math.round((pendingAmount / totalAmount) * 100) : 0;
  const unpaidRatio = totalAmount > 0 ? Math.round((unpaidAmount / totalAmount) * 100) : 0;

  // Group by supplier
  const supplierStats = fournisseurs.map(f => {
    const list = cheques.filter(c => c.fournisseurId === f.id);
    const sum = list.reduce((acc, c) => acc + c.montant, 0);
    return {
      id: f.id,
      name: f.nom,
      count: list.length,
      amount: sum,
      ratio: totalAmount > 0 ? Math.round((sum / totalAmount) * 100) : 0
    };
  }).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* Visual Status Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Répartition Financière par Statut</h2>
        </div>

        {/* Stacked ratio bar */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex mb-4">
          <div style={{ width: `${paidRatio}%` }} className="bg-emerald-500 h-full" title={`Payé: ${paidRatio}%`} />
          <div style={{ width: `${pendingRatio}%` }} className="bg-amber-500 h-full" title={`En attente: ${pendingRatio}%`} />
          <div style={{ width: `${unpaidRatio}%` }} className="bg-rose-500 h-full" title={`Impayé: ${unpaidRatio}%`} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
            <div className="flex items-center justify-between font-semibold text-emerald-800 mb-1">
              <span>Payé ({paidRatio}%)</span>
              <span>{cheques.filter(c => c.statut === 'paye').length} chèque(s)</span>
            </div>
            <div className="text-lg font-bold text-emerald-700">
              {paidAmount.toLocaleString('fr-FR')} <span className="text-xs font-normal">DH</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
            <div className="flex items-center justify-between font-semibold text-amber-800 mb-1">
              <span>En Attente ({pendingRatio}%)</span>
              <span>{cheques.filter(c => c.statut === 'en_attente').length} chèque(s)</span>
            </div>
            <div className="text-lg font-bold text-amber-700">
              {pendingAmount.toLocaleString('fr-FR')} <span className="text-xs font-normal">DH</span>
            </div>
          </div>

          <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
            <div className="flex items-center justify-between font-semibold text-rose-800 mb-1">
              <span>Impayé ({unpaidRatio}%)</span>
              <span>{cheques.filter(c => c.statut === 'impaye').length} chèque(s)</span>
            </div>
            <div className="text-lg font-bold text-rose-700">
              {unpaidAmount.toLocaleString('fr-FR')} <span className="text-xs font-normal">DH</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Supplier */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Volume des Dépenses par Fournisseur</h2>
        </div>

        <div className="space-y-4">
          {supplierStats.map((s, idx) => (
            <div key={s.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span>{s.name}</span>
                  <span className="text-slate-400 font-normal">({s.count} chèque{s.count > 1 ? 's' : ''})</span>
                </div>
                <div className="font-bold text-slate-900">
                  {s.amount.toLocaleString('fr-FR')} DH <span className="text-slate-400 font-normal">({s.ratio}%)</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(s.ratio, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
