import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportingApi } from '../api/reporting';
import { useAuth } from '../app/auth';
import Card from '../components/Card';
import Table from '../components/Table';
import type { DashboardOverview } from '../types';

const OverviewPage = () => {
  const { token } = useAuth();
  const [filter, setFilter] = useState('');

  const overviewQuery = useQuery({
    queryKey: ['overview'],
    queryFn: () => reportingApi.overview(token),
  });

  const items = overviewQuery.data ?? [];

  const filtered = useMemo(() => {
    if (!filter) return items;
    const needle = filter.toLowerCase();
    return items.filter((item) => {
      const process = item.processName?.toLowerCase() ?? '';
      return item.title.toLowerCase().includes(needle) || process.includes(needle);
    });
  }, [items, filter]);

  return (
    <div className="grid" style={{ gap: '24px' }}>
      <div className="section-title">
        <div>
          <p className="muted">Direction</p>
          <h1>Vue synthétique</h1>
        </div>
        <input
          type="search"
          placeholder="Filtrer par nom ou process"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', minWidth: '240px' }}
        />
      </div>

      <Card>
        {overviewQuery.isLoading && <p className="muted">Chargement...</p>}
        {overviewQuery.isError && <p className="error-text">Impossible de charger la vue synthétique.</p>}
        {filtered.length === 0 && !overviewQuery.isLoading && <p>Aucun tableau de bord à afficher.</p>}
        {filtered.length > 0 && (
          <Table headers={["Tableau", "Process", "KPIs", "Actions"]}>
            {filtered.map((item: DashboardOverview) => (
              <tr key={item.dashboardId}>
                <td>
                  <Link to={`/dashboards/${item.dashboardId}`} className="nav-link">
                    {item.title}
                  </Link>
                </td>
                <td>{item.processName ?? '-'}</td>
                <td>
                  <div className="chips">
                    <span className="pill">
                      <strong>Vert</strong> {item.statusBreakdown.GREEN}
                    </span>
                    <span className="pill">
                      <strong>Orange</strong> {item.statusBreakdown.ORANGE}
                    </span>
                    <span className="pill">
                      <strong>Rouge</strong> {item.statusBreakdown.RED}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="pill">
                    <strong>Actions ouvertes</strong> {item.openActions}
                  </span>
                  <span className="pill" style={{ marginLeft: '8px' }}>
                    <strong>En retard</strong> {item.overdueActions}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default OverviewPage;
