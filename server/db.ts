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
