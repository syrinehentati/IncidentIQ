import React, { useMemo } from 'react';
import { useDashboardStats } from '../hooks/useDashboard';
import { Ticket } from '../types';
import { CategoryChart, SeverityChart, SimilarityChart, TimelineChart } from '../components/ui/charts';
function Badge({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 16,
        borderRadius: 12,
        background: '#ffffff',
        border: '1px solid #e5e7eb',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{label}</p>
      <h2 style={{ margin: '6px 0 0', fontSize: 20 }}>{value}</h2>
    </div>
  );
}

export default function DashboardPage() {
 const { tickets, kbCount, isLoading } = useDashboardStats();
  const stats = useMemo(() => {
    const total = tickets.length;
    const critical = tickets.filter(
      (t: Ticket) => t.analysis?.severity === 'critical'
    ).length;

    const categories: Record<string, number> = {};
    tickets.forEach((t:Ticket) => {
      const c = t.analysis?.category || 'unknown';
      categories[c] = (categories[c] || 0) + 1;
    });

    const topCategory =
      Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { total, critical, topCategory };
  }, [tickets]);

if (isLoading) return (
  <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>
    Loading dashboard...
  </p>
);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI ROW */}
      <div style={{ display: 'flex', gap: 16 }}>
        <Badge label="Total Incidents" value={stats.total} />
        <Badge label="Critical Issues" value={stats.critical} />
        <Badge label="Knowledge Base" value={kbCount} />
        <Badge label="Top Category" value={stats.topCategory} />
      </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <CategoryChart tickets={tickets} />
        <SeverityChart tickets={tickets} />
        <TimelineChart tickets={tickets} />
        <SimilarityChart tickets={tickets} />
      </div>
      <TimelineChart tickets={tickets} />
      {/* INSIGHT PANEL */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ marginTop: 0 }}>System Insights</h3>

        <p style={{ color: '#64748b' }}>
          • AI is currently analyzing multilingual incidents
          <br />
          • Knowledge base improves future predictions
          <br />• Critical incidents require immediate attention
        </p>
      </div>

      {/* RECENT TICKETS */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Recent Activity</h3>

        {tickets.slice(0, 5).map((t: Ticket) => (
          <div
            key={t.ticket_id}
            style={{
              padding: 10,
              borderBottom: '1px solid #f1f5f9',
              fontSize: 13,
            }}
          >
            <b>{t.ticket_id}</b> — {t.title}
            <span style={{ float: 'right', color: '#64748b' }}>
              {t.analysis?.severity || 'pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
