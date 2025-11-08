import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatPercent } from './formatters.js';

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportApplicationsCsv(applications) {
  if (!Array.isArray(applications) || !applications.length) {
    return;
  }

  const headers = [
    'ID',
    'Nom',
    'Email',
    'Téléphone',
    'Revenu mensuel',
    'Type de crédit',
    'Montant',
    'Durée (mois)',
    'Mensualité',
    'Statut',
    'Prioritaire',
    'Créée le',
  ];

  const rows = applications.map((application) => [
    application.id,
    application.fullName,
    application.email,
    application.phone,
    application.monthlyIncome,
    application.creditType?.label ?? application.creditTypeId,
    application.simulation?.amount ?? '',
    application.simulation?.months ?? '',
    application.simulation?.monthlyPayment ?? '',
    application.status,
    application.priority ? 'Oui' : 'Non',
    application.createdAt,
  ]);

  const csv = [headers, ...rows]
    .map((line) => line.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n');

  downloadBlob(csv, 'demandes-credit.csv', 'text/csv;charset=utf-8;');
}

export function exportSimulationPdf({ simulation, application, settings = {} }) {
  if (!simulation) {
    return;
  }

  const currency = settings.currency ?? 'MAD';
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Résumé de simulation de crédit', 14, 16);

  doc.setFontSize(12);
  doc.text(`Simulation #${simulation.id ?? 'N/A'}`, 14, 26);

  autoTable(doc, {
    startY: 32,
    body: [
      ['Type de crédit', simulation.creditType?.label ?? simulation.creditTypeId ?? '-'],
      ['Montant', formatCurrency(simulation.amount, currency)],
      ['Durée (mois)', simulation.months],
      ['Taux annuel', formatPercent(simulation.annualRate)],
      ['Assurance', formatPercent(simulation.insuranceRate ?? 0)],
      ['Frais fixes', formatCurrency(simulation.fees ?? 0, currency)],
      ['Mensualité', formatCurrency(simulation.monthlyPayment, currency)],
      ['Coût total', formatCurrency(simulation.totalCost, currency)],
      ['TAEG (approx.)', formatPercent(simulation.apr)],
    ],
    styles: { cellWidth: 'wrap' },
    theme: 'grid',
  });

  if (application) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Informations du demandeur', 'Valeur']],
      body: [
        ['Nom complet', application.fullName],
        ['Email', application.email],
        ['Téléphone', application.phone],
        ['Revenu mensuel', formatCurrency(application.monthlyIncome, currency)],
        ['Situation professionnelle', application.employmentType?.label ?? application.employmentTypeId ?? '-'],
        ['Métier', application.job?.label ?? application.jobId ?? '-'],
        ['Commentaire', application.comment ?? '-'],
        ['Statut', application.status ?? '-'],
        ['Priorité', application.priority ? 'Oui' : 'Non'],
        ['Créée le', formatDate(application.createdAt)],
      ],
      styles: { cellWidth: 'wrap' },
      theme: 'grid',
    });
  }

  const amortization = Array.isArray(simulation.amortization) ? simulation.amortization.slice(0, 24) : [];

  if (amortization.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Mois', 'Mensualité', 'Intérêts', 'Capital', 'Assurance', 'Restant dû']],
      body: amortization.map((entry) => [
        entry.month,
        formatCurrency(entry.payment, currency),
        formatCurrency(entry.interest, currency),
        formatCurrency(entry.principal, currency),
        formatCurrency(entry.insurance, currency),
        formatCurrency(entry.remaining, currency),
      ]),
      theme: 'striped',
    });
  }

  doc.save(`simulation-${simulation.id ?? Date.now()}.pdf`);
}

export default {
  exportSimulationPdf,
  exportApplicationsCsv,
};
