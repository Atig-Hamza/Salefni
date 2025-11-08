const currencyFormatters = new Map();

function getCurrencyFormatter(currency = 'MAD') {
  const key = currency.toUpperCase();
  if (!currencyFormatters.has(key)) {
    currencyFormatters.set(key, new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: key,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
  }
  return currencyFormatters.get(key);
}

export function formatCurrency(value, currency = 'MAD') {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '-';
  }
  return getCurrencyFormatter(currency).format(Number(value));
}

export function formatPercent(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '-';
  }
  return `${Number(value).toFixed(2)} %`;
}

export function formatNumber(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '-';
  }
  return new Intl.NumberFormat('fr-FR').format(Number(value));
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function formatStatus(status) {
  if (!status) {
    return 'Inconnu';
  }
  const map = {
    pending: 'En attente',
    reviewing: 'En cours',
    accepted: 'Acceptée',
    rejected: 'Refusée',
  };
  return map[status] ?? status;
}

export default {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatDate,
  formatStatus,
};
