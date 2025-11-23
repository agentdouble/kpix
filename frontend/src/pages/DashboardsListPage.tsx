import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import { useAuth } from '../app/auth';
import { dashboardsApi } from '../api/dashboards';
import type { Dashboard } from '../types';

const DashboardsListPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [process, setProcess] = useState('');
  const [description, setDescription] = useState('');

  const dashboardsQuery = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => dashboardsApi.list(token),
  });

  const createMutation = useMutation({
    mutationFn: () => dashboardsApi.create({ title, process, description }, token),
    onSuccess: () => {
      setTitle('');
      setProcess('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    },
  });

  const dashboards = dashboardsQuery.data ?? [];

  return (
    <div className="grid" style={{ gap: '24px' }}>
      <div className="section-title">
        <div>
          <p className="muted">Pilotage</p>
          <h1>Tableaux de bord</h1>
        </div>
        <Button onClick={() => document.getElementById('title')?.focus()}>Créer un tableau de bord</Button>
      </div>

      <Card title="Ajouter un tableau de bord">
        <form
          className="grid two-columns"
          style={{ gap: '16px' }}
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div className="field">
            <label htmlFor="title">Titre</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="process">Process</label>
            <input id="process" value={process} onChange={(e) => setProcess(e.target.value)} required />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexte rapide"
            />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px' }}>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
        {createMutation.isError && <p className="error-text">Impossible de créer le tableau de bord.</p>}
      </Card>

      <Card title="Liste">
        {dashboardsQuery.isLoading && <p className="muted">Chargement...</p>}
        {dashboardsQuery.isError && <p className="error-text">Erreur lors du chargement des tableaux.</p>}
        {!dashboardsQuery.isLoading && dashboards.length === 0 && <p>Aucun tableau de bord pour le moment.</p>}
        {dashboards.length > 0 && (
          <Table headers={["Titre", "Process", "Statut global", "Actions"]}>
            {dashboards.map((dashboard: Dashboard) => (
              <tr key={dashboard.id}>
                <td>
                  <strong>{dashboard.title}</strong>
                </td>
                <td>{dashboard.process}</td>
                <td>
                  <div className="chips">
                    <span className="pill">
                      <strong>Vert</strong> {dashboard.stats.green}
                    </span>
                    <span className="pill">
                      <strong>Orange</strong> {dashboard.stats.orange}
                    </span>
                    <span className="pill">
                      <strong>Rouge</strong> {dashboard.stats.red}
                    </span>
                  </div>
                </td>
                <td>
                  <Link to={`/dashboards/${dashboard.id}`} className="nav-link">
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default DashboardsListPage;
