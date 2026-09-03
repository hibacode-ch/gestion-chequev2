import React, { useState } from 'react';
import { Fournisseur, Cheque } from '../types';
import { Plus, Phone, MapPin, Search, Building, Check, X } from 'lucide-react';
import { createFournisseur } from '../api';

interface FournisseursViewProps {
  fournisseurs: Fournisseur[];
  cheques: Cheque[];
  isAdmin: boolean;
  onFournisseurAdded: (f: Fournisseur) => void;
}

export const FournisseursView: React.FC<FournisseursViewProps> = ({
  fournisseurs,
  cheques,
  isAdmin,
  onFournisseurAdded
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = fournisseurs.filter(f =>
    f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.telephone.includes(searchTerm) ||
    f.adresse.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createFournisseur({ nom, telephone, adresse });
      if (res.success && res.fournisseur) {
        onFournisseurAdded(res.fournisseur);
        setNom('');
        setTelephone('');
        setAdresse('');
        setShowAddModal(false);
      } else {
        setError('Erreur lors de la création du fournisseur');
      }
    } catch (err) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="searchFournisseurInput"
            type="text"
            placeholder="Rechercher un fournisseur par nom, téléphone, adresse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {isAdmin && (
          <button
            id="btnNewFournisseur"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau fournisseur</span>
          </button>
        )}
      </div>

      {/* Fournisseurs Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((f) => {
          const supplierCheques = cheques.filter(c => c.fournisseurId === f.id);
          const totalAmount = supplierCheques.reduce((sum, c) => sum + c.montant, 0);
          const paidAmount = supplierCheques.filter(c => c.statut === 'paye').reduce((sum, c) => sum + c.montant, 0);

          return (
            <div key={f.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{f.nom}</h3>
                      <span className="text-[10px] text-slate-400">ID #{f.id}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                    {supplierCheques.length} chèque(s)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                  {f.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{f.telephone}</span>
                    </div>
                  )}
                  {f.adresse && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{f.adresse}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Total Émis</span>
                  <div className="font-bold text-slate-900 text-sm">
                    {totalAmount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-slate-400">DH</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Total Réglé</span>
                  <div className="font-bold text-emerald-600 text-sm">
                    {paidAmount.toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-emerald-400">DH</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Fournisseur Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Ajouter un Fournisseur</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-2 bg-rose-50 text-rose-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleAdd} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Raison Sociale / Nom *</label>
                <input
                  id="newFournisseurNom"
                  type="text"
                  placeholder="Ex: Société Atlas Distribution"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Téléphone</label>
                <input
                  id="newFournisseurTel"
                  type="text"
                  placeholder="Ex: 0522001122"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Adresse</label>
                <input
                  id="newFournisseurAdresse"
                  type="text"
                  placeholder="Ex: Marché Central, Casablanca"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Annuler
                </button>
                <button
                  id="submitNewFournisseurBtn"
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer le fournisseur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
