import React, { useState } from 'react';
import { Fournisseur, Cheque } from '../types';
import { createCheque } from '../api';
import { X, Upload, Check } from 'lucide-react';

interface ChequeModalProps {
  fournisseurs: Fournisseur[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cheque: Cheque) => void;
}

export const ChequeModal: React.FC<ChequeModalProps> = ({
  fournisseurs,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [numero, setNumero] = useState('');
  const [fournisseurId, setFournisseurId] = useState(fournisseurs[0]?.id ? String(fournisseurs[0].id) : '');
  const [montant, setMontant] = useState('');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [bonLivraison, setBonLivraison] = useState('');
  const [totalBon, setTotalBon] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero || !fournisseurId || !montant || !datePaiement) {
      setError('Veuillez remplir les champs obligatoires');
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('numero', numero);
    formData.append('fournisseurId', fournisseurId);
    formData.append('montant', montant);
    formData.append('datePaiement', datePaiement);
    formData.append('bonLivraison', bonLivraison);
    formData.append('totalBon', totalBon || montant);
    if (photo) {
      formData.append('photo', photo);
    }

    try {
      const res = await createCheque(formData);
      if (res.success && res.cheque) {
        onSuccess(res.cheque);
        onClose();
      } else {
        setError('Erreur lors de la création du chèque');
      }
    } catch (err) {
      setError('Erreur de communication avec le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="chequeModalOverlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Enregistrer un Nouveau Chèque</h2>
            <p className="text-xs text-slate-500">Ajoutez une opération financière avec justificatif</p>
          </div>
          <button
            id="closeChequeModalBtn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Numéro du chèque *
              </label>
              <input
                id="modalChequeNumero"
                type="text"
                placeholder="Ex: CH-2026-004"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Fournisseur *
              </label>
              <select
                id="modalChequeFournisseur"
                value={fournisseurId}
                onChange={(e) => setFournisseurId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Sélectionner un fournisseur</option>
                {fournisseurs.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Montant (DH) *
              </label>
              <input
                id="modalChequeMontant"
                type="number"
                step="0.01"
                placeholder="Ex: 5400"
                value={montant}
                onChange={(e) => {
                  setMontant(e.target.value);
                  if (!totalBon) setTotalBon(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Date d'échéance *
              </label>
              <input
                id="modalChequeDate"
                type="date"
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                N° Bon de Livraison (BL)
              </label>
              <input
                id="modalChequeBL"
                type="text"
                placeholder="Ex: BL-9402"
                value={bonLivraison}
                onChange={(e) => setBonLivraison(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Total Bon (DH)
              </label>
              <input
                id="modalChequeTotalBon"
                type="number"
                step="0.01"
                placeholder="Identique au montant"
                value={totalBon}
                onChange={(e) => setTotalBon(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Photo du Chèque ou Bon de Livraison
            </label>
            <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-600">
                {photo ? photo.name : 'Cliquez pour téléverser ou glissez un fichier'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, PDF jusqu\'à 10 Mo</span>
              <input
                id="modalChequePhotoInput"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPhoto(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition"
            >
              Annuler
            </button>
            <button
              id="submitChequeBtn"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-blue-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Enregistrement...' : 'Enregistrer le Chèque'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
