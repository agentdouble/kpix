import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { authApi } from '../api/auth';

const SignUpPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      await authApi.signup({ email, password, fullName, organizationName });
    },
    onSuccess: () =>
      navigate('/login', {
        replace: true,
        state: { signupMessage: 'Compte créé. Connectez-vous pour continuer.' },
      }),
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Impossible de créer le compte';
      setError(message);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="login-page">
      <Card title="Créer un compte">
        <form className="grid" style={{ gap: '16px', minWidth: '320px' }} onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="organization">Organisation</label>
            <input
              id="organization"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              autoComplete="organization"
            />
          </div>
          <div className="field">
            <label htmlFor="fullName">Nom complet</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Création...' : 'Créer un compte'}
          </Button>
          <div style={{ textAlign: 'center' }}>
            <Link to="/login">Déjà un compte ? Se connecter</Link>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SignUpPage;
