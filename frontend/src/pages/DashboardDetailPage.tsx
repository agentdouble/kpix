import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { dashboardsApi } from '../api/dashboards';
import { kpisApi } from '../api/kpis';
import { useAuth } from '../app/auth';
import BadgeStatus from '../components/BadgeStatus';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import type { Kpi } from '../types';

const DashboardDetailPage = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => dashboardsApi.get(dashboardId!, token),
    enabled: Boolean(dashboardId),
  });

  const kpisQuery = useQuery({
    queryKey: ['kpis', dashboardId],
    queryFn: () => kpisApi.list(dashboardId!, token),
    enabled: Boolean(dashboardId),
  });

  const [newKpi, setNewKpi] = useState({ name: '', frequency: 'Mensuel', unit: '', target: '', direction: 'UP' });

  const addKpiMutation = useMutation({
    mutationFn: () =>
      kpisApi.create(
        dashboardId!,
        {
          name: newKpi.name,
          frequency: newKpi.frequency,
          unit: newKpi.unit,
          target: newKpi.target ? Number(newKpi.target) : undefined,
          direction: newKpi.direction as 'UP' | 'DOWN',
        },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis', dashboardId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
      setNewKpi({ name: '', frequency: 'Mensuel', unit: '', target: '', direction: 'UP' });
    },
  });

  if (dashboardQuery.isLoading) {
    return <p className="muted">Chargement du tableau de bord...</p>;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <p className="error-text">Tableau de bord introuvable.</p>;
  }

  const dashboard = dashboardQuery.data;
  const kpis = kpisQuery.data ?? [];

  return (
    <div className="grid" style={{ gap: '24px' }}>
      <div className="section-title">
        <div>
          <p className="muted">{dashboard.process}</p>
          <h1>{dashboard.title}</h1>
          {dashboard.description && <p className="muted">{dashboard.description}</p>}
        </div>
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
      </div>

      <Card title="KPIs" actions={<Button onClick={() => document.getElementById('new-kpi-name')?.focus()}>Ajouter un KPI</Button>}>
        {kpisQuery.isLoading && <p className="muted">Chargement...</p>}
        {kpisQuery.isError && <p className="error-text">Impossible de charger les KPIs.</p>}
        {kpis.length === 0 && !kpisQuery.isLoading && <p>Aucun KPI pour le moment.</p>}
        {kpis.length > 0 && (
          <Table headers={["Nom", "Dernière valeur", "Statut", "Fréquence", "Actions"]}>
            {kpis.map((kpi: Kpi) => (
              <tr key={kpi.id}>
                <td>
                  <strong>{kpi.name}</strong>
                </td>
                <td>{kpi.latestValue !== undefined ? `${kpi.latestValue} ${kpi.unit ?? ''}` : '-'}</td>
                <td>
                  <BadgeStatus status={kpi.status} />
                </td>
                <td>{kpi.frequency}</td>
                <td>
                  <Link to={`/kpis/${kpi.id}`} className="nav-link">
                    Voir
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Ajouter un KPI">
        <form
          className="grid two-columns"
          style={{ gap: '16px' }}
          onSubmit={(e) => {
            e.preventDefault();
            addKpiMutation.mutate();
          }}
        >
          <div className="field">
            <label htmlFor="new-kpi-name">Nom</label>
            <input
              id="new-kpi-name"
              value={newKpi.name}
              onChange={(e) => setNewKpi((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-kpi-frequency">Fréquence</label>
            <select
              id="new-kpi-frequency"
              value={newKpi.frequency}
              onChange={(e) => setNewKpi((prev) => ({ ...prev, frequency: e.target.value }))}
            >
              <option value="Hebdomadaire">Hebdomadaire</option>
              <option value="Mensuel">Mensuel</option>
              <option value="Trimestriel">Trimestriel</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="new-kpi-unit">Unité</label>
            <input
              id="new-kpi-unit"
              value={newKpi.unit}
              onChange={(e) => setNewKpi((prev) => ({ ...prev, unit: e.target.value }))}
              placeholder="%, jours, €..."
            />
          </div>
          <div className="field">
            <label htmlFor="new-kpi-target">Cible</label>
            <input
              id="new-kpi-target"
              value={newKpi.target}
              onChange={(e) => setNewKpi((prev) => ({ ...prev, target: e.target.value }))}
              type="number"
              step="any"
            />
          </div>
          <div className="field">
            <label htmlFor="new-kpi-direction">Sens de variation</label>
            <select
              id="new-kpi-direction"
              value={newKpi.direction}
              onChange={(e) => setNewKpi((prev) => ({ ...prev, direction: e.target.value }))}
            >
              <option value="UP">Plus haut = mieux</option>
              <option value="DOWN">Plus bas = mieux</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Button type="submit" disabled={addKpiMutation.isPending}>
              {addKpiMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
            {addKpiMutation.isError && <p className="error-text">Impossible d'ajouter le KPI.</p>}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default DashboardDetailPage;
