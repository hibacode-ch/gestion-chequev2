export type UserRole = 'admin' | 'gerant';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  createdAt: string;
}

export type ChequeStatus = 'en_attente' | 'paye' | 'impaye';

export interface Fournisseur {
  id: number;
  nom: string;
  telephone: string;
  adresse: string;
  createdAt: string;
}

export interface Cheque {
  id: number;
  numero: string;
  fournisseurId: number;
  montant: number;
  datePaiement: string;
  datePaiementReel: string | null;
  bonLivraison: string;
  totalBon: number;
  photo: string | null;
  statut: ChequeStatus;
  addedBy: number;
  addedByName: string;
  createdAt: string;
  fournisseur?: Fournisseur;
}

export interface Budget {
  month: number;
  year: number;
  maxAmount: number;
  spent: number;
  reste?: number;
  percentage?: number;
  status?: 'green' | 'yellow' | 'red';
}

export interface NotificationItem {
  id: number;
  type: string;
  message: string;
  date: string;
  urgent: boolean;
}

export interface AuditLogItem {
  id: number;
  action: string;
  details: string;
  userId: number;
  username: string;
  date: string;
}

export interface RapportStats {
  totalGeneral: number;
  totalPaye: number;
  totalImpaye: number;
  totalEnAttente: number;
  nbCheques: number;
}

export interface BackupInfo {
  filename: string;
  createdAt: string;
  size: number;
  totalCheques: number;
  totalFournisseurs: number;
  createdBy: string;
}

export interface BackupData {
  version: string;
  appName: string;
  exportedAt: string;
  stats: {
    totalCheques: number;
    totalFournisseurs: number;
    totalBudgets: number;
    totalUsers?: number;
  };
  data: {
    cheques: Cheque[];
    fournisseurs: Fournisseur[];
    budgets: Budget[];
    notifications?: NotificationItem[];
    auditLog?: AuditLogItem[];
  };
}

export interface ImportSummary {
  success: boolean;
  total: number;
  imported: number;
  errors: string[];
  message: string;
}

