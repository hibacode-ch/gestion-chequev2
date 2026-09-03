import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import multer from 'multer';
import session from 'express-session';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  initFirebaseDatabase,
  checkPassword,
  hashPassword,
  getAllUsers,
  findUserByUsername,
  addUserToDb,
  updateUserInDb,
  deleteUserFromDb,
  getAllCheques,
  addChequeToDb,
  updateChequeStatusInDb,
  deleteChequeFromDb,
  getAllFournisseurs,
  addFournisseurToDb,
  getBudgetForMonth,
  updateBudgetCapInDb,
  getAuditLogs,
  logAuditAction,
  getNotifications,
  addNotificationToDb,
  getDatabaseBackupData,
  createInternalBackupFile,
  listInternalBackups,
  deleteInternalBackupFile,
  restoreFromBackupData,
  bulkImportCheques,
  bulkImportFournisseurs
} from './server/db';
import { User, Cheque, Fournisseur } from './src/types';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      name: string;
      role: 'admin' | 'gerant';
    };
  }
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    name: string;
    role: 'admin' | 'gerant';
  };
}

async function startServer() {
  // 1. Initialize Firestore DB
  console.log('🚀 Démarrage de Chez Sahraoui & Synchronisation Firebase Firestore...');
  await initFirebaseDatabase();

  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'chez-sahraoui-secret-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'none',
      secure: true
    }
  }) as any);

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
  });
  const upload = multer({ storage });

  function getCurrentUser(req: Request) {
    if (req.session && req.session.user) {
      return req.session.user;
    }
    const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
    if (authHeader && typeof authHeader === 'string') {
      try {
        const raw = authHeader.replace(/^Bearer\s+/i, '');
        const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        const u = getAllUsers().find(x => x.id === decoded.id && x.username === decoded.username);
        if (u) {
          return { id: u.id, username: u.username, name: u.name, role: u.role };
        }
      } catch (e) {}
    }
    return null;
  }

  function isAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const user = getCurrentUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: "Accès réservé à l'administrateur" });
    }
    req.user = user;
    if (req.session) req.session.user = user;
    next();
  }

  function isAuthenticated(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    req.user = user;
    if (req.session) req.session.user = user;
    next();
  }

  // API Routes (Mounted first)
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      app: 'Chez Sahraoui',
      database: 'Firebase Firestore',
      projectId: 'buoyant-tangent-g7dgj'
    });
  });

  // Auth routes
  app.post('/api/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user = findUserByUsername(username);
    if (user && user.password && await checkPassword(password, user.password)) {
      const sessionUser = { id: user.id, username: user.username, name: user.name, role: user.role };
      req.session.user = sessionUser;
      const token = Buffer.from(JSON.stringify({ id: user.id, username: user.username })).toString('base64');
      await logAuditAction('CONNEXION', `Utilisateur ${username} connecté`, user.id, username);
      res.json({ success: true, user: sessionUser, token });
    } else {
      res.status(401).json({ success: false, message: "Nom d'utilisateur ou mot de passe incorrect" });
    }
  });

  app.post('/api/logout', async (req: Request, res: Response) => {
    const user = getCurrentUser(req);
    if (user) {
      await logAuditAction('DÉCONNEXION', `Utilisateur ${user.username} déconnecté`, user.id, user.username);
    }
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/me', (req: Request, res: Response) => {
    const user = getCurrentUser(req);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false });
    }
  });

  // Cheques API
  app.get('/api/cheques', (req: Request, res: Response) => {
    const cheques = getAllCheques();
    res.json(cheques.slice().reverse());
  });

  app.post('/api/cheques', upload.single('photo') as any, isAuthenticated as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { numero, fournisseurId, montant, datePaiement, bonLivraison, totalBon } = req.body;
      const user = req.user!;
      const parsedMontant = parseFloat(montant) || 0;
      const parsedTotalBon = parseFloat(totalBon) || parsedMontant;

      const newCheque: Cheque = {
        id: Date.now(),
        numero,
        fournisseurId: parseInt(fournisseurId),
        montant: parsedMontant,
        datePaiement,
        bonLivraison: bonLivraison || '',
        totalBon: parsedTotalBon,
        photo: req.file ? req.file.filename : null,
        statut: 'en_attente',
        datePaiementReel: null,
        addedBy: user.id,
        addedByName: user.name,
        createdAt: new Date().toISOString()
      };

      await addChequeToDb(newCheque);
      await logAuditAction('AJOUT_CHÈQUE', `Chèque #${numero} ajouté (${parsedMontant} DH) - Échéance: ${datePaiement}`, user.id, user.username);

      // Check budget alerts
      const date = new Date(datePaiement);
      const budget = getBudgetForMonth(date.getMonth() + 1, date.getFullYear());
      if (budget && budget.spent > budget.maxAmount) {
        await addNotificationToDb('depassement', `⚠️ Budget dépassé! ${budget.spent} DH / ${budget.maxAmount} DH`, true);
      } else if (budget && budget.spent > budget.maxAmount * 0.8) {
        await addNotificationToDb('alerte', `⚡ Budget presque atteint! ${budget.spent} DH / ${budget.maxAmount} DH`, false);
      }

      res.json({ success: true, cheque: newCheque });
    } catch (err: any) {
      console.error('Erreur ajout chèque:', err);
      res.status(500).json({ error: 'Erreur lors de l\'ajout du chèque' });
    }
  });

  app.put('/api/cheques/:id/statut', isAuthenticated as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { statut, datePaiementReel } = req.body;
      const user = req.user!;
      const chequeId = parseInt(req.params.id);
      const updated = await updateChequeStatusInDb(chequeId, statut, datePaiementReel);

      if (!updated) {
        return res.status(404).json({ error: 'Chèque non trouvé' });
      }

      await logAuditAction(
        'MODIFICATION_STATUT',
        `Chèque #${updated.numero}: statut mis à jour vers "${statut}"${statut === 'paye' ? ` (Règlement effectif: ${updated.datePaiementReel})` : ''}`,
        user.id,
        user.username
      );

      await addNotificationToDb(
        'info',
        `📝 Chèque #${updated.numero} ${statut === 'paye' ? `payé (${updated.datePaiementReel})` : 'marqué impayé'} par ${user.name}`,
        false
      );

      res.json({ success: true, cheque: updated });
    } catch (err) {
      console.error('Erreur mise à jour chèque:', err);
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  });

  app.delete('/api/cheques/:id', isAdmin as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const chequeId = parseInt(req.params.id);
      const cheques = getAllCheques();
      const target = cheques.find(c => c.id === chequeId);
      if (!target) {
        return res.status(404).json({ error: 'Chèque non trouvé' });
      }

      await deleteChequeFromDb(chequeId);
      await logAuditAction('SUPPRESSION_CHÈQUE', `Chèque #${target.numero} supprimé (${target.montant} DH)`, user.id, user.username);
      await addNotificationToDb('info', `🗑️ Chèque #${target.numero} supprimé par ${user.name}`, false);

      res.json({ success: true });
    } catch (err) {
      console.error('Erreur suppression chèque:', err);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Fournisseurs API
  app.get('/api/fournisseurs', (req: Request, res: Response) => {
    res.json(getAllFournisseurs());
  });

  app.post('/api/fournisseurs', isAdmin as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { nom, telephone, adresse } = req.body;
      const newFournisseur: Fournisseur = {
        id: Date.now(),
        nom,
        telephone: telephone || '',
        adresse: adresse || '',
        createdAt: new Date().toISOString()
      };
      await addFournisseurToDb(newFournisseur);
      await logAuditAction('AJOUT_FOURNISSEUR', `Fournisseur ${nom} ajouté`, user.id, user.username);
      res.json({ success: true, fournisseur: newFournisseur });
    } catch (err) {
      console.error('Erreur ajout fournisseur:', err);
      res.status(500).json({ error: 'Erreur ajout fournisseur' });
    }
  });

  // Budget API
  app.get('/api/budget/:month/:year', (req: Request, res: Response) => {
    const { month, year } = req.params;
    const budget = getBudgetForMonth(parseInt(month), parseInt(year));
    res.json(budget);
  });

  app.put('/api/budget/:month/:year', isAdmin as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { maxAmount } = req.body;
      const { month, year } = req.params;
      const updated = await updateBudgetCapInDb(parseInt(month), parseInt(year), parseFloat(maxAmount));
      await logAuditAction('MODIFICATION_BUDGET', `Plafond budgétaire ${month}/${year} fixé à ${maxAmount} DH`, user.id, user.username);
      res.json({ success: true, budget: updated });
    } catch (err) {
      console.error('Erreur modif budget:', err);
      res.status(500).json({ error: 'Erreur mise à jour budget' });
    }
  });

  // Users Management API (Admin only)
  app.get('/api/users', isAdmin as any, (req: Request, res: Response) => {
    const users = getAllUsers().map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json(users);
  });

  app.post('/api/users', isAdmin as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userAdmin = req.user!;
      const { username, password, name, role } = req.body;
      if (findUserByUsername(username)) {
        return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé" });
      }
      const newUser: User = {
        id: Date.now(),
        username,
        password: await hashPassword(password),
        name,
        role,
        createdAt: new Date().toISOString()
      };
      await addUserToDb(newUser);
      await logAuditAction('AJOUT_UTILISATEUR', `Compte ${username} (${role}) créé`, userAdmin.id, userAdmin.username);
      res.json({ success: true, user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role } });
    } catch (err) {
      console.error('Erreur ajout utilisateur:', err);
      res.status(500).json({ error: 'Erreur création utilisateur' });
    }
  });

  app.put('/api/users/:id', isAdmin as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userAdmin = req.user!;
      const { username, password, name, role } = req.body;
      const id = parseInt(req.params.id);
      const updates: Partial<User> = {};
      if (username) updates.username = username;
      if (password) updates.password = await hashPassword(password);
      if (name) updates.name = name;
      if (role) updates.role = role;

      const updated = await updateUserInDb(id, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      await logAuditAction('MODIFICATION_UTILISATEUR', `Compte ${updated.username} modifié`, userAdmin.id, userAdmin.username);
      res.json({ success: true, user: { id: updated.id, username: updated.username, name: updated.name, role: updated.role } });
    } catch (err) {
      console.error('Erreur modification utilisateur:', err);
      res.status(500).json({ error: 'Erreur mise à jour utilisateur' });
    }
  });

  app.delete('/api/users/:id', isAdmin as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userAdmin = req.user!;
      const userId = parseInt(req.params.id);
      if (userId === userAdmin.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
      }
      const all = getAllUsers();
      const target = all.find(u => u.id === userId);
      if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' });

      await deleteUserFromDb(userId);
      await logAuditAction('SUPPRESSION_UTILISATEUR', `Compte ${target.username} supprimé`, userAdmin.id, userAdmin.username);
      res.json({ success: true });
    } catch (err) {
      console.error('Erreur suppression utilisateur:', err);
      res.status(500).json({ error: 'Erreur suppression utilisateur' });
    }
  });

  // Audit Log & Notifications API
  app.get('/api/audit-log', isAdmin as any, (req: Request, res: Response) => {
    res.json(getAuditLogs());
  });

  app.get('/api/notifications', (req: Request, res: Response) => {
    res.json(getNotifications());
  });

  // Financial Report API
  app.get('/api/rapport', (req: Request, res: Response) => {
    const cheques = getAllCheques();
    res.json({
      totalGeneral: cheques.reduce((sum, c) => sum + c.montant, 0),
      totalPaye: cheques.filter(c => c.statut === 'paye').reduce((sum, c) => sum + c.montant, 0),
      totalImpaye: cheques.filter(c => c.statut === 'impaye').reduce((sum, c) => sum + c.montant, 0),
      totalEnAttente: cheques.filter(c => c.statut === 'en_attente').reduce((sum, c) => sum + c.montant, 0),
      nbCheques: cheques.length
    });
  });

  // -------------------------------------------------------------------
  // Backup & Import Endpoints
  // -------------------------------------------------------------------
  // 1. Download database backup JSON
  app.get('/api/backup/download', isAuthenticated as any, (req: AuthenticatedRequest, res: Response) => {
    const backup = getDatabaseBackupData();
    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-chez-sahraoui-${dateStr}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  });

  // 2. Get backup data as JSON object
  app.get('/api/backup/data', isAuthenticated as any, (req: AuthenticatedRequest, res: Response) => {
    res.json(getDatabaseBackupData());
  });

  // 3. List internal snapshots
  app.get('/api/backup/list', isAuthenticated as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const list = await listInternalBackups();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Erreur lecture liste sauvegardes' });
    }
  });

  // 4. Create internal snapshot
  app.post('/api/backup/snapshot', isAuthenticated as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const snapshot = await createInternalBackupFile(user.name);
      await logAuditAction('SAUVEGARDE_INTERNE', `Snapshot interne créé: ${snapshot.filename}`, user.id, user.username);
      await addNotificationToDb('info', `💾 Sauvegarde interne créée avec succès par ${user.name}`, false);
      res.json({ success: true, snapshot });
    } catch (err: any) {
      res.status(500).json({ error: 'Erreur création sauvegarde' });
    }
  });

  // 5. Delete internal snapshot (Admin only)
  app.delete('/api/backup/:filename', isAdmin as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const filename = req.params.filename;
      await deleteInternalBackupFile(filename);
      await logAuditAction('SUPPRESSION_SAUVEGARDE', `Snapshot supprimé: ${filename}`, user.id, user.username);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Erreur suppression sauvegarde' });
    }
  });

  // 6. Restore from internal snapshot or JSON payload
  app.post('/api/backup/restore', isAdmin as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { filename, backupData, mode } = req.body;
      let dataToRestore = backupData;

      if (filename) {
        const backupsDir = path.join(process.cwd(), 'backups');
        const targetPath = path.join(backupsDir, path.basename(filename));
        if (!fs.existsSync(targetPath)) {
          return res.status(404).json({ error: 'Fichier de sauvegarde introuvable' });
        }
        dataToRestore = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      }

      if (!dataToRestore) {
        return res.status(400).json({ error: 'Données de sauvegarde manquantes' });
      }

      const result = await restoreFromBackupData(dataToRestore, mode || 'replace');
      await logAuditAction(
        'RESTAURATION_SAUVEGARDE',
        `Base restaurée (${mode || 'replace'}): ${result.restored.cheques} chèques, ${result.restored.fournisseurs} fournisseurs`,
        user.id,
        user.username
      );
      await addNotificationToDb('info', `🔄 Base de données restaurée (${result.restored.cheques} chèques) par ${user.name}`, true);

      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Erreur restauration:', err);
      res.status(500).json({ error: 'Erreur lors de la restauration: ' + err.message });
    }
  });

  // 7. Restore from uploaded file
  app.post('/api/backup/upload-restore', isAdmin as any, upload.single('backupFile') as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      if (!req.file) {
        return res.status(400).json({ error: 'Fichier requis' });
      }
      const raw = fs.readFileSync(req.file.path, 'utf8');
      const parsed = JSON.parse(raw);
      const mode = (req.body.mode === 'merge') ? 'merge' : 'replace';

      const result = await restoreFromBackupData(parsed, mode);
      await logAuditAction(
        'RESTAURATION_FICHIER',
        `Sauvegarde importée depuis fichier (${mode}): ${result.restored.cheques} chèques restaurés`,
        user.id,
        user.username
      );
      await addNotificationToDb('info', `📂 Sauvegarde externe restaurée par ${user.name}`, false);

      // Clean up uploaded temp file
      try { fs.unlinkSync(req.file.path); } catch (e) {}

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: 'Fichier de sauvegarde invalide ou corrompu: ' + err.message });
    }
  });

  // 8. Bulk import Cheques (CSV/JSON parsed on client or server)
  app.post('/api/import/cheques', isAuthenticated as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { cheques } = req.body;
      if (!Array.isArray(cheques) || cheques.length === 0) {
        return res.status(400).json({ error: 'Aucun chèque fourni' });
      }

      const result = await bulkImportCheques(cheques, user);
      await logAuditAction('IMPORT_CHÈQUES', `Import de ${result.imported} chèque(s) sur ${cheques.length}`, user.id, user.username);
      await addNotificationToDb('info', `📥 ${result.imported} chèque(s) importé(s) par ${user.name}`, false);

      res.json(result);
    } catch (err: any) {
      console.error('Erreur import chèques:', err);
      res.status(500).json({ error: 'Erreur import chèques: ' + err.message });
    }
  });

  // 9. Bulk import Fournisseurs
  app.post('/api/import/fournisseurs', isAuthenticated as any, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { fournisseurs } = req.body;
      if (!Array.isArray(fournisseurs) || fournisseurs.length === 0) {
        return res.status(400).json({ error: 'Aucun fournisseur fourni' });
      }

      const result = await bulkImportFournisseurs(fournisseurs);
      await logAuditAction('IMPORT_FOURNISSEURS', `Import de ${result.imported} fournisseur(s) sur ${fournisseurs.length}`, user.id, user.username);

      res.json(result);
    } catch (err: any) {
      console.error('Erreur import fournisseurs:', err);
      res.status(500).json({ error: 'Erreur import fournisseurs: ' + err.message });
    }
  });

  // Static files: uploads and mobile view
  app.use('/uploads', express.static(uploadsDir));
  const mobilDir = path.join(process.cwd(), 'mobil');
  app.use('/mobil', express.static(mobilDir));
  app.use('/mobile', express.static(mobilDir));

  // Mobile routes
  app.get('/mobil', (req: Request, res: Response) => {
    res.sendFile(path.join(mobilDir, 'index.html'));
  });
  app.get('/mobile', (req: Request, res: Response) => {
    res.sendFile(path.join(mobilDir, 'index.html'));
  });

  // Vite development middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur Chez Sahraoui actif sur http://0.0.0.0:${PORT}`);
    console.log(`🔥 Base de données Firestore: buoyant-tangent-g7dgj`);
  });
}

startServer().catch(err => {
  console.error('Erreur fatale au lancement du serveur:', err);
  process.exit(1);
});
