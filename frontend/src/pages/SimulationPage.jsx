import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '../api/client.js';
import { buildSimulationPayload, calculateSimulation, sliceAmortization } from '../utils/calculations.js';
import { formatCurrency, formatPercent } from '../utils/formatters.js';

const initialValues = {
  creditTypeId: '',
  jobId: '',
  amount: '',
  months: '',
  annualRate: '',
  fees: '',
  insuranceRate: '',
};

function SimulationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({ creditTypes: [], jobs: [], settings: {} });
  const [formValues, setFormValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [summary, setSummary] = useState(null);
  const [savedSimulation, setSavedSimulation] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true);
        const [creditTypes, jobs, settings] = await Promise.all([
          get('/creditTypes'),
          get('/jobs'),
          get('/settings'),
        ]);

        const defaults = Array.isArray(creditTypes) ? creditTypes : [];
        const firstCreditType = defaults[0];
        const defaultAmount = firstCreditType?.minAmount ?? '';
        const defaultMonths = firstCreditType?.maxMonths ? Math.min(firstCreditType.maxMonths, 120) : '';

        setOptions({
          creditTypes: defaults,
          jobs: Array.isArray(jobs) ? jobs : [],
          settings: settings ?? {},
        });

        setFormValues((current) => ({
          ...current,
          creditTypeId: firstCreditType?.id ?? '',
          jobId: Array.isArray(jobs) && jobs.length ? jobs[0].id : '',
          amount: defaultAmount,
          months: defaultMonths,
          annualRate: firstCreditType?.defaultAnnualRate ?? '',
          fees: firstCreditType?.defaultFees ?? '',
          insuranceRate: firstCreditType?.defaultInsuranceRate ?? '',
        }));
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, []);

  const creditType = useMemo(
    () => options.creditTypes.find((item) => item.id === formValues.creditTypeId),
    [options.creditTypes, formValues.creditTypeId],
  );

  const job = useMemo(
    () => options.jobs.find((item) => item.id === formValues.jobId),
    [options.jobs, formValues.jobId],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));

    if (name === 'creditTypeId') {
      const selected = options.creditTypes.find((item) => item.id === value);
      if (selected) {
        setFormValues((current) => ({
          ...current,
          creditTypeId: selected.id,
          amount: selected.minAmount,
          months: Math.min(selected.maxMonths, Number(current.months) || selected.maxMonths || 120),
          annualRate: selected.defaultAnnualRate ?? current.annualRate,
          fees: selected.defaultFees ?? current.fees,
          insuranceRate: selected.defaultInsuranceRate ?? current.insuranceRate,
        }));
      }
    }
  };

  const validate = () => {
    const validationErrors = {};
    const amount = Number(formValues.amount);
    const months = Number(formValues.months);

    if (!formValues.creditTypeId) {
      validationErrors.creditTypeId = 'Veuillez choisir un type de crédit';
    }

    if (!formValues.jobId) {
      validationErrors.jobId = 'Veuillez choisir un métier';
    }

    if (!amount || Number.isNaN(amount)) {
      validationErrors.amount = 'Montant invalide';
    } else if (creditType) {
      if (amount < creditType.minAmount) {
        validationErrors.amount = `Le montant minimum est ${creditType.minAmount}`;
      }
      if (amount > creditType.maxAmount) {
        validationErrors.amount = `Le montant maximum est ${creditType.maxAmount}`;
      }
    }

    if (!months || Number.isNaN(months)) {
      validationErrors.months = 'Durée invalide';
    } else if (creditType && creditType.maxMonths && months > creditType.maxMonths) {
      validationErrors.months = `La durée maximale est ${creditType.maxMonths} mois`;
    }

    if (!formValues.annualRate && formValues.annualRate !== 0) {
      validationErrors.annualRate = 'Taux requis';
    }

    return validationErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    const simulation = calculateSimulation({
      ...formValues,
      amount: Number(formValues.amount),
      months: Number(formValues.months),
      annualRate: Number(formValues.annualRate),
      fees: Number(formValues.fees) || 0,
      insuranceRate: Number(formValues.insuranceRate) || 0,
    });

    if (!simulation) {
      return;
    }

  setSummary({ ...simulation, creditType, job });
  setSavedSimulation(null);
    setSaveError(null);

    try {
      setSaving(true);
      const payload = buildSimulationPayload({
        ...formValues,
        amount: Number(formValues.amount),
        months: Number(formValues.months),
        annualRate: Number(formValues.annualRate),
        fees: Number(formValues.fees) || 0,
        insuranceRate: Number(formValues.insuranceRate) || 0,
      }, {
        jobId: formValues.jobId,
        createdAt: new Date().toISOString(),
      });

      if (!payload) {
        return;
      }

      const previewLimit = options.settings?.maxSimRowsPreview;
      payload.amortization = sliceAmortization(simulation.amortization, { limit: previewLimit });
      payload.jobId = formValues.jobId;

      const saved = await post('/simulations', payload);
      setSavedSimulation({ ...saved, creditType, job });
    } catch (error) {
      setSaveError("Impossible d'enregistrer la simulation. Réessayez plus tard.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDemand = () => {
    if (savedSimulation?.id) {
      navigate(`/apply/${savedSimulation.id}`);
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <span>Chargement du simulateur...</span>
      </div>
    );
  }

  if (!options.creditTypes.length) {
    return (
      <div className="page shell">
        <div className="alert alert-error">Aucun type de crédit disponible. Vérifiez les données de configuration.</div>
      </div>
    );
  }

  return (
    <div className="page shell">
      <section className="card">
        <h1>Simulateur de crédit</h1>
        <p className="text-muted">
          Renseignez vos informations pour calculer vos mensualités, le coût total du crédit et consulter un échéancier simplifié.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="creditTypeId">Type de crédit</label>
            <select id="creditTypeId" name="creditTypeId" value={formValues.creditTypeId} onChange={handleChange}>
              {options.creditTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
            {errors.creditTypeId && <span className="form-error">{errors.creditTypeId}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="jobId">Métier</label>
            <select id="jobId" name="jobId" value={formValues.jobId} onChange={handleChange}>
              {options.jobs.map((jobOption) => (
                <option key={jobOption.id} value={jobOption.id}>{jobOption.label}</option>
              ))}
            </select>
            {errors.jobId && <span className="form-error">{errors.jobId}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="amount">Montant demandé</label>
            <input id="amount" name="amount" type="number" min="0" value={formValues.amount} onChange={handleChange} />
            {creditType && (
              <small className="form-hint">
                Min {formatCurrency(creditType.minAmount)} - Max {formatCurrency(creditType.maxAmount)}
              </small>
            )}
            {errors.amount && <span className="form-error">{errors.amount}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="months">Durée (mois)</label>
            <input id="months" name="months" type="number" min="1" value={formValues.months} onChange={handleChange} />
            {creditType?.maxMonths && <small className="form-hint">Maximum {creditType.maxMonths} mois</small>}
            {errors.months && <span className="form-error">{errors.months}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="annualRate">Taux annuel (%)</label>
            <input id="annualRate" name="annualRate" type="number" step="0.01" value={formValues.annualRate} onChange={handleChange} />
            {errors.annualRate && <span className="form-error">{errors.annualRate}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="fees">Frais fixes</label>
            <input id="fees" name="fees" type="number" step="0.01" value={formValues.fees} onChange={handleChange} />
          </div>

          <div className="form-field">
            <label htmlFor="insuranceRate">Assurance (%)</label>
            <input id="insuranceRate" name="insuranceRate" type="number" step="0.01" value={formValues.insuranceRate} onChange={handleChange} />
          </div>

          <div className="form-actions">
            <button type="submit" className="button" disabled={saving}>
              {saving ? 'Calcul en cours...' : 'Calculer ma simulation'}
            </button>
          </div>
        </form>

        {saveError && <div className="alert alert-error">{saveError}</div>}
      </section>

      {summary && (
        <section className="card">
          <h2>Résultats de la simulation</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Mensualité estimée</span>
              <strong className="summary-value">{formatCurrency(summary.monthlyPayment)}</strong>
            </div>
            <div className="summary-item">
              <span className="summary-label">Coût total du crédit</span>
              <strong className="summary-value">{formatCurrency(summary.totalCost)}</strong>
            </div>
            <div className="summary-item">
              <span className="summary-label">TAEG approximatif</span>
              <strong className="summary-value">{formatPercent(summary.apr)}</strong>
            </div>
            <div className="summary-item">
              <span className="summary-label">Assurance mensuelle</span>
              <strong className="summary-value">{formatCurrency(summary.insuranceMonthly)}</strong>
            </div>
          </div>

          <h3>Échéancier simplifié</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Mensualité</th>
                  <th>Intérêts</th>
                  <th>Capital</th>
                  <th>Assurance</th>
                  <th>Restant dû</th>
                </tr>
              </thead>
              <tbody>
                {summary.amortization.slice(0, options.settings?.maxSimRowsPreview ?? 12).map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td>{formatCurrency(row.payment)}</td>
                    <td>{formatCurrency(row.interest)}</td>
                    <td>{formatCurrency(row.principal)}</td>
                    <td>{formatCurrency(row.insurance)}</td>
                    <td>{formatCurrency(row.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="callout">
            <p>
              En soumettant une demande depuis cette simulation, vos informations financières seront transmises à nos équipes pour étude et conception de nouvelles offres.
            </p>
            <button type="button" className="button button-primary" onClick={handleCreateDemand} disabled={!savedSimulation || saving}>
              Faire une demande de crédit
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default SimulationPage;
