import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../app/auth';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      await login({ email, password });
    },
    onSuccess: () => navigate('/dashboards', { replace: true }),
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Impossible de se connecter';
      setError(message);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="login-page">
      <Card title="Connexion">
        <form className="grid" style={{ gap: '16px', minWidth: '320px' }} onSubmit={handleSubmit}>
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
              autoComplete="current-password"
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
