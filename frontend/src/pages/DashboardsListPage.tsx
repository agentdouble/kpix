import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import { useAuth } from '../app/auth';
import { dashboardsApi } from '../api/dashboards';
import { reportingApi } from '../api/reporting';
import type { Dashboard, DashboardOverview, DirectionOverview } from '../types';

const DashboardsListPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [processName, setProcessName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'direction'>('list');
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const dashboardsQuery = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => dashboardsApi.list(token),
  });

  const overviewQuery = useQuery({
    queryKey: ['reporting-overview'],
    queryFn: () => reportingApi.overview(token),
  });

  const directionQuery = useQuery<DirectionOverview>({
    queryKey: ['reporting-direction'],
    queryFn: () => reportingApi.direction(token),
    enabled: activeTab === 'direction',
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant={activeTab === 'list' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('list')}
          >
            Liste
          </Button>
          <Button
            variant={activeTab === 'direction' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('direction')}
          >
            Direction
          </Button>
          {activeTab === 'list' && (
            <Button onClick={() => setIsCreateOpen((prev) => !prev)}>
              {isCreateOpen ? 'Fermer le panneau' : 'Créer un tableau de bord'}
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'list' && isCreateOpen && (
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

      {activeTab === 'list' && (
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
      )}

      {activeTab === 'direction' && (
        <>
          <Card title="Top 5 KPIs en rouge">
            {directionQuery.isLoading && <p className="muted">Chargement...</p>}
            {directionQuery.isError && <p className="error-text">Impossible de charger la vue direction.</p>}
            {directionQuery.data && directionQuery.data.topRedKpis.length === 0 && !directionQuery.isLoading && (
              <p>Aucun KPI en rouge pour le moment.</p>
            )}
            {directionQuery.data && directionQuery.data.topRedKpis.length > 0 && (
              <Table headers={["KPI", "Tableau de bord", "Dernière valeur", "Statut"]}>
                {directionQuery.data.topRedKpis.map((item) => (
                  <tr key={item.kpiId}>
                    <td>{item.name}</td>
                    <td>{item.dashboardTitle}</td>
                    <td>
                      {item.value ?? '-'} {item.periodEnd && <span className="muted">({item.periodEnd})</span>}
                    </td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>

          <Card title="Actions en retard">
            {directionQuery.isLoading && <p className="muted">Chargement...</p>}
            {directionQuery.isError && <p className="error-text">Impossible de charger les actions.</p>}
            {directionQuery.data && directionQuery.data.overdueActions.length === 0 && !directionQuery.isLoading && (
              <p>Aucune action en retard.</p>
            )}
            {directionQuery.data && directionQuery.data.overdueActions.length > 0 && (
              <Table headers={["Action", "KPI", "Tableau de bord", "Échéance", "Statut"]}>
                {directionQuery.data.overdueActions.map((action) => (
                  <tr key={action.actionId}>
                    <td>{action.title}</td>
                    <td>{action.kpiName}</td>
                    <td>{action.dashboardTitle}</td>
                    <td>{action.dueDate ?? '-'}</td>
                    <td>{action.status}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>

          <Card title="Dernières valeurs ajoutées">
            {directionQuery.isLoading && <p className="muted">Chargement...</p>}
            {directionQuery.isError && <p className="error-text">Impossible de charger les dernières valeurs.</p>}
            {directionQuery.data && directionQuery.data.latestValues.length === 0 && !directionQuery.isLoading && (
              <p>Aucune valeur récente.</p>
            )}
            {directionQuery.data && directionQuery.data.latestValues.length > 0 && (
              <Table headers={["KPI", "Tableau de bord", "Valeur", "Période"]}>
                {directionQuery.data.latestValues.map((item) => (
                  <tr key={`${item.kpiId}-${item.periodEnd}`}>
                    <td>{item.name}</td>
                    <td>{item.dashboardTitle}</td>
                    <td>{item.value ?? '-'}</td>
                    <td>{item.periodEnd ?? '-'}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>

          <Card title="KPIs en amélioration / en dégradation">
            {directionQuery.isLoading && <p className="muted">Chargement...</p>}
            {directionQuery.isError && <p className="error-text">Impossible de charger les tendances.</p>}
            {directionQuery.data && (
              <div className="grid two-columns" style={{ gap: '16px' }}>
                <div>
                  <h2>Top 3 en progression</h2>
                  {directionQuery.data.improvingKpis.length === 0 && <p>Aucune progression marquée.</p>}
                  {directionQuery.data.improvingKpis.length > 0 && (
                    <Table headers={["KPI", "Tableau de bord", "Δ normalisé"]}>
                      {directionQuery.data.improvingKpis.map((item) => (
                        <tr key={item.kpiId}>
                          <td>{item.name}</td>
                          <td>{item.dashboardTitle}</td>
                          <td>{item.deltaNormalized?.toFixed(2) ?? '-'}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </div>
                <div>
                  <h2>Top 3 en chute</h2>
                  {directionQuery.data.worseningKpis.length === 0 && <p>Aucune dégradation marquée.</p>}
                  {directionQuery.data.worseningKpis.length > 0 && (
                    <Table headers={["KPI", "Tableau de bord", "Δ normalisé"]}>
                      {directionQuery.data.worseningKpis.map((item) => (
                        <tr key={item.kpiId}>
                          <td>{item.name}</td>
                          <td>{item.dashboardTitle}</td>
                          <td>{item.deltaNormalized?.toFixed(2) ?? '-'}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card title="Actions critiques à échéance proche">
            {directionQuery.isLoading && <p className="muted">Chargement...</p>}
            {directionQuery.isError && <p className="error-text">Impossible de charger les actions proches de l’échéance.</p>}
            {directionQuery.data && (
              <div className="grid two-columns" style={{ gap: '16px' }}>
                <div>
                  <h2>Dans 48h</h2>
                  {directionQuery.data.upcomingActions48h.length === 0 && <p>Aucune action à échéance &lt;= 48h.</p>}
                  {directionQuery.data.upcomingActions48h.length > 0 && (
                    <Table headers={["Action", "KPI", "Tableau de bord", "Échéance"]}>
                      {directionQuery.data.upcomingActions48h.map((action) => (
                        <tr key={action.actionId}>
                          <td>{action.title}</td>
                          <td>{action.kpiName}</td>
                          <td>{action.dashboardTitle}</td>
                          <td>{action.dueDate ?? '-'}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </div>
                <div>
                  <h2>Dans 7 jours</h2>
                  {directionQuery.data.upcomingActions7d.length === 0 && <p>Aucune action à échéance &lt;= 7 jours.</p>}
                  {directionQuery.data.upcomingActions7d.length > 0 && (
                    <Table headers={["Action", "KPI", "Tableau de bord", "Échéance"]}>
                      {directionQuery.data.upcomingActions7d.map((action) => (
                        <tr key={action.actionId}>
                          <td>{action.title}</td>
                          <td>{action.kpiName}</td>
                          <td>{action.dashboardTitle}</td>
                          <td>{action.dueDate ?? '-'}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card title="KPIs stratégiques et actions clôturées">
            {directionQuery.isLoading && <p className="muted">Chargement...</p>}
            {directionQuery.isError && <p className="error-text">Impossible de charger les KPIs stratégiques et les actions clôturées.</p>}
            {directionQuery.data && (
              <div className="grid two-columns" style={{ gap: '16px' }}>
                <div>
                  <h2>KPIs stratégiques (tag “critical”)</h2>
                  {directionQuery.data.strategicKpis.length === 0 && <p>Aucun KPI stratégique défini.</p>}
                  {directionQuery.data.strategicKpis.length > 0 && (
                    <Table headers={["KPI", "Tableau de bord", "Dernière valeur"]}>
                      {directionQuery.data.strategicKpis.map((item) => (
                        <tr key={item.kpiId}>
                          <td>{item.name}</td>
                          <td>{item.dashboardTitle}</td>
                          <td>{item.value ?? '-'}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </div>
                <div>
                  <h2>Actions clôturées cette semaine</h2>
                  {directionQuery.data.closedActionsThisWeek.length === 0 && <p>Aucune action clôturée récemment.</p>}
                  {directionQuery.data.closedActionsThisWeek.length > 0 && (
                    <Table headers={["Action", "KPI", "Tableau de bord", "Mise à jour"]}>
                      {directionQuery.data.closedActionsThisWeek.map((action) => (
                        <tr key={action.actionId}>
                          <td>{action.title}</td>
                          <td>{action.kpiName}</td>
                          <td>{action.dashboardTitle}</td>
                          <td>{action.updatedAt}</td>
                        </tr>
                      ))}
                    </Table>
                  )}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default DashboardsListPage;
