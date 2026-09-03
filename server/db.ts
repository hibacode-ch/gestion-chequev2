import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  Firestore
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Cheque, Fournisseur, Budget, AuditLogItem, NotificationItem } from '../src/types';

let app: FirebaseApp;
let db: Firestore;

function getDb(): Firestore {
  if (!db) {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    app = initializeApp(config);
    db = getFirestore(app, config.firestoreDatabaseId);
  }
  return db;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function checkPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// In-memory fallback cache so queries are lightning fast while keeping Firestore 100% in sync
let usersCache: User[] = [];
let chequesCache: Cheque[] = [];
let fournisseursCache: Fournisseur[] = [];
let budgetsCache: Budget[] = [];
let auditLogCache: AuditLogItem[] = [];
let notificationsCache: NotificationItem[] = [];
let initialized = false;

export async function initFirebaseDatabase() {
  if (initialized) return;
  const firestore = getDb();

  try {
    // 1. Users
    const usersSnap = await getDocs(collection(firestore, 'users'));
    if (usersSnap.empty) {
      console.log('⚡ Initialisation des utilisateurs dans Firestore...');
      const defaultUsers: User[] = [
        {
          id: 1,
          username: 'gerant3',
          password: await hashPassword('hiba1122.33'),
          role: 'admin',
          name: 'المديرة (Hiba)',
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          username: 'gerant1',
          password: await hashPassword('brahim1122.33'),
          role: 'gerant',
          name: 'المسير 1 (Brahim)',
          createdAt: new Date().toISOString()
        },
        {
          id: 3,
          username: 'gerant2',
          password: await hashPassword('anas1122.33'),
          role: 'gerant',
          name: 'المسير 2 (Anas)',
          createdAt: new Date().toISOString()
        }
      ];
      for (const u of defaultUsers) {
        await setDoc(doc(firestore, 'users', String(u.id)), u);
      }
      usersCache = defaultUsers;
    } else {
      usersCache = usersSnap.docs.map(d => d.data() as User);
    }

    // 2. Fournisseurs
    const fourSnap = await getDocs(collection(firestore, 'fournisseurs'));
    if (fourSnap.empty) {
      console.log('⚡ Initialisation des fournisseurs dans Firestore...');
      const defaultFournisseurs: Fournisseur[] = [
        { id: 101, nom: 'Société Atlas Viandes', telephone: '0522112233', adresse: 'Marché de Gros, Casablanca', createdAt: new Date().toISOString() },
        { id: 102, nom: 'Marché Maraîcher & Légumes', telephone: '0524445566', adresse: 'Zone Industrielle, Marrakech', createdAt: new Date().toISOString() },
        { id: 103, nom: 'Centrale Épices & Huiles', telephone: '0537778899', adresse: 'Avenue Hassan II, Rabat', createdAt: new Date().toISOString() },
        { id: 104, nom: 'Emballages du Sud', telephone: '0528889900', adresse: 'Zone Portuaire, Agadir', createdAt: new Date().toISOString() }
      ];
      for (const f of defaultFournisseurs) {
        await setDoc(doc(firestore, 'fournisseurs', String(f.id)), f);
      }
      fournisseursCache = defaultFournisseurs;
    } else {
      fournisseursCache = fourSnap.docs.map(d => d.data() as Fournisseur);
    }

    // 3. Budgets
    const budgetSnap = await getDocs(collection(firestore, 'budgets'));
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (budgetSnap.empty) {
      console.log('⚡ Initialisation du budget mensuel dans Firestore...');
      const defaultBudget: Budget = {
        month: currentMonth,
        year: currentYear,
        maxAmount: 40000,
        spent: 0
      };
      await setDoc(doc(firestore, 'budgets', `${currentYear}-${currentMonth}`), defaultBudget);
      budgetsCache = [defaultBudget];
    } else {
      budgetsCache = budgetSnap.docs.map(d => d.data() as Budget);
    }

    // 4. Cheques
    const chequesSnap = await getDocs(collection(firestore, 'cheques'));
    if (chequesSnap.empty) {
      console.log('⚡ Initialisation des chèques exemples dans Firestore...');
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const prevWeek = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const sampleCheques: Cheque[] = [
        {
          id: 1001,
          numero: 'CH-2026-001',
          fournisseurId: 101,
          montant: 8500,
          datePaiement: prevWeek,
          datePaiementReel: prevWeek,
          bonLivraison: 'BL-8841',
          totalBon: 8500,
          photo: null,
          statut: 'paye',
          addedBy: 1,
          addedByName: 'المديرة (Hiba)',
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 1002,
          numero: 'CH-2026-002',
          fournisseurId: 102,
          montant: 4200,
          datePaiement: today,
          datePaiementReel: null,
          bonLivraison: 'BL-9102',
          totalBon: 4200,
          photo: null,
          statut: 'en_attente',
          addedBy: 2,
          addedByName: 'المسير 1 (Brahim)',
          createdAt: new Date().toISOString()
        },
        {
          id: 1003,
          numero: 'CH-2026-003',
          fournisseurId: 103,
          montant: 6300,
          datePaiement: nextWeek,
          datePaiementReel: null,
          bonLivraison: 'BL-9215',
          totalBon: 6300,
          photo: null,
          statut: 'en_attente',
          addedBy: 3,
          addedByName: 'المسير 2 (Anas)',
          createdAt: new Date().toISOString()
        }
      ];

      for (const c of sampleCheques) {
        await setDoc(doc(firestore, 'cheques', String(c.id)), c);
      }
      chequesCache = sampleCheques;

      // Recalculate budget spent
      recalculateBudgets();
    } else {
      chequesCache = chequesSnap.docs.map(d => d.data() as Cheque);
      recalculateBudgets();
    }

    // 5. Notifications
    const notifSnap = await getDocs(collection(firestore, 'notifications'));
    if (notifSnap.empty) {
      const initialNotif: NotificationItem = {
        id: Date.now(),
        type: 'info',
        message: 'Base de données Firestore connectée et active pour Chez Sahraoui.',
        date: new Date().toISOString(),
        urgent: false
      };
      await setDoc(doc(firestore, 'notifications', String(initialNotif.id)), initialNotif);
      notificationsCache = [initialNotif];
    } else {
      notificationsCache = notifSnap.docs.map(d => d.data() as NotificationItem);
    }

    // 6. Audit Log
    const auditSnap = await getDocs(collection(firestore, 'auditLog'));
    if (!auditSnap.empty) {
      auditLogCache = auditSnap.docs.map(d => d.data() as AuditLogItem);
    }

    initialized = true;
    console.log('✅ Base de données Firebase Firestore synchronisée avec succès !');
  } catch (err) {
    console.error('Erreur initialisation Firestore:', err);
  }
}

function recalculateBudgets() {
  const map = new Map<string, number>();
  for (const c of chequesCache) {
    const targetDate = c.statut === 'paye' && c.datePaiementReel ? new Date(c.datePaiementReel) : new Date(c.datePaiement);
    const m = targetDate.getMonth() + 1;
    const y = targetDate.getFullYear();
    const key = `${y}-${m}`;
    map.set(key, (map.get(key) || 0) + c.montant);
  }

  for (const b of budgetsCache) {
    const key = `${b.year}-${b.month}`;
    b.spent = map.get(key) || 0;
  }
}

// User methods
export function getAllUsers(): User[] {
  return [...usersCache];
}

export function findUserByUsername(username: string): User | undefined {
  return usersCache.find(u => u.username === username);
}

export async function addUserToDb(user: User): Promise<User> {
  usersCache.push(user);
  const firestore = getDb();
  await setDoc(doc(firestore, 'users', String(user.id)), user);
  return user;
}

export async function updateUserInDb(id: number, updates: Partial<User>): Promise<User | null> {
  const idx = usersCache.findIndex(u => u.id === id);
  if (idx === -1) return null;
  const updated = { ...usersCache[idx], ...updates };
  usersCache[idx] = updated;
  const firestore = getDb();
  await setDoc(doc(firestore, 'users', String(id)), updated);
  return updated;
}

export async function deleteUserFromDb(id: number): Promise<boolean> {
  const idx = usersCache.findIndex(u => u.id === id);
  if (idx === -1) return false;
  usersCache.splice(idx, 1);
  const firestore = getDb();
  await deleteDoc(doc(firestore, 'users', String(id)));
  return true;
}

// Cheques methods
export function getAllCheques(): Cheque[] {
  return chequesCache.map(c => ({
    ...c,
    fournisseur: fournisseursCache.find(f => f.id === c.fournisseurId)
  }));
}

export async function addChequeToDb(cheque: Cheque): Promise<Cheque> {
  chequesCache.push(cheque);
  recalculateBudgets();
  const firestore = getDb();
  await setDoc(doc(firestore, 'cheques', String(cheque.id)), cheque);
  return cheque;
}

export async function updateChequeStatusInDb(id: number, statut: Cheque['statut'], datePaiementReel?: string | null): Promise<Cheque | null> {
  const cheque = chequesCache.find(c => c.id === id);
  if (!cheque) return null;
  cheque.statut = statut;
  if (statut === 'paye') {
    cheque.datePaiementReel = datePaiementReel || new Date().toISOString().split('T')[0];
  }
  recalculateBudgets();
  const firestore = getDb();
  await setDoc(doc(firestore, 'cheques', String(id)), cheque);
  return cheque;
}

export async function deleteChequeFromDb(id: number): Promise<boolean> {
  const idx = chequesCache.findIndex(c => c.id === id);
  if (idx === -1) return false;
  chequesCache.splice(idx, 1);
  recalculateBudgets();
  const firestore = getDb();
  await deleteDoc(doc(firestore, 'cheques', String(id)));
  return true;
}

// Fournisseurs methods
export function getAllFournisseurs(): Fournisseur[] {
  return [...fournisseursCache];
}

export async function addFournisseurToDb(fournisseur: Fournisseur): Promise<Fournisseur> {
  fournisseursCache.push(fournisseur);
  const firestore = getDb();
  await setDoc(doc(firestore, 'fournisseurs', String(fournisseur.id)), fournisseur);
  return fournisseur;
}

// Budget methods
export function getBudgetForMonth(month: number, year: number): Budget {
  let b = budgetsCache.find(x => x.month === month && x.year === year);
  if (!b) {
    b = { month, year, maxAmount: 40000, spent: 0 };
    budgetsCache.push(b);
  }
  const reste = b.maxAmount - b.spent;
  const percentage = b.maxAmount > 0 ? (b.spent / b.maxAmount) * 100 : 0;
  let status: 'green' | 'yellow' | 'red' = 'green';
  if (percentage >= 100) status = 'red';
  else if (percentage >= 80) status = 'yellow';
  return { ...b, reste, percentage, status };
}

export async function updateBudgetCapInDb(month: number, year: number, maxAmount: number): Promise<Budget> {
  let b = budgetsCache.find(x => x.month === month && x.year === year);
  if (!b) {
    b = { month, year, maxAmount, spent: 0 };
    budgetsCache.push(b);
  } else {
    b.maxAmount = maxAmount;
  }
  const firestore = getDb();
  await setDoc(doc(firestore, 'budgets', `${year}-${month}`), b);
  return getBudgetForMonth(month, year);
}

// Audit log methods
export function getAuditLogs(): AuditLogItem[] {
  return [...auditLogCache].reverse();
}

export async function logAuditAction(action: string, details: string, userId: number, username: string) {
  const entry: AuditLogItem = {
    id: Date.now(),
    action,
    details,
    userId,
    username,
    date: new Date().toISOString()
  };
  auditLogCache.push(entry);
  try {
    const firestore = getDb();
    await setDoc(doc(firestore, 'auditLog', String(entry.id)), entry);
  } catch (err) {
    console.error('Erreur audit log Firestore:', err);
  }
}

// Notifications methods
export function getNotifications(): NotificationItem[] {
  return [...notificationsCache].reverse();
}

export async function addNotificationToDb(type: string, message: string, urgent: boolean = false) {
  const notif: NotificationItem = {
    id: Date.now(),
    type,
    message,
    date: new Date().toISOString(),
    urgent
  };
  notificationsCache.push(notif);
  try {
    const firestore = getDb();
    await setDoc(doc(firestore, 'notifications', String(notif.id)), notif);
  } catch (err) {
    console.error('Erreur notification Firestore:', err);
  }
}

// -------------------------------------------------------------
// BACKUP & IMPORT SYSTEM
// -------------------------------------------------------------
const backupsDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

export function getDatabaseBackupData(): any {
  return {
    version: '2.0',
    appName: 'Chez Sahraoui',
    exportedAt: new Date().toISOString(),
    stats: {
      totalCheques: chequesCache.length,
      totalFournisseurs: fournisseursCache.length,
      totalBudgets: budgetsCache.length,
      totalUsers: usersCache.length,
      totalSpent: chequesCache.reduce((sum, c) => sum + c.montant, 0)
    },
    data: {
      cheques: chequesCache,
      fournisseurs: fournisseursCache,
      budgets: budgetsCache,
      notifications: notificationsCache,
      auditLog: auditLogCache
    }
  };
}

export async function createInternalBackupFile(authorName: string): Promise<any> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-chez-sahraoui-${timestamp}.json`;
  const filePath = path.join(backupsDir, filename);

  const backupPayload = {
    ...getDatabaseBackupData(),
    createdBy: authorName
  };

  fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf8');
  const stat = fs.statSync(filePath);

  const backupMeta = {
    filename,
    createdAt: new Date().toISOString(),
    size: stat.size,
    totalCheques: chequesCache.length,
    totalFournisseurs: fournisseursCache.length,
    createdBy: authorName
  };

  try {
    const firestore = getDb();
    await setDoc(doc(firestore, 'backups', filename), backupMeta);
  } catch (err) {
    console.warn('Erreur enregistrement métadonnées backup dans Firestore:', err);
  }

  return backupMeta;
}

export async function listInternalBackups(): Promise<any[]> {
  const results: any[] = [];
  if (!fs.existsSync(backupsDir)) {
    return results;
  }

  const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const fullPath = path.join(backupsDir, file);
      const stat = fs.statSync(fullPath);
      let meta: any = {
        filename: file,
        createdAt: stat.mtime.toISOString(),
        size: stat.size,
        totalCheques: 0,
        totalFournisseurs: 0,
        createdBy: 'Système'
      };

      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.stats) {
        meta.totalCheques = parsed.stats.totalCheques || (parsed.data?.cheques?.length ?? 0);
        meta.totalFournisseurs = parsed.stats.totalFournisseurs || (parsed.data?.fournisseurs?.length ?? 0);
        if (parsed.createdBy) meta.createdBy = parsed.createdBy;
        if (parsed.exportedAt) meta.createdAt = parsed.exportedAt;
      }
      results.push(meta);
    } catch (e) {
      console.warn(`Erreur lecture backup ${file}:`, e);
    }
  }

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

export async function deleteInternalBackupFile(filename: string): Promise<boolean> {
  const safeFilename = path.basename(filename);
  const filePath = path.join(backupsDir, safeFilename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  try {
    const firestore = getDb();
    await deleteDoc(doc(firestore, 'backups', safeFilename));
  } catch (e) {}
  return true;
}

export async function restoreFromBackupData(backup: any, mode: 'replace' | 'merge' = 'replace'): Promise<{ success: boolean; restored: { cheques: number; fournisseurs: number; budgets: number } }> {
  const rawData = backup.data || backup;
  const newCheques: Cheque[] = Array.isArray(rawData.cheques) ? rawData.cheques : [];
  const newFournisseurs: Fournisseur[] = Array.isArray(rawData.fournisseurs) ? rawData.fournisseurs : [];
  const newBudgets: Budget[] = Array.isArray(rawData.budgets) ? rawData.budgets : [];

  const firestore = getDb();

  if (mode === 'replace') {
    // 1. Fournisseurs
    fournisseursCache = [...newFournisseurs];
    for (const f of fournisseursCache) {
      await setDoc(doc(firestore, 'fournisseurs', String(f.id)), f);
    }

    // 2. Cheques
    chequesCache = [...newCheques];
    for (const c of chequesCache) {
      await setDoc(doc(firestore, 'cheques', String(c.id)), c);
    }

    // 3. Budgets
    if (newBudgets.length > 0) {
      budgetsCache = [...newBudgets];
      for (const b of budgetsCache) {
        await setDoc(doc(firestore, 'budgets', `${b.year}-${b.month}`), b);
      }
    }
  } else {
    // Merge mode
    for (const f of newFournisseurs) {
      const exists = fournisseursCache.find(x => x.id === f.id || x.nom.toLowerCase() === f.nom.toLowerCase());
      if (!exists) {
        fournisseursCache.push(f);
        await setDoc(doc(firestore, 'fournisseurs', String(f.id)), f);
      }
    }

    for (const c of newCheques) {
      const exists = chequesCache.find(x => x.id === c.id || x.numero === c.numero);
      if (!exists) {
        chequesCache.push(c);
        await setDoc(doc(firestore, 'cheques', String(c.id)), c);
      }
    }
  }

  recalculateBudgets();

  return {
    success: true,
    restored: {
      cheques: chequesCache.length,
      fournisseurs: fournisseursCache.length,
      budgets: budgetsCache.length
    }
  };
}

export async function bulkImportCheques(
  items: any[],
  user: { id: number; name: string }
): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  const firestore = getDb();

  for (let idx = 0; idx < items.length; idx++) {
    const raw = items[idx];
    try {
      const numero = String(raw.numero || raw.Numero || raw['N° Chèque'] || raw['Numero Cheque'] || '').trim();
      if (!numero) {
        errors.push(`Ligne ${idx + 1}: Numéro de chèque manquant.`);
        continue;
      }

      // Check if numero already exists
      const existing = chequesCache.find(c => c.numero.toLowerCase() === numero.toLowerCase());
      if (existing) {
        errors.push(`Ligne ${idx + 1}: Chèque n° ${numero} déjà existant.`);
        continue;
      }

      // Supplier
      let fId: number = 0;
      const supplierName = String(raw.fournisseur || raw.Fournisseur || raw.fournisseurNom || '').trim();
      const rawFId = raw.fournisseurId || raw.FournisseurId;

      if (rawFId && !isNaN(parseInt(rawFId))) {
        fId = parseInt(rawFId);
      } else if (supplierName) {
        let match = fournisseursCache.find(f => f.nom.toLowerCase() === supplierName.toLowerCase());
        if (!match) {
          match = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            nom: supplierName,
            telephone: raw.telephone || raw.Telephone || '',
            adresse: raw.adresse || raw.Adresse || '',
            createdAt: new Date().toISOString()
          };
          fournisseursCache.push(match);
          await setDoc(doc(firestore, 'fournisseurs', String(match.id)), match);
        }
        fId = match.id;
      } else {
        fId = fournisseursCache[0]?.id || 101;
      }

      // Montant
      let montantRaw = String(raw.montant || raw.Montant || '0').replace(/[^0-9.,]/g, '').replace(',', '.');
      const montant = parseFloat(montantRaw);
      if (isNaN(montant) || montant <= 0) {
        errors.push(`Ligne ${idx + 1} (${numero}): Montant invalide.`);
        continue;
      }

      // Date Paiement
      let datePaiement = String(raw.datePaiement || raw.date || raw.Date || raw.Echeance || raw['Échéance'] || '').trim();
      if (datePaiement.includes('/')) {
        const parts = datePaiement.split('/');
        if (parts.length === 3) {
          // Assuming DD/MM/YYYY
          datePaiement = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      if (!datePaiement || isNaN(new Date(datePaiement).getTime())) {
        datePaiement = new Date().toISOString().split('T')[0];
      }

      // Status
      let statut: 'en_attente' | 'paye' | 'impaye' = 'en_attente';
      const rawStatut = String(raw.statut || raw.Statut || '').toLowerCase();
      if (rawStatut.includes('pay') || rawStatut === 'regle' || rawStatut === 'réglé') {
        statut = 'paye';
      } else if (rawStatut.includes('impay') || rawStatut.includes('rejet')) {
        statut = 'impaye';
      }

      const bonLivraison = String(raw.bonLivraison || raw.BL || raw['Bon de Livraison'] || '').trim();
      const totalBon = raw.totalBon ? parseFloat(raw.totalBon) : montant;

      const newCheque: Cheque = {
        id: Date.now() + idx,
        numero,
        fournisseurId: fId,
        montant,
        datePaiement,
        datePaiementReel: statut === 'paye' ? (raw.datePaiementReel || datePaiement) : null,
        bonLivraison,
        totalBon,
        photo: null,
        statut,
        addedBy: user.id,
        addedByName: user.name,
        createdAt: new Date().toISOString()
      };

      chequesCache.push(newCheque);
      await setDoc(doc(firestore, 'cheques', String(newCheque.id)), newCheque);
      imported++;
    } catch (err: any) {
      errors.push(`Ligne ${idx + 1}: ${err.message || 'Erreur imprévue'}`);
    }
  }

  recalculateBudgets();

  return {
    success: imported > 0,
    imported,
    errors
  };
}

export async function bulkImportFournisseurs(items: any[]): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  const firestore = getDb();

  for (let idx = 0; idx < items.length; idx++) {
    const raw = items[idx];
    try {
      const nom = String(raw.nom || raw.Nom || raw['Raison Sociale'] || '').trim();
      if (!nom) {
        errors.push(`Ligne ${idx + 1}: Nom fournisseur manquant.`);
        continue;
      }

      const existing = fournisseursCache.find(f => f.nom.toLowerCase() === nom.toLowerCase());
      if (existing) {
        // Update details if missing
        if (!existing.telephone && raw.telephone) existing.telephone = String(raw.telephone);
        if (!existing.adresse && raw.adresse) existing.adresse = String(raw.adresse);
        await setDoc(doc(firestore, 'fournisseurs', String(existing.id)), existing);
        imported++;
        continue;
      }

      const newF: Fournisseur = {
        id: Date.now() + idx,
        nom,
        telephone: String(raw.telephone || raw.Telephone || raw.Tel || raw['Tél'] || '').trim(),
        adresse: String(raw.adresse || raw.Adresse || raw.Ville || '').trim(),
        createdAt: new Date().toISOString()
      };

      fournisseursCache.push(newF);
      await setDoc(doc(firestore, 'fournisseurs', String(newF.id)), newF);
      imported++;
    } catch (err: any) {
      errors.push(`Ligne ${idx + 1}: ${err.message}`);
    }
  }

  return {
    success: imported > 0,
    imported,
    errors
  };
}
