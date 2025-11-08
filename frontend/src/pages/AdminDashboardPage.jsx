import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, patch } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { exportApplicationsCsv, exportSimulationPdf } from '../utils/exporters.js';
import { formatCurrency, formatDate, formatPercent, formatStatus } from '../utils/formatters.js';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'reviewing', label: 'En cours' },
  { value: 'accepted', label: 'Acceptée' },
  { value: 'rejected', label: 'Refusée' },
];

const ADMIN_STATUSES = STATUS_OPTIONS.filter((status) => status.value !== 'all');

function AdminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', search: '', order: 'desc' });
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});

  const hydrateApplication = useCallback((application, creditTypes, employmentTypes, jobs) => {
    if (!application) {
      return null;
    }
    return {
      ...application,
      simulation: application.simulation ?? null,
      creditType: creditTypes.find((item) => item.id === application.creditTypeId) ?? null,
      employmentType: employmentTypes.find((item) => item.id === application.employmentTypeId) ?? null,
      job: jobs.find((item) => item.id === application.jobId) ?? null,
    };
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [applicationData, creditTypes, employmentTypes, jobs, settingsRecord] = await Promise.all([
        get('/applications', { _sort: 'createdAt', _order: 'desc', _expand: 'simulation' }),
        get('/creditTypes'),
        get('/employmentTypes'),
        get('/jobs'),
        get('/settings'),
      ]);

      setSettings(settingsRecord ?? {});

      const hydrated = Array.isArray(applicationData)
        ? applicationData.map((application) => hydrateApplication(
          application,
          Array.isArray(creditTypes) ? creditTypes : [],
          Array.isArray(employmentTypes) ? employmentTypes : [],
          Array.isArray(jobs) ? jobs : [],
        ))
        : [];

      setApplications(hydrated);
      if (hydrated.length && !selectedId) {
        setSelectedId(hydrated[0].id);
      }
    } catch (err) {
      setError('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  }, [hydrateApplication, selectedId]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const filteredApplications = useMemo(() => {
    let data = [...applications];

    if (filters.status !== 'all') {
      data = data.filter((application) => application.status === filters.status);
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      data = data.filter((application) => (
        application.fullName?.toLowerCase().includes(query)
        || application.email?.toLowerCase().includes(query)
      ));
    }

    data.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return filters.order === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return data;
  }, [applications, filters]);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedId) ?? null,
    [applications, selectedId],
  );

  const refreshSelection = useCallback((updated) => {
    setApplications((current) => current.map((application) => (
      application.id === updated.id ? { ...application, ...updated } : application
    )));
  }, []);

  const handleStatusChange = async (applicationId, status) => {
    const application = applications.find((item) => item.id === applicationId);
    if (!application) {
      return;
    }
    if (application.status === status) {
      return;
    }
    setSaving(true);
  setError(null);
    try {
      const changedAt = new Date().toISOString();
      const history = [...(application.statusHistory ?? []), { status, changedAt, author: user?.email ?? 'admin' }];
      await patch(`/applications/${applicationId}`, {
        status,
        statusHistory: history,
        updatedAt: changedAt,
      });
      refreshSelection({
        ...application,
        status,
        statusHistory: history,
        updatedAt: changedAt,
      });
    } catch (err) {
      setError('La mise à jour du statut a échoué.');
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityToggle = async (applicationId) => {
    const application = applications.find((item) => item.id === applicationId);
    if (!application) {
      return;
    }
    setSaving(true);
  setError(null);
    try {
      const changedAt = new Date().toISOString();
      await patch(`/applications/${applicationId}`, {
        priority: !application.priority,
        updatedAt: changedAt,
      });
      refreshSelection({
        ...application,
        priority: !application.priority,
        updatedAt: changedAt,
      });
    } catch (err) {
      setError('Impossible de modifier la priorité.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async (applicationId, content) => {
    const application = applications.find((item) => item.id === applicationId);
    if (!application || !content) {
      return;
    }
    setSaving(true);
  setError(null);
    try {
      const changedAt = new Date().toISOString();
      const note = {
        id: `${applicationId}-${Date.now()}`,
        content,
        author: user?.email ?? 'admin',
        createdAt: changedAt,
      };
      const notes = [...(application.notes ?? []), note];
      await patch(`/applications/${applicationId}`, {
        notes,
        updatedAt: changedAt,
      });
      refreshSelection({
        ...application,
        notes,
        updatedAt: changedAt,
      });
    } catch (err) {
      setError("Impossible d'ajouter la note.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    exportApplicationsCsv(filteredApplications);
  };

  if (loading) {
    return (
      <div className="page-loader">
        <span>Chargement des demandes...</span>
      </div>
    );
  }

  if (error && !applications.length) {
    return (
      <div className="page shell">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page admin-dashboard">
      <div className="dashboard-controls">
        <div className="filters">
          <input
            type="search"
            placeholder="Recherche par nom ou email"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={filters.order}
            onChange={(event) => setFilters((current) => ({ ...current, order: event.target.value }))}
          >
            <option value="desc">Plus récentes</option>
            <option value="asc">Plus anciennes</option>
          </select>
          <button type="button" className="button" onClick={handleExport} disabled={!filteredApplications.length}>
            Export CSV
          </button>
        </div>
        {error && <div className="alert alert-error inline-alert">{error}</div>}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-table">
          <table>
            <thead>
              <tr>
                <th>Demandeur</th>
                <th>Email</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Créée le</th>
                <th>Priorité</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted">
                    Aucune demande ne correspond à votre recherche.
                  </td>
                </tr>
              )}
              {filteredApplications.map((application) => (
                <tr
                  key={application.id}
                  className={selectedId === application.id ? 'is-selected' : ''}
                  onClick={() => setSelectedId(application.id)}
                >
                  <td>{application.fullName}</td>
                  <td>{application.email}</td>
                  <td>{formatCurrency(application.simulation?.monthlyPayment ?? 0)}</td>
                  <td>
                    <span className={`status-badge status-${application.status}`}>
                      {formatStatus(application.status)}
                    </span>
                  </td>
                  <td>{formatDate(application.createdAt)}</td>
                  <td>{application.priority ? 'Oui' : 'Non'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashboard-detail">
          {!selectedApplication && <p className="text-muted">Sélectionnez une demande dans la liste.</p>}

          {selectedApplication && (
            <div className="detail-card">
              <header>
                <h2>{selectedApplication.fullName}</h2>
                <p className="text-muted">{selectedApplication.email} - {selectedApplication.phone}</p>
              </header>

              <section>
                <h3>Simulation</h3>
                <dl className="detail-list">
                  <div>
                    <dt>Type</dt>
                    <dd>{selectedApplication.creditType?.label ?? selectedApplication.creditTypeId}</dd>
                  </div>
                  <div>
                    <dt>Montant</dt>
                    <dd>{formatCurrency(selectedApplication.simulation?.amount)}</dd>
                  </div>
                  <div>
                    <dt>Durée</dt>
                    <dd>{selectedApplication.simulation?.months} mois</dd>
                  </div>
                  <div>
                    <dt>Mensualité</dt>
                    <dd>{formatCurrency(selectedApplication.simulation?.monthlyPayment)}</dd>
                  </div>
                  <div>
                    <dt>TAEG</dt>
                    <dd>{formatPercent(selectedApplication.simulation?.apr)}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3>Profils</h3>
                <dl className="detail-list">
                  <div>
                    <dt>Revenu mensuel</dt>
                    <dd>{formatCurrency(selectedApplication.monthlyIncome)}</dd>
                  </div>
                  <div>
                    <dt>Situation</dt>
                    <dd>{selectedApplication.employmentType?.label ?? selectedApplication.employmentTypeId}</dd>
                  </div>
                  <div>
                    <dt>Métier</dt>
                    <dd>{selectedApplication.job?.label ?? selectedApplication.jobId}</dd>
                  </div>
                  <div>
                    <dt>Commentaires</dt>
                    <dd>{selectedApplication.comment || '-'}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3>Historique du statut</h3>
                {(selectedApplication.statusHistory ?? []).length === 0 ? (
                  <p className="text-muted">Aucun changement enregistré.</p>
                ) : (
                  <ul className="history-list">
                    {(selectedApplication.statusHistory ?? []).map((entry) => (
                      <li key={`${entry.status}-${entry.changedAt}`}>
                        <strong>{formatStatus(entry.status)}</strong>
                        <span>{formatDate(entry.changedAt)}</span>
                        {entry.author && <span> - {entry.author}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3>Notes internes</h3>
                {(selectedApplication.notes ?? []).length === 0 ? (
                  <p className="text-muted">Aucune note pour le moment.</p>
                ) : (
                  <ul className="notes-list">
                    {(selectedApplication.notes ?? []).map((note) => (
                      <li key={note.id}>
                        <p>{note.content}</p>
                        <small>{note.author} - {formatDate(note.createdAt)}</small>
                      </li>
                    ))}
                  </ul>
                )}
                <NoteComposer onSubmit={(content) => handleAddNote(selectedApplication.id, content)} disabled={saving} />
              </section>

              <section className="detail-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => exportSimulationPdf({
                    simulation: selectedApplication.simulation,
                    application: selectedApplication,
                    settings,
                  })}
                  disabled={!selectedApplication.simulation}
                >
                  Export PDF
                </button>
                <div className="action-group">
                  <label htmlFor="status">Statut</label>
                  <select
                    id="status"
                    value={selectedApplication.status}
                    onChange={(event) => handleStatusChange(selectedApplication.id, event.target.value)}
                    disabled={saving}
                  >
                    {ADMIN_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={() => handlePriorityToggle(selectedApplication.id)}
                  disabled={saving}
                >
                  {selectedApplication.priority ? 'Retirer la priorité' : 'Marquer comme prioritaire'}
                </button>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteComposer({ onSubmit, disabled }) {
  const [value, setValue] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }
    onSubmit(value.trim());
    setValue('');
  };

  return (
    <form className="note-composer" onSubmit={handleSubmit}>
      <textarea
        placeholder="Ajouter une note interne"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={3}
        disabled={disabled}
      />
      <button type="submit" className="button" disabled={disabled || !value.trim()}>
        Ajouter la note
      </button>
    </form>
  );
}

export default AdminDashboardPage;
