import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../api/client.js';
import { formatCurrency, formatPercent } from '../utils/formatters.js';

const initialValues = {
  fullName: '',
  email: '',
  phone: '',
  monthlyIncome: '',
  employmentTypeId: '',
  jobId: '',
  comment: '',
};

function ApplicationFormPage() {
  const { simulationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState(initialValues);
  const [options, setOptions] = useState({ employmentTypes: [], jobs: [], creditTypes: [] });
  const [simulation, setSimulation] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sim, employmentTypes, jobs, creditTypes] = await Promise.all([
          get(`/simulations/${simulationId}`),
          get('/employmentTypes'),
          get('/jobs'),
          get('/creditTypes'),
        ]);

        if (!sim) {
          setSubmitError('Simulation introuvable.');
          return;
        }

        setSimulation(sim);
        setOptions({
          employmentTypes: Array.isArray(employmentTypes) ? employmentTypes : [],
          jobs: Array.isArray(jobs) ? jobs : [],
          creditTypes: Array.isArray(creditTypes) ? creditTypes : [],
        });

        setFormValues((current) => ({
          ...current,
          jobId: sim.jobId ?? (Array.isArray(jobs) && jobs.length ? jobs[0].id : ''),
          employmentTypeId: Array.isArray(employmentTypes) && employmentTypes.length ? employmentTypes[0].id : '',
        }));
      } catch (error) {
        setSubmitError('Impossible de charger les informations de la simulation.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [simulationId]);

  const creditType = useMemo(() => {
    if (!simulation || !options?.creditTypes) {
      return null;
    }
    return options.creditTypes.find((item) => item.id === simulation.creditTypeId) ?? null;
  }, [simulation, options]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validate = () => {
    const validationErrors = {};
    if (!formValues.fullName) {
      validationErrors.fullName = 'Nom requis';
    }
    if (!formValues.email) {
      validationErrors.email = 'Email requis';
    }
    if (!formValues.phone) {
      validationErrors.phone = 'Téléphone requis';
    }
    if (!formValues.monthlyIncome || Number.isNaN(Number(formValues.monthlyIncome))) {
      validationErrors.monthlyIncome = 'Revenu mensuel invalide';
    }
    if (!formValues.employmentTypeId) {
      validationErrors.employmentTypeId = 'Situation professionnelle requise';
    }
    if (!formValues.jobId) {
      validationErrors.jobId = 'Métier requis';
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

    if (!simulation) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        simulationId: simulation.id,
        fullName: formValues.fullName,
        email: formValues.email,
        phone: formValues.phone,
        monthlyIncome: Number(formValues.monthlyIncome),
        employmentTypeId: formValues.employmentTypeId,
        jobId: formValues.jobId,
        creditTypeId: simulation.creditTypeId,
        comment: formValues.comment,
        status: 'pending',
        priority: false,
        notes: [],
        statusHistory: [
          {
            status: 'pending',
            changedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const application = await post('/applications', payload);

      await post('/notifications', {
        type: 'NEW_APPLICATION',
        applicationId: application.id,
        title: `Nouvelle demande de ${application.fullName}`,
        seen: false,
        createdAt: new Date().toISOString(),
      });

      navigate(`/application-success/${application.id}`);
    } catch (error) {
      setSubmitError("La demande n'a pas pu être envoyée. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <span>Chargement du formulaire...</span>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="page shell">
        <div className="alert alert-error">Simulation introuvable.</div>
      </div>
    );
  }

  return (
    <div className="page shell">
      <section className="card">
        <h1>Demande de crédit</h1>
        <p className="text-muted">Vos informations seront examinées par un conseiller. Vous recevrez un accusé dans les plus brefs délais.</p>

        <h2>Récapitulatif de la simulation</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Type de crédit</span>
            <strong className="summary-value">{creditType?.label ?? simulation.creditTypeId}</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">Montant</span>
            <strong className="summary-value">{formatCurrency(simulation.amount)}</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">Durée</span>
            <strong className="summary-value">{simulation.months} mois</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">Mensualité</span>
            <strong className="summary-value">{formatCurrency(simulation.monthlyPayment)}</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">TAEG</span>
            <strong className="summary-value">{formatPercent(simulation.apr)}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Informations personnelles</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="fullName">Nom complet</label>
            <input id="fullName" name="fullName" value={formValues.fullName} onChange={handleChange} />
            {errors.fullName && <span className="form-error">{errors.fullName}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={formValues.email} onChange={handleChange} />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="phone">Téléphone</label>
            <input id="phone" name="phone" value={formValues.phone} onChange={handleChange} />
            {errors.phone && <span className="form-error">{errors.phone}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="monthlyIncome">Revenu mensuel (net)</label>
            <input id="monthlyIncome" name="monthlyIncome" type="number" value={formValues.monthlyIncome} onChange={handleChange} />
            {errors.monthlyIncome && <span className="form-error">{errors.monthlyIncome}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="employmentTypeId">Situation professionnelle</label>
            <select id="employmentTypeId" name="employmentTypeId" value={formValues.employmentTypeId} onChange={handleChange}>
              {options.employmentTypes.map((employment) => (
                <option key={employment.id} value={employment.id}>{employment.label}</option>
              ))}
            </select>
            {errors.employmentTypeId && <span className="form-error">{errors.employmentTypeId}</span>}
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

          <div className="form-field form-field--full">
            <label htmlFor="comment">Commentaire</label>
            <textarea id="comment" name="comment" value={formValues.comment} onChange={handleChange} rows="4" />
          </div>

          {submitError && <div className="alert alert-error">{submitError}</div>}

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ApplicationFormPage;
