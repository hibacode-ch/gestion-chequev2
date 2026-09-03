import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Cheque, Fournisseur, Budget, RapportStats } from '../types';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' DH';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Add corporate header
function drawHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top banner bar
  doc.setFillColor(30, 58, 138); // Deep Navy blue
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CHEZ SAHRAOUI', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Gestion Financière & Contrôle des Chèques', 62, 15);

  // Date on top right
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFontSize(8);
  doc.text(`Édité le: ${now}`, pageWidth - 14, 15, { align: 'right' });

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 35);

  if (subtitle) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(subtitle, 14, 41);
  }

  // Thin separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 44, pageWidth - 14, 44);
}

// Add page footer with page numbers
function drawFooter(doc: jsPDF, authorName?: string) {
  const totalPages = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const leftText = authorName ? `Document officiel — Chez Sahraoui • Émis par ${authorName}` : 'Document officiel — Chez Sahraoui';
    doc.text(leftText, 14, pageHeight - 7);
    doc.text(`Page ${i} sur ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

/**
 * 1. Export Rapport Financier Complet
 */
export function exportRapportPDF(
  stats: RapportStats,
  cheques: Cheque[],
  fournisseurs: Fournisseur[],
  budget: Budget | null,
  periodStr: string,
  authorName: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawHeader(doc, 'RAPPORT FINANCIER & DÉCAISSEMENTS', `Période d'analyse: ${periodStr}`);

  // Summary Metrics Box
  let y = 48;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 30, 2, 2, 'FD');

  const colWidth = (pageWidth - 28) / 4;

  // Metric 1: Total Émis
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL GÉNÉRAL ÉMIS', 14 + 5, y + 8);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatMoney(stats.totalGeneral), 14 + 5, y + 17);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.nbCheques} chèques émis`, 14 + 5, y + 24);

  // Metric 2: Total Réglé
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RÉGLÉ (PAYÉ)', 14 + colWidth + 5, y + 8);
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(formatMoney(stats.totalPaye), 14 + colWidth + 5, y + 17);
  const percentPaye = stats.totalGeneral > 0 ? ((stats.totalPaye / stats.totalGeneral) * 100).toFixed(1) : '0';
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(`${percentPaye}% du volume émis`, 14 + colWidth + 5, y + 24);

  // Metric 3: Total En Attente
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.text('EN ATTENTE DE DÉCAISSEMENT', 14 + colWidth * 2 + 5, y + 8);
  doc.setFontSize(11);
  doc.setTextColor(217, 119, 6);
  doc.text(formatMoney(stats.totalEnAttente), 14 + colWidth * 2 + 5, y + 17);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('Échéances futures', 14 + colWidth * 2 + 5, y + 24);

  // Metric 4: Impayés / Rejets
  doc.setFontSize(8);
  doc.setTextColor(225, 29, 72);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPAYÉS / REJETS', 14 + colWidth * 3 + 5, y + 8);
  doc.setFontSize(11);
  doc.setTextColor(190, 18, 60);
  doc.text(formatMoney(stats.totalImpaye), 14 + colWidth * 3 + 5, y + 17);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('À régulariser', 14 + colWidth * 3 + 5, y + 24);

  y += 35;

  // Budget status banner if available
  if (budget) {
    const budgetPct = budget.maxAmount > 0 ? Math.round((budget.spent / budget.maxAmount) * 100) : 0;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, y, pageWidth - 28, 14, 1.5, 1.5, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Budget du mois (${budget.month}/${budget.year}): Plafond ${formatMoney(budget.maxAmount)} | Engagé: ${formatMoney(budget.spent)} (${budgetPct}%) | Reste disponible: ${formatMoney(Math.max(0, budget.maxAmount - budget.spent))}`, 18, y + 9);

    y += 18;
  }

  // Section 1: Detailed Cheques Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Détail des Chèques Enregistrés', 14, y);
  y += 3;

  const fourMap = new Map(fournisseurs.map(f => [f.id, f.nom]));

  const chequesRows = cheques.map(c => {
    const supplier = fourMap.get(c.fournisseurId) || 'Non spécifié';
    let statutLabel = 'En attente';
    if (c.statut === 'paye') statutLabel = 'Payé';
    if (c.statut === 'impaye') statutLabel = 'Impayé';

    return [
      c.numero,
      supplier,
      formatMoney(c.montant),
      formatDate(c.datePaiement),
      c.bonLivraison || '-',
      statutLabel
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['N° Chèque', 'Fournisseur', 'Montant', 'Échéance', 'Réf BL', 'Statut']],
    body: chequesRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { cellWidth: 50 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 32 },
      3: { halign: 'center', cellWidth: 24 },
      4: { cellWidth: 26 },
      5: { halign: 'center', cellWidth: 22 }
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'Payé') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'Impayé') {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    }
  });

  // Signatures Section at the end
  const finalY = (doc as any).lastAutoTable.finalY + 14;
  if (finalY < doc.internal.pageSize.getHeight() - 40) {
    doc.setDrawColor(203, 213, 225);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    // Box 1: Direction
    doc.rect(14, finalY, 75, 24);
    doc.text('Visa de la Direction', 18, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Date & Signature:', 18, finalY + 12);

    // Box 2: Comptabilité
    doc.rect(pageWidth - 89, finalY, 75, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Visa Responsable Comptable', pageWidth - 85, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Date & Cachet:', pageWidth - 85, finalY + 12);
  }

  drawFooter(doc, authorName);
  doc.save(`Rapport_Financier_Chez_Sahraoui_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * 2. Export Liste des Chèques Filtrée PDF
 */
export function exportChequesListPDF(
  cheques: Cheque[],
  fournisseurs: Fournisseur[],
  filterTitle: string,
  authorName: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawHeader(doc, 'RELEVÉ DES CHÈQUES', `Filtre appliqué: ${filterTitle} • Total de ${cheques.length} chèque(s)`);

  const totalMontant = cheques.reduce((acc, c) => acc + c.montant, 0);
  const totalPaye = cheques.filter(c => c.statut === 'paye').reduce((acc, c) => acc + c.montant, 0);
  const totalAttente = cheques.filter(c => c.statut === 'en_attente').reduce((acc, c) => acc + c.montant, 0);
  const totalImpaye = cheques.filter(c => c.statut === 'impaye').reduce((acc, c) => acc + c.montant, 0);

  // Stats ribbon
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 46, pageWidth - 28, 12, 1.5, 1.5, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`TOTAL SÉLECTION: ${formatMoney(totalMontant)}   |   Payé: ${formatMoney(totalPaye)}   |   En Attente: ${formatMoney(totalAttente)}   |   Impayé: ${formatMoney(totalImpaye)}`, 18, 54);

  const fourMap = new Map(fournisseurs.map(f => [f.id, f.nom]));

  const rows = cheques.map(c => {
    const sName = fourMap.get(c.fournisseurId) || 'Fournisseur inconnu';
    let statutLabel = 'En attente';
    if (c.statut === 'paye') statutLabel = 'Payé';
    if (c.statut === 'impaye') statutLabel = 'Impayé';

    return [
      c.numero,
      sName,
      formatMoney(c.montant),
      formatDate(c.datePaiement),
      c.datePaiementReel ? formatDate(c.datePaiementReel) : '-',
      c.bonLivraison || '-',
      statutLabel,
      c.addedByName || '-'
    ];
  });

  autoTable(doc, {
    startY: 62,
    head: [['N° Chèque', 'Bénéficiaire (Fournisseur)', 'Montant', 'Échéance Prévue', 'Date Réglé', 'Réf Bon Livraison', 'Statut', 'Enregistré par']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 62 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 34 },
      3: { halign: 'center', cellWidth: 28 },
      4: { halign: 'center', cellWidth: 28 },
      5: { cellWidth: 32 },
      6: { halign: 'center', cellWidth: 24 },
      7: { cellWidth: 28 }
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw === 'Payé') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'Impayé') {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    }
  });

  drawFooter(doc, authorName);
  doc.save(`Cheques_Chez_Sahraoui_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * 3. Export Reçu Individuel / Bon de Règlement par Chèque PDF
 */
export function exportChequeReceiptPDF(
  cheque: Cheque,
  fournisseur: Fournisseur | undefined,
  authorName: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CHEZ SAHRAOUI', 12, 11);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('BON DE DÉCAISSEMENT & RÈGLEMENT PAR CHÈQUE', pageWidth - 12, 11, { align: 'right' });

  let y = 28;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`RÈGLEMENT CHÈQUE N° ${cheque.numero}`, 12, y);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Réf interne: CS-VOUCHER-${cheque.id} • Émis le: ${formatDate(new Date().toISOString())}`, 12, y + 5);

  y += 12;

  // Montant Banner
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, y, pageWidth - 24, 18, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTANT NET DU CHÈQUE', 16, y + 6);

  doc.setTextColor(30, 58, 138);
  doc.setFontSize(14);
  doc.text(formatMoney(cheque.montant), 16, y + 14);

  // Status Pill on right
  const statutText = cheque.statut === 'paye' ? 'PAYÉ / ENCAISSÉ' : (cheque.statut === 'impaye' ? 'IMPAYÉ' : 'EN COURS / ATTENTE');
  const statutColor: [number, number, number] = cheque.statut === 'paye' ? [16, 185, 129] : (cheque.statut === 'impaye' ? [225, 29, 72] : [245, 158, 11]);

  doc.setFillColor(statutColor[0], statutColor[1], statutColor[2]);
  doc.roundedRect(pageWidth - 62, y + 4, 46, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statutText, pageWidth - 39, y + 10.5, { align: 'center' });

  y += 24;

  // Details Table
  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Informations du règlement']],
    body: [
      ['Bénéficiaire', fournisseur ? fournisseur.nom : 'Non spécifié'],
      ['Téléphone Fournisseur', fournisseur ? fournisseur.telephone || '-' : '-'],
      ['Adresse Fournisseur', fournisseur ? fournisseur.adresse || '-' : '-'],
      ['N° Bon de Livraison (BL)', cheque.bonLivraison || 'Sans bon'],
      ['Total du Bon', formatMoney(cheque.totalBon)],
      ['Date d’Échéance Prévue', formatDate(cheque.datePaiement)],
      ['Date de Paiement Réel', cheque.datePaiementReel ? formatDate(cheque.datePaiementReel) : 'En attente d’encaissement'],
      ['Enregistré par', cheque.addedByName || authorName]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42, fillColor: [248, 250, 252] },
      1: { cellWidth: pageWidth - 24 - 42 }
    }
  });

  const signY = pageHeight - 38;
  doc.setDrawColor(203, 213, 225);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  // Signature 1
  doc.rect(12, signY, 56, 22);
  doc.text('Signature & Visa Émetteur', 15, signY + 5);

  // Signature 2
  doc.rect(pageWidth - 68, signY, 56, 22);
  doc.text('Reçu par le Bénéficiaire', pageWidth - 65, signY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Date & Signature:', pageWidth - 65, signY + 10);

  // Footer line
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Chez Sahraoui - Document de contrôle interne', pageWidth / 2, pageHeight - 5, { align: 'center' });

  doc.save(`Recu_Cheque_${cheque.numero}.pdf`);
}

/**
 * 4. Export Relevé par Fournisseur PDF
 */
export function exportFournisseurStatementPDF(
  fournisseur: Fournisseur,
  cheques: Cheque[],
  authorName: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawHeader(doc, 'RELEVÉ DE COMPTE FOURNISSEUR', `Bénéficiaire: ${fournisseur.nom} • Tél: ${fournisseur.telephone || '-'} • ${fournisseur.adresse || ''}`);

  const totalEmis = cheques.reduce((acc, c) => acc + c.montant, 0);
  const totalPaye = cheques.filter(c => c.statut === 'paye').reduce((acc, c) => acc + c.montant, 0);
  const totalAttente = cheques.filter(c => c.statut === 'en_attente').reduce((acc, c) => acc + c.montant, 0);

  let y = 48;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`TOTAL ENGAGÉ: ${formatMoney(totalEmis)}   |   RÉGLÉ: ${formatMoney(totalPaye)}   |   EN ATTENTE: ${formatMoney(totalAttente)}`, 18, y + 12);

  y += 26;

  const rows = cheques.map(c => [
    c.numero,
    formatMoney(c.montant),
    formatDate(c.datePaiement),
    c.bonLivraison || '-',
    c.statut === 'paye' ? 'Payé' : (c.statut === 'impaye' ? 'Impayé' : 'En attente'),
    c.datePaiementReel ? formatDate(c.datePaiementReel) : '-'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['N° Chèque', 'Montant', 'Échéance', 'Réf BL', 'Statut', 'Date Réglé']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 28 },
      3: { cellWidth: 30 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 28 }
    }
  });

  drawFooter(doc, authorName);
  doc.save(`Releve_Fournisseur_${fournisseur.nom.replace(/\s+/g, '_')}.pdf`);
}
