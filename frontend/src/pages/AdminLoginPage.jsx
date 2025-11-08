import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formValues, setFormValues] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const success = await login({ email: formValues.email, password: formValues.password });
      if (success) {
        const next = location.state?.from?.pathname ?? '/admin/dashboard';
        navigate(next, { replace: true });
      } else {
        setError('Identifiants invalides');
      }
    } catch (err) {
      setError('Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page shell">
      <section className="card form-card">
        <h1>Connexion administrateur</h1>
        <p className="text-muted">Accédez au tableau de bord pour traiter les demandes de crédit.</p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email professionnel</label>
            <input id="email" name="email" type="email" value={formValues.email} onChange={handleChange} required />
          </div>
          <div className="form-field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" value={formValues.password} onChange={handleChange} required />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AdminLoginPage;
