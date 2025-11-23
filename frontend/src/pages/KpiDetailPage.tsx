import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { actionsApi } from '../api/actions';
import { commentsApi } from '../api/comments';
import { kpisApi } from '../api/kpis';
import { kpiValuesApi } from '../api/kpiValues';
import { useAuth } from '../app/auth';
import BadgeStatus from '../components/BadgeStatus';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import type { ActionItem, Comment, KpiValue } from '../types';

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

  const [valueForm, setValueForm] = useState({ periodStart: '', value: '', comment: '' });
  const [actionForm, setActionForm] = useState({ title: '', description: '', dueDate: '' });
  const [commentForm, setCommentForm] = useState({ message: '' });
  const [activeTab, setActiveTab] = useState<'value' | 'action' | 'comment'>('value');

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
      actionsApi.create(kpiId!, {
        title: actionForm.title,
        description: actionForm.description || undefined,
        dueDate: actionForm.dueDate || undefined,
      }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-actions', kpiId] });
      setActionForm({ title: '', description: '', dueDate: '' });
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
  const chartValues = useMemo(() => values.slice(0, 8), [values]);
  const chartValuesChrono = useMemo(
    () =>
      [...chartValues].sort((a, b) => {
        if (!a.periodStart || !b.periodStart) return 0;
        return a.periodStart.localeCompare(b.periodStart);
      }),
    [chartValues],
  );
  const valueRange = useMemo(() => {
    if (chartValuesChrono.length === 0) {
      return { min: 0, max: 1 };
    }
    const vals = chartValuesChrono.map((v) => v.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) {
      const base = min === 0 ? 0 : min - 1;
      return { min: base, max: max + 1 };
    }
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [chartValuesChrono]);
  const latestValue = values[0];
  const [hoveredValueId, setHoveredValueId] = useState<string | null>(null);

  const getEventCountsForPeriod = (periodStart: string, periodEnd: string) => {
    if (!periodStart || !periodEnd) {
      return { actionsCount: 0, commentsCount: 0 };
    }

    const isWithin = (dateString: string) => {
      if (!dateString) return false;
      const day = dateString.slice(0, 10);
      return day >= periodStart && day <= periodEnd;
    };

    let actionsCount = 0;
    let commentsCount = 0;

    for (const action of actions) {
      if (isWithin(action.createdAt)) {
        actionsCount += 1;
      }
    }

    for (const comment of comments) {
      if (comment.kpiId === kpiId && isWithin(comment.createdAt)) {
        commentsCount += 1;
      }
    }

    return { actionsCount, commentsCount };
  };

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

      <Card title="Graphique d'évolution">
        {chartValuesChrono.length === 0 && <p className="muted">Pas encore de valeurs.</p>}
        {chartValuesChrono.length > 0 && (
          <div style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="150">
              {(() => {
                const paddingX = 6;
                const paddingTop = 10;
                const paddingBottom = 18;
                const chartWidth = 100 - paddingX * 2;
                const chartHeight = 100 - paddingTop - paddingBottom;
                const { min, max } = valueRange;
                const range = max - min || 1;

                const points = chartValuesChrono.map((value, index) => {
                  const t = chartValuesChrono.length === 1 ? 0.5 : index / (chartValuesChrono.length - 1);
                  const x = paddingX + t * chartWidth;
                  const normalized = (value.value - min) / range;
                  const y = paddingTop + (1 - normalized) * chartHeight;
                  const { actionsCount, commentsCount } = getEventCountsForPeriod(
                    value.periodStart,
                    value.periodEnd,
                  );
                  return { x, y, value, actionsCount, commentsCount };
                });

                if (points.length === 0) {
                  return null;
                }

                const baselineY = paddingTop + chartHeight;
                const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

                const areaPath = [
                  `M ${points[0].x} ${baselineY}`,
                  ...points.map((p) => `L ${p.x} ${p.y}`),
                  `L ${points[points.length - 1].x} ${baselineY}`,
                  'Z',
                ].join(' ');

                return (
                  <>
                    {[0.25, 0.5, 0.75].map((ratio) => {
                      const y = paddingTop + chartHeight * ratio;
                      return (
                        <line
                          key={ratio}
                          x1={paddingX}
                          y1={y}
                          x2={100 - paddingX}
                          y2={y}
                          stroke="#e5e5e5"
                          strokeWidth="0.4"
                        />
                      );
                    })}
                    <line
                      x1={paddingX}
                      y1={baselineY}
                      x2={100 - paddingX}
                      y2={baselineY}
                      stroke="#d0d0d0"
                      strokeWidth="0.6"
                    />
                    <path d={areaPath} fill="rgba(0,0,0,0.04)" stroke="none" />
                    <polyline
                      points={polylinePoints}
                      fill="none"
                      stroke="#111111"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {points.map((p) => (
                      <g key={p.value.id}>
                        {p.actionsCount + p.commentsCount > 0 && (
                          <rect
                            x={p.x - 1.6}
                            y={p.y + 3}
                            width={3.2}
                            height={1.4}
                            fill="#000000"
                            rx={0.7}
                          />
                        )}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={hoveredValueId === p.value.id ? 2.8 : 2}
                          fill={statusColor(p.value.status)}
                          stroke="#000000"
                          strokeWidth="0.4"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredValueId(p.value.id)}
                          onMouseLeave={() => setHoveredValueId(null)}
                        />
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
            {(() => {
              const baseValue =
                chartValuesChrono.find((value) => value.id === hoveredValueId) ??
                chartValuesChrono[chartValuesChrono.length - 1];

              if (!baseValue) {
                return null;
              }

              const { actionsCount, commentsCount } = getEventCountsForPeriod(
                baseValue.periodStart,
                baseValue.periodEnd,
              );

              return (
                <div className="muted" style={{ fontSize: '13px' }}>
                  <strong>{baseValue.value}</strong> {kpi.unit ?? ''} · {formatPeriod(baseValue)}
                  {(actionsCount > 0 || commentsCount > 0) && (
                    <>
                      {' '}
                      ·{' '}
                      {actionsCount > 0
                        ? `${actionsCount} action${actionsCount > 1 ? 's' : ''}`
                        : '0 action'}
                      {' · '}
                      {commentsCount > 0
                        ? `${commentsCount} commentaire${commentsCount > 1 ? 's' : ''}`
                        : '0 commentaire'}
                    </>
                  )}
                </div>
              );
            })()}
            <div style={{ display: 'flex', gap: '12px' }}>
              {chartValuesChrono.map((value) => (
                <div key={value.id} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: statusColor(value.status) }}>{value.value}</div>
                  <p className="muted" style={{ marginTop: '4px', fontSize: '13px' }}>
                    {formatPeriod(value)}
                  </p>
                  {(() => {
                    const { actionsCount, commentsCount } = getEventCountsForPeriod(
                      value.periodStart,
                      value.periodEnd,
                    );
                    const hasEvents = actionsCount > 0 || commentsCount > 0;

                    if (!hasEvents) {
                      return null;
                    }

                    return (
                      <p className="muted" style={{ marginTop: '2px', fontSize: '12px' }}>
                        {actionsCount > 0
                          ? `${actionsCount} action${actionsCount > 1 ? 's' : ''}`
                          : '0 action'}
                        {' · '}
                        {commentsCount > 0
                          ? `${commentsCount} commentaire${commentsCount > 1 ? 's' : ''}`
                          : '0 commentaire'}
                      </p>
                    );
                  })()}
                </div>
              ))}
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
                          {action.progress}% · {actionStatusLabel[action.status]}
                        </span>
                      </div>
                      {action.description && <p className="muted">{action.description}</p>}
                      {action.dueDate && <p className="muted">Échéance : {action.dueDate}</p>}
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
                  <label htmlFor="action-due">Échéance</label>
                  <input
                    id="action-due"
                    type="date"
                    value={actionForm.dueDate}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
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
