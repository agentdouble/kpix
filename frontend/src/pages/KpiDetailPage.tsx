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

  const [valueForm, setValueForm] = useState({ periodStart: '', periodEnd: '', value: '', comment: '' });
  const [actionForm, setActionForm] = useState({ title: '', description: '', dueDate: '' });
  const [commentForm, setCommentForm] = useState({ message: '' });

  const addValueMutation = useMutation({
    mutationFn: () =>
      kpiValuesApi.create(
        kpiId!,
        {
          periodStart: valueForm.periodStart,
          periodEnd: valueForm.periodEnd || undefined,
          value: Number(valueForm.value),
          comment: valueForm.comment || undefined,
        },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-values', kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi', kpiId] });
      setValueForm({ periodStart: '', periodEnd: '', value: '', comment: '' });
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
  const chartValues = useMemo(() => values.slice(0, 8), [values]);
  const chartValuesChrono = useMemo(
    () =>
      [...chartValues].sort((a, b) => {
        if (!a.periodStart || !b.periodStart) return 0;
        return a.periodStart.localeCompare(b.periodStart);
      }),
    [chartValues],
  );
  const maxValue = useMemo(
    () => (chartValuesChrono.length > 0 ? Math.max(...chartValuesChrono.map((v) => v.value)) : 1),
    [chartValuesChrono],
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

      <Card title="Graphique d'évolution">
        {chartValuesChrono.length === 0 && <p className="muted">Pas encore de valeurs.</p>}
        {chartValuesChrono.length > 0 && (
          <div style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="150">
              <line x1="0" y1="100" x2="100" y2="100" stroke="#d0d0d0" strokeWidth="1" />
              {(() => {
                const points = chartValuesChrono.map((value, index) => {
                  const x = chartValuesChrono.length === 1 ? 50 : (index / (chartValuesChrono.length - 1)) * 100;
                  const y = 100 - (value.value / maxValue) * 100;
                  return { x, y, value };
                });
                const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
                return (
                  <>
                    <polyline
                      points={polylinePoints}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {points.map((p) => (
                      <circle key={p.value.id} cx={p.x} cy={p.y} r={1.8} fill="#000000" />
                    ))}
                  </>
                );
              })()}
            </svg>
            <div style={{ display: 'flex', gap: '12px' }}>
              {chartValuesChrono.map((value) => (
                <div key={value.id} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700 }}>{value.value}</div>
                  <p className="muted" style={{ marginTop: '4px', fontSize: '13px' }}>
                    {formatPeriod(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="grid two-columns" style={{ gap: '20px' }}>
        <Card title="Historique des valeurs">
          {valuesQuery.isLoading && <p className="muted">Chargement...</p>}
          {values.length === 0 && !valuesQuery.isLoading && <p>Aucune valeur enregistrée.</p>}
          {values.length > 0 && (
            <Table headers={["Période", "Valeur", "Statut", "Commentaire"]}>
              {values.map((value) => (
                <tr key={value.id}>
                  <td>{formatPeriod(value)}</td>
                  <td>
                    {value.value} {kpi.unit}
                  </td>
                  <td>
                    <BadgeStatus status={value.status} />
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
              <label htmlFor="period-start">Début de période</label>
              <input
                id="period-start"
                type="date"
                value={valueForm.periodStart}
                onChange={(e) => setValueForm((prev) => ({ ...prev, periodStart: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="period-end">Fin de période (optionnel)</label>
              <input
                id="period-end"
                type="date"
                value={valueForm.periodEnd}
                onChange={(e) => setValueForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
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
              {addValueMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
            {addValueMutation.isError && <p className="error-text">Impossible d'enregistrer la valeur.</p>}
          </form>
        </Card>
      </div>

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
          <form
            className="grid"
            style={{ gap: '12px', marginTop: '12px' }}
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

        <Card title="Commentaires">
          {commentsQuery.isLoading && <p className="muted">Chargement...</p>}
          {commentsQuery.data?.length === 0 && !commentsQuery.isLoading && <p>Aucun commentaire.</p>}
          {commentsQuery.data?.length ? (
            <ul className="grid" style={{ gap: '10px' }}>
              {commentsQuery.data.map((comment: Comment) => (
                <li key={comment.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <div className="section-title" style={{ marginBottom: '4px' }}>
                    <strong>{comment.authorId ? `Auteur ${comment.authorId.slice(0, 8)}` : 'Auteur inconnu'}</strong>
                    <span className="muted" style={{ fontSize: '13px' }}>
                      {new Date(comment.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p>{comment.content}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="grid"
            style={{ gap: '12px', marginTop: '12px' }}
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
    </div>
  );
};

export default KpiDetailPage;
