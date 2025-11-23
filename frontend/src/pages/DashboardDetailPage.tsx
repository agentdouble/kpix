import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { dashboardsApi } from '../api/dashboards';
import { kpisApi } from '../api/kpis';
import { reportingApi } from '../api/reporting';
import { useAuth } from '../app/auth';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import type { DashboardOverview, Kpi, KpiDirection, KpiFrequency } from '../types';

const directionLabel: Record<KpiDirection, string> = {
  UP_IS_BETTER: 'Plus haut = mieux',
  DOWN_IS_BETTER: 'Plus bas = mieux',
};

const frequencyLabel: Record<KpiFrequency, string> = {
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
};

const statusColor = (status: Kpi['latestStatus']) => {
  if (status === 'GREEN') return '#16a34a';
  if (status === 'ORANGE') return '#ea580c';
  if (status === 'RED') return '#dc2626';
  return undefined;
};

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

  const overviewQuery = useQuery({
    queryKey: ['reporting-overview'],
    queryFn: () => reportingApi.overview(token),
    enabled: Boolean(dashboardId),
    staleTime: 5_000,
  });

  const dashboardOverview = useMemo<DashboardOverview | undefined>(
    () => overviewQuery.data?.find((item) => item.dashboardId === dashboardId),
    [overviewQuery.data, dashboardId],
  );

  const [newKpi, setNewKpi] = useState<{
    name: string;
    frequency: KpiFrequency;
    unit: string;
    direction: KpiDirection;
    thresholdGreen: string;
    thresholdOrange: string;
    thresholdRed: string;
  }>({
    name: '',
    frequency: 'MONTHLY',
    unit: '',
    direction: 'UP_IS_BETTER',
    thresholdGreen: '95',
    thresholdOrange: '90',
    thresholdRed: '80',
  });

  const addKpiMutation = useMutation({
    mutationFn: () => {
      if (!dashboardId) {
        throw new Error('Dashboard manquant');
      }
      return kpisApi.create(
        dashboardId,
        {
          name: newKpi.name,
          frequency: newKpi.frequency,
          unit: newKpi.unit || undefined,
          direction: newKpi.direction,
          thresholdGreen: Number(newKpi.thresholdGreen),
          thresholdOrange: Number(newKpi.thresholdOrange),
          thresholdRed: Number(newKpi.thresholdRed),
        },
        token,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis', dashboardId] });
      queryClient.invalidateQueries({ queryKey: ['reporting-overview'] });
      setNewKpi({
        name: '',
        frequency: 'MONTHLY',
        unit: '',
        direction: 'UP_IS_BETTER',
        thresholdGreen: '95',
        thresholdOrange: '90',
        thresholdRed: '80',
      });
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
          <p className="muted">{dashboard.processName ?? 'Process non renseigné'}</p>
          <h1>{dashboard.title}</h1>
          {dashboard.description && <p className="muted">{dashboard.description}</p>}
        </div>
        {dashboardOverview ? (
          <div className="chips">
            <span className="pill">
              <strong>Vert</strong> {dashboardOverview.statusBreakdown.GREEN}
            </span>
            <span className="pill">
              <strong>Orange</strong> {dashboardOverview.statusBreakdown.ORANGE}
            </span>
            <span className="pill">
              <strong>Rouge</strong> {dashboardOverview.statusBreakdown.RED}
            </span>
            <span className="pill">
              <strong>KPIs</strong> {dashboardOverview.totalKpis}
            </span>
          </div>
        ) : (
          <p className="muted">Statuts en cours de chargement...</p>
        )}
      </div>

      <Card title="KPIs" actions={<Button onClick={() => document.getElementById('new-kpi-name')?.focus()}>Ajouter un KPI</Button>}>
        {kpisQuery.isLoading && <p className="muted">Chargement...</p>}
        {kpisQuery.isError && <p className="error-text">Impossible de charger les KPIs.</p>}
        {kpis.length === 0 && !kpisQuery.isLoading && <p>Aucun KPI pour le moment.</p>}
        {kpis.length > 0 && (
          <Table headers={["Nom", "Fréquence", "Sens", "Valeur actuelle", "Actions"]}>
            {kpis.map((kpi: Kpi) => {
              const color = statusColor(kpi.latestStatus);
              const hasValue = kpi.latestValue != null;
              return (
                <tr key={kpi.id}>
                  <td>
                    <strong>{kpi.name}</strong>
                  </td>
                  <td>{frequencyLabel[kpi.frequency]}</td>
                  <td>{directionLabel[kpi.direction]}</td>
                  <td>
                    {hasValue ? (
                      <span style={{ color, fontWeight: 600 }}>
                        {kpi.latestValue}
                        {kpi.unit ? ` ${kpi.unit}` : ''}
                      </span>
                    ) : (
                      <span className="muted">Pas de valeur</span>
                    )}
                  </td>
                  <td>
                    <Link to={`/kpis/${kpi.id}`} className="nav-link">
                      Voir
                    </Link>
                  </td>
                </tr>
              );
            })}
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
              onChange={(e) => setNewKpi((prev) => ({ ...prev, frequency: e.target.value as KpiFrequency }))}
            >
              <option value="DAILY">Quotidien</option>
              <option value="WEEKLY">Hebdomadaire</option>
              <option value="MONTHLY">Mensuel</option>
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
            <label htmlFor="new-kpi-direction">Sens de variation</label>
            <select
              id="new-kpi-direction"
              value={newKpi.direction}
              onChange={(e) => setNewKpi((prev) => ({ ...prev, direction: e.target.value as KpiDirection }))}
            >
              <option value="UP_IS_BETTER">Plus haut = mieux</option>
              <option value="DOWN_IS_BETTER">Plus bas = mieux</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="new-kpi-green">Seuil vert</label>
            <input
              id="new-kpi-green"
              type="number"
              step="any"
              value={newKpi.thresholdGreen}
              onChange={(e) => setNewKpi((prev) => ({ ...prev, thresholdGreen: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-kpi-orange">Seuil orange</label>
            <input
              id="new-kpi-orange"
              type="number"
              step="any"
              value={newKpi.thresholdOrange}
              onChange={(e) => setNewKpi((prev) => ({ ...prev, thresholdOrange: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-kpi-red">Seuil rouge</label>
            <input
              id="new-kpi-red"
              type="number"
              step="any"
              value={newKpi.thresholdRed}
              onChange={(e) => setNewKpi((prev) => ({ ...prev, thresholdRed: e.target.value }))}
              required
            />
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
