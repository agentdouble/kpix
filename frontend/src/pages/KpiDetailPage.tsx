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

const KpiDetailPage = () => {
  const { kpiId } = useParams<{ kpiId: string }>();
  const { token } = useAuth();
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

  const [valueForm, setValueForm] = useState({ period: '', value: '', status: 'GREEN' as KpiValue['status'] });
  const [actionForm, setActionForm] = useState({ title: '', owner: '', dueDate: '' });
  const [commentForm, setCommentForm] = useState({ author: '', message: '' });

  const addValueMutation = useMutation({
    mutationFn: () =>
      kpiValuesApi.create(
        kpiId!,
        { period: valueForm.period, value: Number(valueForm.value), status: valueForm.status },
        token,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-values', kpiId] });
      queryClient.invalidateQueries({ queryKey: ['kpi', kpiId] });
      setValueForm({ period: '', value: '', status: 'GREEN' });
    },
  });

  const addActionMutation = useMutation({
    mutationFn: () => actionsApi.create(kpiId!, actionForm, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-actions', kpiId] });
      setActionForm({ title: '', owner: '', dueDate: '' });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: () => commentsApi.createForKpi(kpiId!, commentForm, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-comments', kpiId] });
      setCommentForm({ author: '', message: '' });
    },
  });

  const values = valuesQuery.data ?? [];
  const chartValues = useMemo(() => values.slice(-8), [values]);
  const maxValue = useMemo(() => (chartValues.length > 0 ? Math.max(...chartValues.map((v) => v.value)) : 1), [chartValues]);

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
          <p className="muted">{kpi.frequency}</p>
          <h1>{kpi.name}</h1>
          <p className="muted">Cible : {kpi.target ?? '-'} {kpi.unit ?? ''}</p>
        </div>
        <BadgeStatus status={kpi.status} />
      </div>

      <Card title="Graphique d'évolution">
        {chartValues.length === 0 && <p className="muted">Pas encore de valeurs.</p>}
        {chartValues.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', minHeight: '160px' }}>
            {chartValues.map((value) => (
              <div key={value.id} style={{ flex: 1 }}>
                <div
                  style={{
                    height: `${(value.value / maxValue) * 140}px`,
                    background: '#000000',
                    borderRadius: '8px 8px 4px 4px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    color: '#ffffff',
                    padding: '6px',
                    fontWeight: 700,
                  }}
                  title={value.period}
                >
                  {value.value}
                </div>
                <p className="muted" style={{ marginTop: '8px', textAlign: 'center', fontSize: '13px' }}>
                  {value.period}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid two-columns" style={{ gap: '20px' }}>
        <Card title="Historique des valeurs">
          {valuesQuery.isLoading && <p className="muted">Chargement...</p>}
          {values.length === 0 && !valuesQuery.isLoading && <p>Aucune valeur enregistrée.</p>}
          {values.length > 0 && (
            <Table headers={["Période", "Valeur", "Statut"]}>
              {values.map((value) => (
                <tr key={value.id}>
                  <td>{value.period}</td>
                  <td>
                    {value.value} {kpi.unit}
                  </td>
                  <td>
                    <BadgeStatus status={value.status} />
                  </td>
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
              <label htmlFor="period">Période</label>
              <input
                id="period"
                value={valueForm.period}
                onChange={(e) => setValueForm((prev) => ({ ...prev, period: e.target.value }))}
                placeholder="2024-W49 ou 2024-12"
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
              <label htmlFor="status">Statut</label>
              <select
                id="status"
                value={valueForm.status}
                onChange={(e) => setValueForm((prev) => ({ ...prev, status: e.target.value as KpiValue['status'] }))}
              >
                <option value="GREEN">Vert</option>
                <option value="ORANGE">Orange</option>
                <option value="RED">Rouge</option>
              </select>
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
                      {action.progress}% · {action.status}
                    </span>
                  </div>
                  <p className="muted">Responsable : {action.owner}</p>
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
              <label htmlFor="action-owner">Responsable</label>
              <input
                id="action-owner"
                value={actionForm.owner}
                onChange={(e) => setActionForm((prev) => ({ ...prev, owner: e.target.value }))}
                required
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
                    <strong>{comment.author}</strong>
                    <span className="muted" style={{ fontSize: '13px' }}>
                      {new Date(comment.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p>{comment.message}</p>
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
            <div className="field">
              <label htmlFor="comment-author">Auteur</label>
              <input
                id="comment-author"
                value={commentForm.author}
                onChange={(e) => setCommentForm((prev) => ({ ...prev, author: e.target.value }))}
                required
              />
            </div>
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
