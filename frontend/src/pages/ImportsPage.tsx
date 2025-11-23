import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '../api/imports';
import type { ImportResult } from '../api/imports';
import { useAuth } from '../app/auth';
import Button from '../components/Button';
import Card from '../components/Card';
import Table from '../components/Table';
import type { ImportJob } from '../types';

const ImportsPage = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const jobsQuery = useQuery({
    queryKey: ['import-jobs'],
    queryFn: () => importsApi.listJobs(token),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) {
        throw new Error('Choisir un fichier');
      }
      setError(null);
      setResult(null);
      return importsApi.uploadKpiValues(file, token);
    },
    onSuccess: (res) => {
      setFile(null);
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Échec de l\'import';
      setError(message);
    },
  });

  const jobs = jobsQuery.data ?? [];

  return (
    <div className="grid" style={{ gap: '24px' }}>
      <div className="section-title">
        <div>
          <p className="muted">Données</p>
          <h1>Imports KPI</h1>
        </div>
      </div>

      <Card title="Importer un fichier">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            uploadMutation.mutate();
          }}
          className="grid"
          style={{ gap: '12px' }}
        >
          <input
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {error && <p className="error-text">{error}</p>}
          {result && (
            <p className="muted">
              Import lancé (job {result.job_id}) · lignes ingérées : {result.ingested} · erreurs : {result.failed}
            </p>
          )}
          <Button type="submit" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Import en cours...' : 'Lancer l\'import'}
          </Button>
        </form>
      </Card>

      <Card title="Historique des imports">
        {jobsQuery.isLoading && <p className="muted">Chargement...</p>}
        {jobs.length === 0 && !jobsQuery.isLoading && <p>Aucun import pour le moment.</p>}
        {jobs.length > 0 && (
          <Table headers={["Type", "Statut", "Créé le", "Mis à jour", "Erreur"]}>
            {jobs.map((job: ImportJob) => (
              <tr key={job.id}>
                <td>{job.type}</td>
                <td>{job.status}</td>
                <td>{new Date(job.createdAt).toLocaleString('fr-FR')}</td>
                <td>{new Date(job.updatedAt).toLocaleString('fr-FR')}</td>
                <td>{job.errorMessage ?? '-'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default ImportsPage;
