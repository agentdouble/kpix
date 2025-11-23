import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import { useAuth } from '../app/auth';
import { dashboardsApi } from '../api/dashboards';
import { reportingApi } from '../api/reporting';
import type { Dashboard, DashboardOverview } from '../types';

const DashboardsListPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [processName, setProcessName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const dashboardsQuery = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => dashboardsApi.list(token),
  });

  const overviewQuery = useQuery({
    queryKey: ['reporting-overview'],
    queryFn: () => reportingApi.overview(token),
  });

  const createMutation = useMutation({
    mutationFn: () => dashboardsApi.create({ title, processName, description }, token),
    onSuccess: () => {
      setTitle('');
      setProcessName('');
      setDescription('');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['reporting-overview'] });
    },
  });

  useEffect(() => {
    if (isCreateOpen && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isCreateOpen]);

  const dashboards = dashboardsQuery.data ?? [];
  const overviewById =
    overviewQuery.data?.reduce<Record<string, DashboardOverview>>((acc, item) => {
      acc[item.dashboardId] = item;
      return acc;
    }, {}) ?? {};

  return (
    <div className="grid" style={{ gap: '24px' }}>
      <div className="section-title">
        <div>
          <p className="muted">Pilotage</p>
          <h1>Tableaux de bord</h1>
        </div>
        <Button onClick={() => setIsCreateOpen((prev) => !prev)}>
          {isCreateOpen ? 'Fermer le panneau' : 'Créer un tableau de bord'}
        </Button>
      </div>

      {isCreateOpen && (
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
              <input
                id="title"
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="process">Process</label>
              <input id="process" value={processName} onChange={(e) => setProcessName(e.target.value)} required />
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreateOpen(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
          {createMutation.isError && <p className="error-text">Impossible de créer le tableau de bord.</p>}
        </Card>
      )}

      <Card title="Liste">
        {dashboardsQuery.isLoading && <p className="muted">Chargement...</p>}
        {dashboardsQuery.isError && <p className="error-text">Erreur lors du chargement des tableaux.</p>}
        {!dashboardsQuery.isLoading && dashboards.length === 0 && <p>Aucun tableau de bord pour le moment.</p>}
        {dashboards.length > 0 && (
          <Table headers={["Titre", "Process", "KPIs", "Actions", "Ouvrir"]}>
            {dashboards.map((dashboard: Dashboard) => {
              const overview = overviewById[dashboard.id];
              return (
                <tr key={dashboard.id}>
                  <td>
                    <strong>{dashboard.title}</strong>
                  </td>
                  <td>{dashboard.processName ?? '-'}</td>
                  <td>
                    {overview ? (
                      <div className="chips">
                        <span className="pill">
                          <strong>Vert</strong> {overview.statusBreakdown.GREEN}
                        </span>
                        <span className="pill">
                          <strong>Orange</strong> {overview.statusBreakdown.ORANGE}
                        </span>
                        <span className="pill">
                          <strong>Rouge</strong> {overview.statusBreakdown.RED}
                        </span>
                      </div>
                    ) : (
                      <span className="muted">Statuts indisponibles</span>
                    )}
                  </td>
                  <td>
                    {overview ? (
                      <div className="chips">
                        <span className="pill">
                          <strong>Actions ouvertes</strong> {overview.openActions}
                        </span>
                        <span className="pill">
                          <strong>En retard</strong> {overview.overdueActions}
                        </span>
                      </div>
                    ) : (
                      <span className="muted">Actions indisponibles</span>
                    )}
                  </td>
                  <td>
                    <Link to={`/dashboards/${dashboard.id}`} className="nav-link">
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default DashboardsListPage;
