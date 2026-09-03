import React, { useState, useEffect, useRef } from 'react';
import { User, Cheque, Fournisseur, Budget, BackupInfo } from '../types';
import {
  fetchBackupList,
  createInternalSnapshot,
  deleteInternalSnapshot,
  restoreInternalSnapshot,
  uploadAndRestoreBackup,
  importChequesBulk,
  importFournisseursBulk,
  getBackupDownloadUrl
} from '../api';
import { exportRapportPDF, exportChequesListPDF } from '../utils/pdfExport';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  HardDrive,
  Clock,
  ShieldAlert,
  ArrowRight,
  FolderArchive,
  Info
} from 'lucide-react';

interface BackupImportViewProps {
  user: User;
  cheques: Cheque[];
  fournisseurs: Fournisseur[];
  budget: Budget | null;
  onDataChanged: () => void;
}

export const BackupImportView: React.FC<BackupImportViewProps> = ({
  user,
  cheques,
  fournisseurs,
  budget,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'import' | 'pdf'>('backup');
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Restore confirmation modal state
  const [confirmRestoreModal, setConfirmRestoreModal] = useState<{
    open: boolean;
    targetFilename?: string;
    targetFile?: File;
    mode: 'replace' | 'merge';
  }>({ open: false, mode: 'replace' });

  // Import Cheques state
  const [chequesPreview, setChequesPreview] = useState<any[]>([]);
  const [chequesErrors, setChequesErrors] = useState<string[]>([]);
  const chequesFileInputRef = useRef<HTMLInputElement>(null);

  // Import Fournisseurs state
  const [fournisseursPreview, setFournisseursPreview] = useState<any[]>([]);
  const [fournisseursErrors, setFournisseursErrors] = useState<string[]>([]);
  const fournisseursFileInputRef = useRef<HTMLInputElement>(null);

  // Backup Upload state
  const [uploadedBackupPreview, setUploadedBackupPreview] = useState<any | null>(null);
  const [uploadedBackupFile, setUploadedBackupFile] = useState<File | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadBackups = async () => {
    try {
      const list = await fetchBackupList();
      setBackups(list);
    } catch (e: any) {
      console.error('Erreur chargement sauvegardes:', e);
    }
  };

  const handleCreateSnapshot = async () => {
    setLoading(true);
    try {
      const res = await createInternalSnapshot();
      if (res.success) {
        showToast('success', `Sauvegarde interne créée avec succès: ${res.snapshot.filename}`);
        await loadBackups();
        onDataChanged();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de la création de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSnapshot = async (filename: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer la sauvegarde "${filename}" ?`)) return;
    setLoading(true);
    try {
      await deleteInternalSnapshot(filename);
      showToast('success', 'Sauvegarde supprimée avec succès');
      await loadBackups();
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const executeRestore = async () => {
    setLoading(true);
    try {
      if (confirmRestoreModal.targetFilename) {
        const res = await restoreInternalSnapshot(confirmRestoreModal.targetFilename, confirmRestoreModal.mode);
        showToast('success', `Base restaurée: ${res.restored.cheques} chèques et ${res.restored.fournisseurs} fournisseurs.`);
      } else if (confirmRestoreModal.targetFile) {
        const res = await uploadAndRestoreBackup(confirmRestoreModal.targetFile, confirmRestoreModal.mode);
        showToast('success', `Fichier externe restauré: ${res.restored.cheques} chèques restaurés.`);
        setUploadedBackupFile(null);
        setUploadedBackupPreview(null);
      }
      setConfirmRestoreModal({ open: false, mode: 'replace' });
      await loadBackups();
      onDataChanged();
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de la restauration');
    } finally {
      setLoading(false);
    }
  };

  // Helper: parse CSV lines safely
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    // Detect delimiter: comma or semicolon or tab
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes('\t')) delimiter = '\t';

    const headers = firstLine.split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());

    const result: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      result.push(obj);
    }
    return result;
  };

  // Parse Cheques File
  const handleChequesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let parsed: any[] = [];
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content);
          parsed = Array.isArray(json) ? json : (json.cheques || json.data?.cheques || []);
        } else {
          parsed = parseCSV(content);
        }

        if (parsed.length === 0) {
          showToast('error', 'Le fichier est vide ou format non reconnu');
          return;
        }

        const errors: string[] = [];
        const validated = parsed.map((row, idx) => {
          const num = row.numero || row.Numero || row['N° Chèque'] || row['Numero Cheque'];
          const montant = row.montant || row.Montant;
          if (!num) errors.push(`Ligne ${idx + 1}: Numéro manquant`);
          if (!montant || isNaN(parseFloat(String(montant).replace(',', '.')))) {
            errors.push(`Ligne ${idx + 1}: Montant invalide`);
          }
          return row;
        });

        setChequesPreview(validated);
        setChequesErrors(errors);
      } catch (err: any) {
        showToast('error', 'Erreur de lecture du fichier: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCommitChequesImport = async () => {
    if (chequesPreview.length === 0) return;
    setLoading(true);
    try {
      const res = await importChequesBulk(chequesPreview);
      if (res.success) {
        showToast('success', `${res.imported} chèque(s) importé(s) avec succès !`);
        setChequesPreview([]);
        setChequesErrors([]);
        if (chequesFileInputRef.current) chequesFileInputRef.current.value = '';
        onDataChanged();
      } else {
        showToast('error', `Échec d'import: ${res.errors.join(', ')}`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de l’import');
    } finally {
      setLoading(false);
    }
  };

  // Parse Fournisseurs File
  const handleFournisseursFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let parsed: any[] = [];
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content);
          parsed = Array.isArray(json) ? json : (json.fournisseurs || json.data?.fournisseurs || []);
        } else {
          parsed = parseCSV(content);
        }

        if (parsed.length === 0) {
          showToast('error', 'Le fichier ne contient aucun fournisseur');
          return;
        }

        setFournisseursPreview(parsed);
        setFournisseursErrors([]);
      } catch (err: any) {
        showToast('error', 'Erreur de lecture du fichier: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCommitFournisseursImport = async () => {
    if (fournisseursPreview.length === 0) return;
    setLoading(true);
    try {
      const res = await importFournisseursBulk(fournisseursPreview);
      if (res.success) {
        showToast('success', `${res.imported} fournisseur(s) importé(s) avec succès !`);
        setFournisseursPreview([]);
        setFournisseursErrors([]);
        if (fournisseursFileInputRef.current) fournisseursFileInputRef.current.value = '';
        onDataChanged();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erreur lors de l’import');
    } finally {
      setLoading(false);
    }
  };

  // Parse External JSON Backup file
  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.data && !parsed.cheques) {
          showToast('error', 'Format de fichier non reconnu comme une sauvegarde Chez Sahraoui.');
          return;
        }
        setUploadedBackupFile(file);
        setUploadedBackupPreview(parsed);
      } catch (err: any) {
        showToast('error', 'Fichier JSON invalide: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Templates download
  const downloadChequesTemplate = () => {
    const csvContent = 'Numero;Fournisseur;Montant;Echeance;BonLivraison;Statut\nCH-2026-100;Société Atlas Viandes;12500;2026-03-25;BL-8891;en_attente\nCH-2026-101;Marché Maraîcher & Légumes;6400;2026-03-28;BL-9902;paye\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Modele_Import_Cheques_Chez_Sahraoui.csv';
    link.click();
  };

  const downloadFournisseursTemplate = () => {
    const csvContent = 'Nom;Telephone;Adresse\nBoucherie Centrale Casablanca;0522334455;Marché de Gros Casablanca\nFournisseur Fruits & Primeurs;0528445566;Zone Industrielle Agadir\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Modele_Import_Fournisseurs_Chez_Sahraoui.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border shadow-xs transition ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Hero Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Centre Sauvegardes, Import & Export PDF</h1>
              <p className="text-xs text-slate-500">
                Sauvegardes internes Firestore, importateurs de fichiers (CSV/JSON) et exports officiels PDF
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'backup'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              Sauvegarde Interne
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'import'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              Importateur de Fichiers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pdf')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                activeTab === 'pdf'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Exports PDF
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SAUVEGARDE INTERNE */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Base de Données</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{cheques.length} Chèques</div>
                <div className="text-xs text-slate-500 mt-0.5">{fournisseurs.length} Fournisseurs répertoriés</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Snapshots Internes</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{backups.length} Sauvegardes</div>
                <div className="text-xs text-slate-500 mt-0.5">Stockage local & Firestore</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <HardDrive className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dernière Sauvegarde</span>
                <div className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[180px]">
                  {backups[0] ? new Date(backups[0].createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Aucune'}
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-0.5">Automatique & Manuelle</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Instant Action Bar */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Créer une Sauvegarde Immédiate</h2>
                <p className="text-xs text-blue-100 mt-1 max-w-xl">
                  Génère un snapshot complet de l'ensemble de votre base Firestore (chèques, fournisseurs, budgets, audit).
                  Vous pouvez restaurer cette sauvegarde à tout moment en cas d'erreur ou d'audit.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCreateSnapshot}
                  className="px-4 py-2.5 bg-white text-blue-800 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 grow sm:grow-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Sauvegarder Maintenant
                </button>

                <a
                  href={getBackupDownloadUrl()}
                  download
                  className="px-4 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs rounded-xl border border-blue-400/40 transition flex items-center justify-center gap-2 grow sm:grow-0"
                >
                  <Download className="w-4 h-4" />
                  Télécharger (.JSON)
                </a>
              </div>
            </div>
          </div>

          {/* Internal Snapshots Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Historique des Snapshots Internes</h3>
                <p className="text-xs text-slate-500">Sauvegardes archivées dans le système</p>
              </div>
              <button
                type="button"
                onClick={loadBackups}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualiser
              </button>
            </div>

            {backups.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FolderArchive className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Aucun snapshot interne enregistré pour le moment.</p>
                <p className="text-xs text-slate-400 mt-1">Cliquez sur « Sauvegarder Maintenant » pour générer votre premier point de restauration.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Fichier Sauvegarde</th>
                      <th className="px-5 py-3.5">Date & Heure</th>
                      <th className="px-5 py-3.5">Taille</th>
                      <th className="px-5 py-3.5">Contenu</th>
                      <th className="px-5 py-3.5">Auteur</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.map(b => (
                      <tr key={b.filename} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-4 font-mono font-medium text-slate-800 flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[220px]">{b.filename}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                          {new Date(b.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-mono">
                          {(b.size / 1024).toFixed(1)} Ko
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                            <span>{b.totalCheques} chèques</span>
                            <span>•</span>
                            <span>{b.totalFournisseurs} fournisseurs</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {b.createdBy || 'Système'}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {user.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => setConfirmRestoreModal({ open: true, targetFilename: b.filename, mode: 'replace' })}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-amber-200"
                                title="Restaurer cette sauvegarde"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Restaurer
                              </button>
                            )}

                            {user.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSnapshot(b.filename)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: IMPORTATEUR DE FICHIERS */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Importateur 1: Chèques */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Importer des Chèques</h3>
                      <p className="text-xs text-slate-500">Format CSV ou JSON</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadChequesTemplate}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50/70 hover:bg-blue-100/70 px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Modèle CSV
                  </button>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Importez vos chèques en masse avec détection automatique des fournisseurs, montants et dates d'échéance.
                  Colonnes acceptées: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">Numero</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">Fournisseur</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">Montant</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">Echeance</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700">BL</code>.
                </p>

                {/* Upload box */}
                <div
                  onClick={() => chequesFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl p-6 text-center cursor-pointer transition"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-700 block">Cliquez ou déposez votre fichier ici</span>
                  <span className="text-[11px] text-slate-400">Fichiers .csv ou .json supportés</span>
                  <input
                    ref={chequesFileInputRef}
                    type="file"
                    accept=".csv,.tsv,.json"
                    onChange={handleChequesFileChange}
                    className="hidden"
                  />
                </div>

                {/* Preview count */}
                {chequesPreview.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs flex items-center justify-between">
                    <span className="font-semibold text-blue-900">
                      📋 {chequesPreview.length} chèque(s) prêt(s) à être importé(s)
                    </span>
                    {chequesErrors.length > 0 && (
                      <span className="text-rose-600 font-bold">
                        ⚠️ {chequesErrors.length} avertissement(s)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {chequesPreview.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setChequesPreview([]);
                      if (chequesFileInputRef.current) chequesFileInputRef.current.value = '';
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleCommitChequesImport}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Valider l'import ({chequesPreview.length})
                  </button>
                </div>
              )}
            </div>

            {/* Importateur 2: Fournisseurs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Importer des Fournisseurs</h3>
                      <p className="text-xs text-slate-500">Carnet d'adresses & contacts</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadFournisseursTemplate}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50/70 hover:bg-emerald-100/70 px-2.5 py-1.5 rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Modèle CSV
                  </button>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Ajoutez rapidement tous vos partenaires commerciaux. Les fournisseurs existants seront mis à jour sans doublons.
                  Colonnes requises: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">Nom</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">Telephone</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">Adresse</code>.
                </p>

                {/* Upload box */}
                <div
                  onClick={() => fournisseursFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-6 text-center cursor-pointer transition"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-700 block">Cliquez ou déposez votre fichier de fournisseurs</span>
                  <span className="text-[11px] text-slate-400">Fichiers .csv ou .json</span>
                  <input
                    ref={fournisseursFileInputRef}
                    type="file"
                    accept=".csv,.tsv,.json"
                    onChange={handleFournisseursFileChange}
                    className="hidden"
                  />
                </div>

                {/* Preview count */}
                {fournisseursPreview.length > 0 && (
                  <div className="mt-4 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs flex items-center justify-between">
                    <span className="font-semibold text-emerald-900">
                      👥 {fournisseursPreview.length} fournisseur(s) détecté(s)
                    </span>
                  </div>
                )}
              </div>

              {fournisseursPreview.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFournisseursPreview([]);
                      if (fournisseursFileInputRef.current) fournisseursFileInputRef.current.value = '';
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleCommitFournisseursImport}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Valider l'import ({fournisseursPreview.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Importateur 3: Restauration Sauvegarde Complète Externe */}
          {user.role === 'admin' && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="grow">
                  <h3 className="font-bold text-amber-950 text-base">Restaurer depuis un fichier de sauvegarde (.JSON)</h3>
                  <p className="text-xs text-amber-800 mt-1 max-w-2xl">
                    Vous disposez d'un fichier de sauvegarde précédemment exporté ? Chargez-le ici pour restaurer l'intégralité
                    de vos données dans la base de données Firestore.
                  </p>

                  <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <button
                      type="button"
                      onClick={() => backupFileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Sélectionner le fichier de sauvegarde JSON
                    </button>
                    <input
                      ref={backupFileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleBackupFileUpload}
                      className="hidden"
                    />

                    {uploadedBackupFile && (
                      <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100/80 px-3 py-1.5 rounded-lg border border-amber-300">
                        {uploadedBackupFile.name} ({(uploadedBackupFile.size / 1024).toFixed(1)} Ko)
                      </span>
                    )}
                  </div>

                  {uploadedBackupPreview && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-amber-200 text-xs">
                      <div className="font-bold text-slate-900 mb-2">Aperçu du contenu de la sauvegarde :</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 mb-4">
                        <div>Chèques: <strong>{uploadedBackupPreview.data?.cheques?.length ?? uploadedBackupPreview.cheques?.length ?? 0}</strong></div>
                        <div>Fournisseurs: <strong>{uploadedBackupPreview.data?.fournisseurs?.length ?? uploadedBackupPreview.fournisseurs?.length ?? 0}</strong></div>
                        <div>Budgets: <strong>{uploadedBackupPreview.data?.budgets?.length ?? uploadedBackupPreview.budgets?.length ?? 0}</strong></div>
                        <div>Date d'export: <strong>{uploadedBackupPreview.exportedAt ? new Date(uploadedBackupPreview.exportedAt).toLocaleDateString() : '-'}</strong></div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreModal({ open: true, targetFile: uploadedBackupFile!, mode: 'replace' })}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition"
                        >
                          Remplacer toutes les données
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreModal({ open: true, targetFile: uploadedBackupFile!, mode: 'merge' })}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition"
                        >
                          Fusionner avec les données existantes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXPORTS PDF */}
      {activeTab === 'pdf' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Rapport Financier PDF */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Rapport Financier Complet</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Document officiel format A4 avec entête Chez Sahraoui, récapitulatif des montants (émis, payés, impayés, en attente),
                  tableau des chèques et encarts pour signatures Direction et Comptabilité.
                </p>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 space-y-1">
                  <div>• Volume total: <strong>{cheques.length} chèques</strong></div>
                  <div>• Montant global: <strong>{cheques.reduce((s, c) => s + c.montant, 0).toLocaleString()} DH</strong></div>
                  <div>• Inclus: Synthèse budgétaire mensuelle</div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const stats = {
                      totalGeneral: cheques.reduce((s, c) => s + c.montant, 0),
                      totalPaye: cheques.filter(c => c.statut === 'paye').reduce((s, c) => s + c.montant, 0),
                      totalImpaye: cheques.filter(c => c.statut === 'impaye').reduce((s, c) => s + c.montant, 0),
                      totalEnAttente: cheques.filter(c => c.statut === 'en_attente').reduce((s, c) => s + c.montant, 0),
                      nbCheques: cheques.length
                    };
                    const now = new Date();
                    const period = `${now.toLocaleString('fr-FR', { month: 'long' })} ${now.getFullYear()}`;
                    exportRapportPDF(stats, cheques, fournisseurs, budget, period, user.name);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Générer le Rapport Financier PDF
                </button>
              </div>
            </div>

            {/* Card 2: Liste des Chèques Filtrée PDF */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Relevé & Registre des Chèques</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Exportation sous forme de grand livre des chèques au format paysage avec numéros, bénéficiaires,
                  dates d'échéances et de règlement effectif, bons de livraison et statuts.
                </p>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 space-y-1">
                  <div>• Format: <strong>A4 Paysage (Landscape)</strong></div>
                  <div>• Données: Tous les chèques enregistrés</div>
                  <div>• Numérotation automatique des pages</div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => exportChequesListPDF(cheques, fournisseurs, 'Tous les chèques', user.name)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exporter tous les chèques ({cheques.length})
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const attente = cheques.filter(c => c.statut === 'en_attente');
                      exportChequesListPDF(attente, fournisseurs, 'Chèques en attente d’échéance', user.name);
                    }}
                    className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                  >
                    En Attente ({cheques.filter(c => c.statut === 'en_attente').length})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const payes = cheques.filter(c => c.statut === 'paye');
                      exportChequesListPDF(payes, fournisseurs, 'Chèques réglés / payés', user.name);
                    }}
                    className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                  >
                    Réglés ({cheques.filter(c => c.statut === 'paye').length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Restore */}
      {confirmRestoreModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Confirmation de Restauration</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Vous êtes sur le point de restaurer la base de données depuis{' '}
              <strong className="text-slate-900">{confirmRestoreModal.targetFilename || confirmRestoreModal.targetFile?.name}</strong>.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-2">Mode de restauration :</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={confirmRestoreModal.mode === 'replace'}
                    onChange={() => setConfirmRestoreModal(prev => ({ ...prev, mode: 'replace' }))}
                    className="text-blue-600"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">Remplacer complètement</span>
                    <span className="text-slate-500 text-[11px]">Écrase les données actuelles avec celles de la sauvegarde</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={confirmRestoreModal.mode === 'merge'}
                    onChange={() => setConfirmRestoreModal(prev => ({ ...prev, mode: 'merge' }))}
                    className="text-blue-600"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">Fusionner intelligemment</span>
                    <span className="text-slate-500 text-[11px]">Conserve les enregistrements existants et ajoute les nouveaux</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmRestoreModal({ open: false, mode: 'replace' })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={executeRestore}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Confirmer la Restauration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
