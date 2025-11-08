import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get } from '../api/client.js';
import { exportSimulationPdf } from '../utils/exporters.js';

function ApplicationSuccessPage() {
  const { applicationId } = useParams();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [settings, setSettings] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const applicationRecord = await get(`/applications/${applicationId}`);
        if (!applicationRecord) {
          setError('Demande introuvable.');
          return;
        }
        const [simulationRecord, creditTypes, employmentTypes, jobs, settingsRecord] = await Promise.all([
          get(`/simulations/${applicationRecord.simulationId}`),
          get('/creditTypes'),
          get('/employmentTypes'),
          get('/jobs'),
          get('/settings'),
        ]);

        const creditType = Array.isArray(creditTypes)
          ? creditTypes.find((item) => item.id === applicationRecord.creditTypeId)
          : null;
        const employmentType = Array.isArray(employmentTypes)
          ? employmentTypes.find((item) => item.id === applicationRecord.employmentTypeId)
          : null;
        const job = Array.isArray(jobs)
          ? jobs.find((item) => item.id === applicationRecord.jobId)
          : null;

  setApplication({ ...applicationRecord, creditType, employmentType, job });
  setSimulation(simulationRecord ? { ...simulationRecord, creditType } : null);
        setSettings(settingsRecord ?? {});
      } catch (err) {
        setError('Impossible de charger la demande.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [applicationId]);

  const handleDownload = () => {
    if (simulation && application) {
      exportSimulationPdf({ simulation, application, settings });
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <span>Chargement...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page shell">
        <div className="alert alert-error">{error}</div>
        <Link className="button" to="/">Retour au simulateur</Link>
      </div>
    );
  }

  return (
    <div className="page shell">
      <section className="card success-card">
        <h1>Votre demande a bien été envoyée</h1>
        <p>
          Nous vous remercions pour votre confiance. Un conseiller analysera votre dossier et reviendra vers vous dans les meilleurs délais.
        </p>
        <div className="success-actions">
          <button type="button" className="button button-primary" onClick={handleDownload}>
            Télécharger le récapitulatif en PDF
          </button>
          <Link className="button" to="/">
            Revenir au simulateur
          </Link>
        </div>
      </section>
    </div>
  );
}

export default ApplicationSuccessPage;
