import { User, Cheque, Fournisseur, Budget, AuditLogItem, NotificationItem, RapportStats } from './types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('cs_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function checkCurrentAuth(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/me`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) return data.user;
    }
  } catch (err) {
    console.warn('Erreur vérification auth:', err);
  }
  return null;
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean; user?: User; message?: string; token?: string }> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include'
  });
  const data = await res.json();
  if (data.success && data.token) {
    localStorage.setItem('cs_token', data.token);
  }
  return data;
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: getAuthHeader(),
    credentials: 'include'
  });
  localStorage.removeItem('cs_token');
}

export async function fetchCheques(): Promise<Cheque[]> {
  const res = await fetch(`${API_BASE}/cheques`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Erreur chargement chèques');
  return res.json();
}

export async function createCheque(formData: FormData): Promise<{ success: boolean; cheque?: Cheque }> {
  const res = await fetch(`${API_BASE}/cheques`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
    credentials: 'include'
  });
  return res.json();
}

export async function updateChequeStatus(id: number, statut: string, datePaiementReel?: string): Promise<{ success: boolean; cheque?: Cheque }> {
  const res = await fetch(`${API_BASE}/cheques/${id}/statut`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ statut, datePaiementReel }),
    credentials: 'include'
  });
  return res.json();
}

export async function deleteCheque(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/cheques/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
    credentials: 'include'
  });
  return res.json();
}

export async function fetchFournisseurs(): Promise<Fournisseur[]> {
  const res = await fetch(`${API_BASE}/fournisseurs`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Erreur chargement fournisseurs');
  return res.json();
}

export async function createFournisseur(data: { nom: string; telephone: string; adresse: string }): Promise<{ success: boolean; fournisseur?: Fournisseur }> {
  const res = await fetch(`${API_BASE}/fournisseurs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return res.json();
}

export async function fetchBudget(month: number, year: number): Promise<Budget> {
  const res = await fetch(`${API_BASE}/budget/${month}/${year}`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Erreur chargement budget');
  return res.json();
}

export async function updateBudgetCap(month: number, year: number, maxAmount: number): Promise<Budget> {
  const res = await fetch(`${API_BASE}/budget/${month}/${year}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ maxAmount }),
    credentials: 'include'
  });
  const data = await res.json();
  return data.budget;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createUser(data: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return res.json();
}

export async function updateUser(id: number, data: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  return res.json();
}

export async function deleteUser(id: number): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
    credentials: 'include'
  });
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  const res = await fetch(`${API_BASE}/audit-log`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE}/notifications`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchRapport(): Promise<RapportStats> {
  const res = await fetch(`${API_BASE}/rapport`, {
    headers: getAuthHeader(),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Erreur chargement rapport');
  return res.json();
}
