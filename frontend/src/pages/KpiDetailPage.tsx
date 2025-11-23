import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { actionsApi } from '../api/actions';
import { commentsApi } from '../api/comments';
import { kpisApi } from '../api/kpis';
import { kpiValuesApi } from '../api/kpiValues';
import { usersApi } from '../api/users';
import { useAuth } from '../app/auth';
import BadgeStatus from '../components/BadgeStatus';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import type { ActionItem, Comment, KpiValue } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip, Filler);

const frequencyLabel = {
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
} as const;

const directionLabel = {
  UP_IS_BETTER: 'Plus haut = mieux',
  DOWN_IS_BETTER: 'Plus bas = mieux',
} as const;

const actionStatusLabel = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminé',
  CANCELLED: 'Annulé',
} as const;

const statusColor = (status: KpiValue['status']) => {
  if (status === 'GREEN') return '#16a34a';
  if (status === 'ORANGE') return '#ea580c';
  return '#dc2626';
};

const formatPeriod = (value: KpiValue) => {
  if (value.periodStart === value.periodEnd) {
    return value.periodStart;
  }
  return `${value.periodStart} → ${value.periodEnd}`;
};

const KpiDetailPage = () => {
  const { kpiId } = useParams<{ kpiId: string }>();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const kpiQuery = useQuery({
    queryKey: ['kpi', kpiId],
    queryFn: () => kpisApi.get(kpiId!, token),
    enabled: Boolean(kpiId),
  });

  const valuesQuery = useQuery({
    queryKey: ['kpi-values', kpiId],
    queryFn: () => kpiValuesApi.list(kpiId!, token),
    enabled: Boolean(kpiId),
  });

  const actionsQuery = useQuery({
    queryKey: ['kpi-actions', kpiId],
    queryFn: () => actionsApi.list(kpiId!, token),
    enabled: Boolean(kpiId),
  });

  const commentsQuery = useQuery({
    queryKey: ['kpi-comments', kpiId],
    queryFn: () => commentsApi.listForKpi(kpiId!, token),
    enabled: Boolean(kpiId),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'members'],
    queryFn: () => usersApi.listMembers(token),
    enabled: Boolean(token),
  });

  const [valueForm, setValueForm] = useState({ periodStart: '', value: '', comment: '' });
  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    ownerId: '',
    progress: '0',
    status: 'OPEN' as ActionItem['status'],
  });
  const [commentForm, setCommentForm] = useState({ message: '' });
  const [activeTab, setActiveTab] = useState<'value' | 'action' | 'comment'>('value');
  const [editActionId, setEditActionId] = useState<string | null>(null);
  const [editActionForm, setEditActionForm] = useState<{
    ownerId: string;
    dueDate: string;
    progress: string;
    status: ActionItem['status'];
  }>({
    ownerId: '',
    dueDate: '',
    progress: '',
    status: 'OPEN',
  });

  const addValueMutation = useMutation({
    mutationFn: () =>
      kpiValuesApi.create(
        kpiId!,
        {
          periodStart: valueForm.periodStart,
          value: Number(valueForm.value),
          comment: valueForm.comment || undefined,
        },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-values', kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi', kpiId] });
      setValueForm({ periodStart: '', value: '', comment: '' });
    },
  });

  const addActionMutation = useMutation({
    mutationFn: () =>
      actionsApi.create(
        kpiId!,
        {
          title: actionForm.title,
          description: actionForm.description || undefined,
          dueDate: actionForm.dueDate || undefined,
          ownerId: actionForm.ownerId || undefined,
          progress: Number(actionForm.progress) || 0,
          status: actionForm.status,
        },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-actions', kpiId] });
      setActionForm({
        title: '',
        description: '',
        dueDate: '',
        ownerId: '',
        progress: '0',
        status: 'OPEN',
      });
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: (params: {
      actionId: string;
      updates: {
        ownerId?: string | null;
        dueDate?: string | null;
        progress?: number;
        status?: ActionItem['status'];
      };
    }) => actionsApi.update(params.actionId, params.updates, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-actions', kpiId] });
      setEditActionId(null);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: () => commentsApi.createForKpi(kpiId!, { content: commentForm.message }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-comments', kpiId] });
      setCommentForm({ message: '' });
    },
  });

  const values = valuesQuery.data ?? [];
  const actions = actionsQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const [chartRange, setChartRange] = useState<'3M' | '6M' | '1Y' | 'ALL'>('6M');
  const [showThresholds, setShowThresholds] = useState(false);

  const chartValues = useMemo(() => {
    if (values.length === 0) {
      return [];
    }
    if (chartRange === 'ALL') {
      return values;
    }
    const latest = values[0];
    const latestDate = new Date(latest.periodStart);
    if (Number.isNaN(latestDate.getTime())) {
      return values;
    }
    const months = chartRange === '3M' ? 3 : chartRange === '6M' ? 6 : 12;
    const minDate = new Date(latestDate);
    minDate.setMonth(minDate.getMonth() - months);
    return values.filter((value) => {
      const d = new Date(value.periodStart);
      if (Number.isNaN(d.getTime())) {
        return true;
      }
      return d >= minDate && d <= latestDate;
    });
  }, [values, chartRange]);
  const chartValuesChrono = useMemo(
    () =>
      [...chartValues].sort((a, b) => {
        if (!a.periodStart || !b.periodStart) return 0;
        return a.periodStart.localeCompare(b.periodStart);
      }),
    [chartValues],
  );
  const latestValue = values[0];

  if (kpiQuery.isLoading) {
    return <p className="muted">Chargement du KPI...</p>;
  }

  if (kpiQuery.isError || !kpiQuery.data) {
    return <p className="error-text">KPI introuvable.</p>;
  }

  const kpi = kpiQuery.data;

  return (
    <div className="grid" style={{ gap: '24px' }}>
      <div className="section-title">
        <div>
          <p className="muted">
            {frequencyLabel[kpi.frequency]} · {directionLabel[kpi.direction]}
          </p>
          <h1>{kpi.name}</h1>
          <p className="muted">
            Seuils : vert {kpi.thresholdGreen} · orange {kpi.thresholdOrange} · rouge {kpi.thresholdRed}
          </p>
          {kpi.unit && <p className="muted">Unité : {kpi.unit}</p>}
        </div>
        {latestValue ? <BadgeStatus status={latestValue.status} /> : <span className="pill">Pas de valeur récente</span>}
      </div>

      <Card
        title="Graphique d'évolution"
        actions={(
          <div className="chips">
            {(['3M', '6M', '1Y', 'ALL'] as const).map((range) => (
              <button
                key={range}
                type="button"
                className="pill"
                style={{
                  cursor: 'pointer',
                  background: chartRange === range ? '#000000' : '#ffffff',
                  color: chartRange === range ? '#ffffff' : 'var(--text-primary)',
                  borderColor: chartRange === range ? '#000000' : 'var(--border)',
                  fontSize: 12,
                  paddingInline: 10,
                }}
                onClick={() => setChartRange(range)}
              >
                {range === '3M' && '3 mois'}
                {range === '6M' && '6 mois'}
                {range === '1Y' && '12 mois'}
                {range === 'ALL' && 'Tout'}
              </button>
            ))}
          </div>
        )}
      >
        {chartValuesChrono.length === 0 && <p className="muted">Pas encore de valeurs.</p>}
        {chartValuesChrono.length > 0 && (
          <div style={{ minHeight: '230px', display: 'grid', gap: '8px' }}>
            <div style={{ height: 180 }}>
              <Line
                data={(() => {
                  const labels = chartValuesChrono.map((v) => formatPeriod(v));
                  const data = chartValuesChrono.map((v) => v.value);
                  const pointBackgroundColor = chartValuesChrono.map((v) => statusColor(v.status));

                  const datasets: any[] = [
                    {
                      label: kpi.unit ? `Valeur (${kpi.unit})` : 'Valeur',
                      data,
                      borderColor: '#000000',
                      borderWidth: 1.6,
                      backgroundColor: 'rgba(0,0,0,0.04)',
                      pointBackgroundColor,
                      pointBorderColor: '#000000',
                      pointBorderWidth: 1,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                      tension: 0.3,
                      fill: true,
                    },
                  ];

                  if (showThresholds) {
                    datasets.push(
                      {
                        label: 'Seuil vert',
                        data: chartValuesChrono.map(() => kpi.thresholdGreen),
                        borderColor: '#16a34a',
                        borderWidth: 0.8,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false,
                      },
                      {
                        label: 'Seuil orange',
                        data: chartValuesChrono.map(() => kpi.thresholdOrange),
                        borderColor: '#ea580c',
                        borderWidth: 0.8,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false,
                      },
                      {
                        label: 'Seuil rouge',
                        data: chartValuesChrono.map(() => kpi.thresholdRed),
                        borderColor: '#dc2626',
                        borderWidth: 0.8,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false,
                      },
                    );
                  }

                  return { labels, datasets };
                })()}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      filter: (item) => item.datasetIndex === 0,
                      callbacks: {
                        title: (items) => {
                          const item = items[0];
                          const value = chartValuesChrono[item.dataIndex];
                          return formatPeriod(value);
                        },
                        label: (item) => {
                          const value = chartValuesChrono[item.dataIndex];
                          const base = kpi.unit ? `${value.value} ${kpi.unit}` : `${value.value}`;
                          return base;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: {
                        display: false,
                      },
                      ticks: {
                        color: '#555555',
                        maxRotation: 0,
                        autoSkip: true,
                      },
                      border: {
                        color: '#e5e5e5',
                      },
                    },
                    y: {
                      grid: {
                        color: '#f0f0f0',
                      },
                      ticks: {
                        color: '#555555',
                      },
                      border: {
                        color: '#e5e5e5',
                      },
                    },
                  },
                }}
              />
            </div>
            <div className="chips" style={{ fontSize: 12 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={showThresholds}
                  onChange={(e) => setShowThresholds(e.target.checked)}
                />
                Afficher les seuils
              </label>
            </div>
          </div>
        )}
      </Card>

      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className="pill"
            style={{
              cursor: 'pointer',
              background: activeTab === 'value' ? '#000000' : '#ffffff',
              color: activeTab === 'value' ? '#ffffff' : 'var(--text-primary)',
              borderColor: activeTab === 'value' ? '#000000' : 'var(--border)',
            }}
            onClick={() => setActiveTab('value')}
          >
            Valeurs
          </button>
          <button
            type="button"
            className="pill"
            style={{
              cursor: 'pointer',
              background: activeTab === 'action' ? '#000000' : '#ffffff',
              color: activeTab === 'action' ? '#ffffff' : 'var(--text-primary)',
              borderColor: activeTab === 'action' ? '#000000' : 'var(--border)',
            }}
            onClick={() => setActiveTab('action')}
          >
            Actions
          </button>
          <button
            type="button"
            className="pill"
            style={{
              cursor: 'pointer',
              background: activeTab === 'comment' ? '#000000' : '#ffffff',
              color: activeTab === 'comment' ? '#ffffff' : 'var(--text-primary)',
              borderColor: activeTab === 'comment' ? '#000000' : 'var(--border)',
            }}
            onClick={() => setActiveTab('comment')}
          >
            Commentaires
          </button>
        </div>

        {activeTab === 'value' && (
          <div className="grid two-columns" style={{ gap: '20px' }}>
            <Card title="Historique des valeurs">
              {valuesQuery.isLoading && <p className="muted">Chargement...</p>}
              {values.length === 0 && !valuesQuery.isLoading && <p>Aucune valeur enregistrée.</p>}
              {values.length > 0 && (
                <Table headers={["Période", "Valeur", "Commentaire"]}>
                  {values.map((value) => (
                    <tr key={value.id}>
                      <td>{formatPeriod(value)}</td>
                      <td style={{ color: statusColor(value.status), fontWeight: 600 }}>
                        {value.value} {kpi.unit}
                      </td>
                      <td>{value.comment ?? '-'}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>

            <Card title="Ajouter une valeur">
              <form
                className="grid"
                style={{ gap: '12px' }}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  addValueMutation.mutate();
                }}
              >
                <div className="field">
                  <label htmlFor="period-start">Date</label>
                  <input
                    id="period-start"
                    type="date"
                    value={valueForm.periodStart}
                    onChange={(e) => setValueForm((prev) => ({ ...prev, periodStart: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="value">Valeur</label>
                  <input
                    id="value"
                    type="number"
                    step="any"
                    value={valueForm.value}
                    onChange={(e) => setValueForm((prev) => ({ ...prev, value: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="comment">Commentaire</label>
                  <textarea
                    id="comment"
                    value={valueForm.comment}
                    onChange={(e) => setValueForm((prev) => ({ ...prev, comment: e.target.value }))}
                    placeholder="Note facultative"
                  />
                </div>
                <Button type="submit" disabled={addValueMutation.isPending}>
                  {addValueMutation.isPending ? 'Ajout...' : 'Ajouter la valeur'}
                </Button>
                {addValueMutation.isError && <p className="error-text">Impossible d'enregistrer la valeur.</p>}
              </form>
            </Card>
          </div>
        )}

        {activeTab === 'action' && (
          <div className="grid two-columns" style={{ gap: '20px' }}>
            <Card title="Plans d'action">
              {actionsQuery.isLoading && <p className="muted">Chargement...</p>}
              {actionsQuery.data?.length === 0 && !actionsQuery.isLoading && <p>Aucune action.</p>}
              {actionsQuery.data?.length ? (
                <ul className="grid" style={{ gap: '12px' }}>
                  {actionsQuery.data.map((action: ActionItem) => (
                    <li
                      key={action.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '12px',
                        background: '#fff',
                      }}
                    >
                      <div className="section-title" style={{ marginBottom: '6px' }}>
                        <strong>{action.title}</strong>
                        <span className="pill">
                          {action.status === 'DONE'
                            ? actionStatusLabel[action.status]
                            : `${action.progress}% · ${actionStatusLabel[action.status]}`}
                        </span>
                      </div>
                      {(() => {
                        const members = usersQuery.data ?? [];
                        const owner = members.find((member) => member.id === action.ownerId);
                        if (!owner) {
                          return null;
                        }
                        return (
                          <p className="muted" style={{ fontSize: '13px', marginBottom: '4px' }}>
                            Responsable : <strong>{owner.fullName}</strong>
                          </p>
                        );
                      })()}
                      {action.description && <p className="muted">{action.description}</p>}
                      {action.dueDate && <p className="muted">Échéance : {action.dueDate}</p>}
                      <button
                        type="button"
                        className="pill"
                        style={{ marginTop: '8px', cursor: 'pointer' }}
                        onClick={() => {
                          setEditActionId(action.id);
                          setEditActionForm({
                            ownerId: action.ownerId ?? '',
                            dueDate: action.dueDate ?? '',
                            progress: String(action.progress),
                            status: action.status,
                          });
                        }}
                      >
                        Mettre à jour
                      </button>
                      {editActionId === action.id && (
                        <form
                          className="grid"
                          style={{ gap: '8px', marginTop: '10px' }}
                          onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            updateActionMutation.mutate({
                              actionId: action.id,
                              updates: {
                                ownerId: editActionForm.ownerId || null,
                                dueDate: editActionForm.dueDate || null,
                                progress:
                                  editActionForm.progress === '' ? undefined : Number(editActionForm.progress),
                                status: editActionForm.status,
                              },
                            });
                          }}
                        >
                          <div className="field">
                            <label htmlFor={`edit-owner-${action.id}`}>Responsable</label>
                            <select
                              id={`edit-owner-${action.id}`}
                              value={editActionForm.ownerId}
                              onChange={(e) =>
                                setEditActionForm((prev) => ({ ...prev, ownerId: e.target.value }))
                              }
                            >
                              <option value="">(inchangé)</option>
                              {(usersQuery.data ?? []).map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`edit-due-${action.id}`}>Échéance</label>
                            <input
                              id={`edit-due-${action.id}`}
                              type="date"
                              value={editActionForm.dueDate}
                              onChange={(e) =>
                                setEditActionForm((prev) => ({ ...prev, dueDate: e.target.value }))
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`edit-progress-${action.id}`}>Avancement (%)</label>
                            <input
                              id={`edit-progress-${action.id}`}
                              type="number"
                              min={0}
                              max={100}
                              value={editActionForm.progress}
                              onChange={(e) =>
                                setEditActionForm((prev) => ({ ...prev, progress: e.target.value }))
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`edit-status-${action.id}`}>Statut</label>
                            <select
                              id={`edit-status-${action.id}`}
                              value={editActionForm.status}
                              onChange={(e) =>
                                setEditActionForm((prev) => ({
                                  ...prev,
                                  status: e.target.value as ActionItem['status'],
                                }))
                              }
                            >
                              <option value="OPEN">{actionStatusLabel.OPEN}</option>
                              <option value="IN_PROGRESS">{actionStatusLabel.IN_PROGRESS}</option>
                              <option value="DONE">{actionStatusLabel.DONE}</option>
                              <option value="CANCELLED">{actionStatusLabel.CANCELLED}</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <Button type="submit" disabled={updateActionMutation.isPending}>
                              {updateActionMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                            </Button>
                            <button
                              type="button"
                              className="button ghost"
                              onClick={() => setEditActionId(null)}
                            >
                              Annuler
                            </button>
                          </div>
                          {updateActionMutation.isError && (
                            <p className="error-text">Impossible de mettre à jour l&apos;action.</p>
                          )}
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            <Card title="Ajouter une action">
              <form
                className="grid"
                style={{ gap: '12px' }}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  addActionMutation.mutate();
                }}
              >
                <div className="field">
                  <label htmlFor="action-title">Titre</label>
                  <input
                    id="action-title"
                    value={actionForm.title}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="action-description">Description</label>
                  <textarea
                    id="action-description"
                    value={actionForm.description}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="action-owner">Responsable</label>
                  <select
                    id="action-owner"
                    value={actionForm.ownerId}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, ownerId: e.target.value }))}
                  >
                    <option value="">Moi</option>
                    {(usersQuery.data ?? []).map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName}
                      </option>
                    ))}
                  </select>
                  {usersQuery.isError && (
                    <p className="error-text">Impossible de charger les membres pour l&apos;assignation.</p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="action-due">Échéance</label>
                  <input
                    id="action-due"
                    type="date"
                    value={actionForm.dueDate}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="action-progress">Avancement (%)</label>
                  <input
                    id="action-progress"
                    type="number"
                    min={0}
                    max={100}
                    value={actionForm.progress}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, progress: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="action-status">Statut</label>
                  <select
                    id="action-status"
                    value={actionForm.status}
                    onChange={(e) =>
                      setActionForm((prev) => ({ ...prev, status: e.target.value as ActionItem['status'] }))
                    }
                  >
                    <option value="OPEN">{actionStatusLabel.OPEN}</option>
                    <option value="IN_PROGRESS">{actionStatusLabel.IN_PROGRESS}</option>
                    <option value="DONE">{actionStatusLabel.DONE}</option>
                    <option value="CANCELLED">{actionStatusLabel.CANCELLED}</option>
                  </select>
                </div>
                <Button type="submit" disabled={addActionMutation.isPending}>
                  {addActionMutation.isPending ? 'Ajout...' : 'Créer une action'}
                </Button>
                {addActionMutation.isError && <p className="error-text">Impossible de créer l'action.</p>}
              </form>
            </Card>
          </div>
        )}

        {activeTab === 'comment' && (
          <div className="grid two-columns" style={{ gap: '20px' }}>
            <Card title="Commentaires">
              {commentsQuery.isLoading && <p className="muted">Chargement...</p>}
              {commentsQuery.data?.length === 0 && !commentsQuery.isLoading && <p>Aucun commentaire.</p>}
              {commentsQuery.data?.length ? (
                <ul className="grid" style={{ gap: '10px' }}>
                  {commentsQuery.data.map((comment: Comment) => (
                    <li key={comment.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                      <div className="section-title" style={{ marginBottom: '4px' }}>
                        <strong>
                          {comment.authorId ? `Auteur ${comment.authorId.slice(0, 8)}` : 'Auteur inconnu'}
                        </strong>
                        <span className="muted" style={{ fontSize: '13px' }}>
                          {new Date(comment.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p>{comment.content}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            <Card title="Ajouter un commentaire">
              <form
                className="grid"
                style={{ gap: '12px' }}
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  addCommentMutation.mutate();
                }}
              >
                {user && (
                  <div className="muted">
                    Posté en tant que <strong>{user.fullName}</strong>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="comment-message">Message</label>
                  <textarea
                    id="comment-message"
                    value={commentForm.message}
                    onChange={(e) => setCommentForm((prev) => ({ ...prev, message: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" disabled={addCommentMutation.isPending}>
                  {addCommentMutation.isPending ? 'Ajout...' : 'Ajouter un commentaire'}
                </Button>
                {addCommentMutation.isError && <p className="error-text">Impossible d'ajouter le commentaire.</p>}
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiDetailPage;
