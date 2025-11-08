function toNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateMonthlyPayment(amount, months, annualRate) {
  const principal = toNumber(amount);
  const totalMonths = toNumber(months);
  const rate = toNumber(annualRate) / 12 / 100;

  if (!totalMonths || totalMonths <= 0) {
    return 0;
  }

  if (!rate) {
    return principal / totalMonths;
  }

  const factor = (1 + rate) ** totalMonths;
  const payment = principal * ((rate * factor) / (factor - 1));
  return payment;
}

export function buildAmortizationSchedule({
  amount,
  months,
  annualRate,
  monthlyPayment,
  insuranceMonthly,
}) {
  const entries = [];
  const principalTotal = toNumber(amount);
  const totalMonths = Math.max(0, Math.floor(toNumber(months)));
  const monthlyRate = toNumber(annualRate) / 12 / 100;
  const paymentExInsurance = monthlyPayment - insuranceMonthly;

  if (!principalTotal || !totalMonths) {
    return entries;
  }

  let balance = principalTotal;

  for (let index = 1; index <= totalMonths; index += 1) {
    const interest = monthlyRate ? balance * monthlyRate : 0;
    let principalSlice = paymentExInsurance - interest;

    if (principalSlice < 0) {
      principalSlice = 0;
    }

    if (index === totalMonths) {
      principalSlice = balance;
    }

    balance = Math.max(0, balance - principalSlice);

    entries.push({
      month: index,
      payment: roundCurrency(monthlyPayment),
      interest: roundCurrency(interest),
      principal: roundCurrency(principalSlice),
      insurance: roundCurrency(insuranceMonthly),
      remaining: roundCurrency(balance),
    });
  }

  return entries;
}

export function calculateSimulation(values) {
  const amount = toNumber(values.amount);
  const months = Math.max(0, Math.floor(toNumber(values.months)));
  const annualRate = toNumber(values.annualRate);
  const fees = toNumber(values.fees);
  const insuranceRate = toNumber(values.insuranceRate);

  if (!amount || !months) {
    return null;
  }

  const baseMonthly = calculateMonthlyPayment(amount, months, annualRate);
  const insuranceMonthly = insuranceRate ? (amount * (insuranceRate / 100)) / 12 : 0;
  const totalMonthly = baseMonthly + insuranceMonthly;
  const amortization = buildAmortizationSchedule({
    amount,
    months,
    annualRate,
    monthlyPayment: totalMonthly,
    insuranceMonthly,
  });

  const totalPaid = totalMonthly * months + fees;
  const totalInsurance = insuranceMonthly * months;
  const totalInterestRaw = totalPaid - fees - amount - totalInsurance;
  const totalInterest = Math.max(0, totalInterestRaw);
  const apr = ((totalPaid - amount) / amount) / (months / 12 || 1) * 100;

  return {
    amount,
    months,
    annualRate,
    fees,
    insuranceRate,
    monthlyPayment: roundCurrency(totalMonthly),
    baseMonthlyPayment: roundCurrency(baseMonthly),
    insuranceMonthly: roundCurrency(insuranceMonthly),
    totalCost: roundCurrency(totalPaid),
    totalInterest: roundCurrency(totalInterest),
    totalInsurance: roundCurrency(totalInsurance),
    apr: roundCurrency(apr),
    amortization,
  };
}

export function sliceAmortization(schedule, { limit } = {}) {
  if (!Array.isArray(schedule)) {
    return [];
  }
  if (!limit || limit >= schedule.length) {
    return schedule;
  }
  return schedule.slice(0, limit);
}

export function buildSimulationPayload(values, metadata = {}) {
  const summary = calculateSimulation(values);
  if (!summary) {
    return null;
  }

  return {
    creditTypeId: values.creditTypeId,
    amount: summary.amount,
    months: summary.months,
    annualRate: summary.annualRate,
    fees: summary.fees,
    insuranceRate: summary.insuranceRate,
    monthlyPayment: summary.monthlyPayment,
    totalCost: summary.totalCost,
    apr: summary.apr,
    amortization: summary.amortization,
    ...metadata,
  };
}

export function roundMoney(value) {
  return roundCurrency(value);
}

export default {
  calculateSimulation,
  calculateMonthlyPayment,
  buildAmortizationSchedule,
  sliceAmortization,
  buildSimulationPayload,
  roundMoney,
};
