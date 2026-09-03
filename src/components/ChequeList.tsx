import React, { useState } from 'react';
import { Cheque, Fournisseur } from '../types';
import { Search, Plus, CheckCircle, XCircle, Clock, Trash2, Eye, FileText, Image as ImageIcon, Download } from 'lucide-react';
import { updateChequeStatus, deleteCheque } from '../api';
import { exportChequesListPDF, exportChequeReceiptPDF } from '../utils/pdfExport';

interface ChequeListProps {
  cheques: Cheque[];
  fournisseurs: Fournisseur[];
  isAdmin: boolean;
  onChequeUpdated: (c: Cheque) => void;
  onChequeDeleted: (id: number) => void;
  onOpenNewModal: () => void;
}

export const ChequeList: React.FC<ChequeListProps> = ({
  cheques,
  fournisseurs,
  isAdmin,
  onChequeUpdated,
  onChequeDeleted,
  onOpenNewModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [payingChequeId, setPayingChequeId] = useState<number | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const filteredCheques = cheques.filter(c => {
    const f = fournisseurs.find(item => item.id === c.fournisseurId);
    const supplierName = f ? f.nom.toLowerCase() : '';
    const matchesSearch =
      c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bonLivraison.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplierName.includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.statut === statusFilter;
    const matchesSupplier = supplierFilter === 'all' || String(c.fournisseurId) === supplierFilter;

    return matchesSearch && matchesStatus && matchesSupplier;
  });

  const handleSetPaid = async (id: number) => {
    try {
      const res = await updateChequeStatus(id, 'paye', effectiveDate);
      if (res.success && res.cheque) {
        onChequeUpdated(res.cheque);
        setPayingChequeId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetUnpaid = async (id: number) => {
    try {
      const res = await updateChequeStatus(id, 'impaye');
      if (res.success && res.cheque) {
        onChequeUpdated(res.cheque);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous certain de vouloir supprimer ce chèque ?')) return;
    try {
      const res = await deleteCheque(id);
      if (res.success) {
        onChequeDeleted(id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportPDF = () => {
    let filterDesc = 'Tous les chèques';
    if (statusFilter !== 'all') {
      filterDesc = `Statut: ${statusFilter === 'paye' ? 'Payés' : statusFilter === 'impaye' ? 'Impayés' : 'En attente'}`;
    }
    if (supplierFilter !== 'all') {
      const f = fournisseurs.find(item => String(item.id) === supplierFilter);
      if (f) filterDesc += ` • Fournisseur: ${f.nom}`;
    }
    if (searchTerm) {
      filterDesc += ` • Recherche: "${searchTerm}"`;
    }
    exportChequesListPDF(filteredCheques, fournisseurs, filterDesc, 'Direction Chez Sahraoui');
  };

  const getStatusBadge = (cheque: Cheque) => {
    switch (cheque.statut) {
      case 'paye':
        return (
          <div className="inline-flex flex-col items-start">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              Payé
            </span>
            {cheque.datePaiementReel && (
              <span className="text-[10px] text-slate-400 mt-0.5 ml-1">
                Rég: {cheque.datePaiementReel}
              </span>
            )}
          </div>
        );
      case 'impaye':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Impayé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            En attente
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 w-full">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="searchChequesInput"
              type="text"
              placeholder="Rechercher par n°, BL, ou fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <select
            id="statusFilterSelect"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="en_attente">⏳ En attente</option>
            <option value="paye">✅ Payé</option>
            <option value="impaye">❌ Impayé</option>
          </select>

          <select
            id="supplierFilterSelect"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">Tous les fournisseurs</option>
            {fournisseurs.map(f => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            id="btnExportFilteredPdf"
            type="button"
            onClick={handleExportPDF}
            className="w-full md:w-auto px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 border border-slate-200"
            title="Exporter la liste filtrée au format PDF"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export PDF ({filteredCheques.length})</span>
          </button>

          <button
            id="btnNewCheque"
            onClick={onOpenNewModal}
            className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau chèque</span>
          </button>
        </div>
      </div>

      {/* Cheques Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">N° Chèque</th>
                <th className="py-3 px-4">Fournisseur</th>
                <th className="py-3 px-4">Montant (DH)</th>
                <th className="py-3 px-4">Échéance</th>
                <th className="py-3 px-4">Bon Livraison</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Justificatif</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Aucun chèque ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredCheques.map((cheque) => {
                  const f = fournisseurs.find(item => item.id === cheque.fournisseurId);
                  return (
                    <tr key={cheque.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {cheque.numero}
                        <div className="text-[10px] text-slate-400 font-normal">
                          Ajouté par: {cheque.addedByName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {f ? f.nom : `Fournisseur #${cheque.fournisseurId}`}
                        {f?.telephone && (
                          <div className="text-[10px] text-slate-400">{f.telephone}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {cheque.montant.toLocaleString('fr-FR')} <span className="text-[10px] font-medium text-slate-400">DH</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{cheque.datePaiement}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {cheque.bonLivraison ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                            <FileText className="w-3 h-3 text-slate-400" />
                            {cheque.bonLivraison}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(cheque)}
                      </td>

                      <td className="py-3.5 px-4">
                        {cheque.photo ? (
                          <button
                            type="button"
                            onClick={() => setSelectedPhoto(`/uploads/${cheque.photo}`)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 transition"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Voir photo</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[11px]">Sans pièce</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {cheque.statut !== 'paye' && (
                            <button
                              onClick={() => {
                                setPayingChequeId(cheque.id);
                                setEffectiveDate(new Date().toISOString().split('T')[0]);
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-[11px] border border-emerald-200 transition"
                              title="Marquer comme payé"
                            >
                              Payer
                            </button>
                          )}

                          {cheque.statut !== 'impaye' && (
                            <button
                              onClick={() => handleSetUnpaid(cheque.id)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-[11px] border border-rose-200 transition"
                              title="Signaler impayé"
                            >
                              Impayé
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => exportChequeReceiptPDF(cheque, f, 'Direction Chez Sahraoui')}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Télécharger le Bon de Décaissement PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(cheque.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition ml-1"
                              title="Supprimer ce chèque"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Setting Actual Payment Date */}
      {payingChequeId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Confirmer le Règlement</h3>
            <p className="text-xs text-slate-500 mb-4">
              Indiquez la date effective de décaissement de ce chèque :
            </p>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayingChequeId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleSetPaid(payingChequeId)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
              >
                Valider le paiement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div
          id="photoPreviewModal"
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-3xl max-h-[90vh] bg-white p-2 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img
              src={selectedPhoto}
              alt="Justificatif de chèque"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
            <div className="p-3 text-right">
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
