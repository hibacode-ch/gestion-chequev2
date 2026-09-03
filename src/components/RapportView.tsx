import React from 'react';
import { Cheque, Fournisseur, Budget, User } from '../types';
import { Printer, Download, CheckCircle, Clock, XCircle, Shield, FileText } from 'lucide-react';
import { exportRapportPDF } from '../utils/pdfExport';

interface RapportViewProps {
  cheques: Cheque[];
  fournisseurs: Fournisseur[];
  budget: Budget | null;
  user?: User;
}

export const RapportView: React.FC<RapportViewProps> = ({
  cheques,
  fournisseurs,
  budget,
  user
}) => {
  const total = cheques.reduce((s, c) => s + c.montant, 0);
  const totalPaye = cheques.filter(c => c.statut === 'paye').reduce((s, c) => s + c.montant, 0);
  const totalEnAttente = cheques.filter(c => c.statut === 'en_attente').reduce((s, c) => s + c.montant, 0);
  const totalImpaye = cheques.filter(c => c.statut === 'impaye').reduce((s, c) => s + c.montant, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const stats = {
      totalGeneral: total,
      totalPaye,
      totalImpaye,
      totalEnAttente,
      nbCheques: cheques.length
    };
    const now = new Date();
    const periodStr = `${now.toLocaleDateString('fr-FR', { month: 'long' })} ${now.getFullYear()}`;
    exportRapportPDF(stats, cheques, fournisseurs, budget, periodStr, user?.name || 'Direction Chez Sahraoui');
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-base font-bold text-slate-900">Rapport Financier & Décaissements</h2>
          <p className="text-xs text-slate-500">Document certifié pour la comptabilité de Chez Sahraoui</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btnExportPdfReport"
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exporter en PDF</span>
          </button>
          <button
            id="btnPrintReport"
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
        <div className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Chez Sahraoui</h1>
              <p className="text-xs text-slate-500">Rapport d'État des Chèques & Dépenses</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Édité le {new Date().toLocaleDateString('fr-FR')}</div>
            <div className="font-semibold text-slate-700">Base Firestore Synchronisée</div>
          </div>
        </div>

        {/* Global Figures */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Émis</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{total.toLocaleString('fr-FR')} DH</div>
            <span className="text-[10px] text-slate-500">{cheques.length} chèques</span>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-[11px] text-emerald-600 font-semibold uppercase">Total Réglé</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">{totalPaye.toLocaleString('fr-FR')} DH</div>
            <span className="text-[10px] text-emerald-600">{cheques.filter(c => c.statut === 'paye').length} réglés</span>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <span className="text-[11px] text-amber-600 font-semibold uppercase">En Attente</span>
            <div className="text-xl font-bold text-amber-700 mt-1">{totalEnAttente.toLocaleString('fr-FR')} DH</div>
            <span className="text-[10px] text-amber-600">{cheques.filter(c => c.statut === 'en_attente').length} en attente</span>
          </div>

          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
            <span className="text-[11px] text-rose-600 font-semibold uppercase">Impayés</span>
            <div className="text-xl font-bold text-rose-700 mt-1">{totalImpaye.toLocaleString('fr-FR')} DH</div>
            <span className="text-[10px] text-rose-600">{cheques.filter(c => c.statut === 'impaye').length} rejets</span>
          </div>
        </div>

        {/* Detailed Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Détail Exhaustif des Écritures
          </h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Chèque N°</th>
                <th className="py-2.5 px-3">Fournisseur</th>
                <th className="py-2.5 px-3">Échéance</th>
                <th className="py-2.5 px-3">Date Rég.</th>
                <th className="py-2.5 px-3">Réf BL</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-3 text-right">Montant (DH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cheques.map((c) => {
                const f = fournisseurs.find(item => item.id === c.fournisseurId);
                return (
                  <tr key={c.id}>
                    <td className="py-2 px-3 font-semibold">{c.numero}</td>
                    <td className="py-2 px-3">{f?.nom || `ID #${c.fournisseurId}`}</td>
                    <td className="py-2 px-3">{c.datePaiement}</td>
                    <td className="py-2 px-3">{c.datePaiementReel || '—'}</td>
                    <td className="py-2 px-3 font-mono">{c.bonLivraison || '—'}</td>
                    <td className="py-2 px-3 capitalize">
                      {c.statut === 'paye' ? 'Payé' : c.statut === 'impaye' ? 'Impayé' : 'En attente'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      {c.montant.toLocaleString('fr-FR')} DH
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-8 border-t border-slate-200 flex justify-between text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">Signature Direction / Gérance :</p>
            <div className="h-14 border-b border-dashed border-slate-300 w-48 mt-2"></div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-700">Visa Comptable :</p>
            <div className="h-14 border-b border-dashed border-slate-300 w-48 mt-2 ml-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
