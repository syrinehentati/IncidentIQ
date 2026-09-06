import Plot from './Plot';
import Card from './Card';
import { Ticket } from '../../types';


const layoutBase = {
  margin: { t: 10, r: 10, b: 40, l: 40 },
  height: 260,
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { family: 'inherit', size: 12, color: '#64748b' },
  showlegend: false,
};

const config = { displayModeBar: false, responsive: true };

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#0f172a' }}>{title}</h3>
      {children}
    </Card>
  );
}

export function CategoryChart({ tickets }: { tickets: Ticket[] }) {
  const counts: Record<string, number> = {};
  tickets.forEach((t) => {
    const c = t.analysis?.category || 'unknown';
    counts[c] = (counts[c] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <ChartCard title="Incidents by category">
      <Plot
        data={[{
          type: 'bar',
          x: sorted.map(([k]) => k),
          y: sorted.map(([, v]) => v),
          marker: { color: '#0f172a' },
        }]}
        layout={layoutBase}
        config={config}
        style={{ width: '100%' }}
      />
    </ChartCard>
  );
}

export function SeverityChart({ tickets }: { tickets: Ticket[] }) {
  const colors: Record<string, string> = {
    critical: '#be123c',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };

  const counts: Record<string, number> = {};
  tickets.forEach((t) => {
    const s = t.analysis?.severity || 'pending';
    counts[s] = (counts[s] || 0) + 1;
  });

  const labels = Object.keys(counts);

  return (
    <ChartCard title="Severity breakdown">
      <Plot
        data={[{
          type: 'pie',
          hole: 0.55,
          labels,
          values: labels.map((l) => counts[l]),
          marker: { colors: labels.map((l) => colors[l] || '#94a3b8') },
          textinfo: 'label+percent',
        }]}
        layout={{ ...layoutBase, margin: { t: 10, r: 10, b: 10, l: 10 } }}
        config={config}
        style={{ width: '100%' }}
      />
    </ChartCard>
  );
}

export function TimelineChart({ tickets }: { tickets: Ticket[] }) {
  const byDay: Record<string, number> = {};
  tickets.forEach((t) => {
    if (!t.analyzed_at) return;
    const day = new Date(t.analyzed_at).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });

  const days = Object.keys(byDay).sort();

  return (
    <ChartCard title="Incidents over time">
      <Plot
        data={[{
          type: 'scatter',
          mode: 'lines+markers',
          x: days,
          y: days.map((d) => byDay[d]),
          line: { color: '#2563eb', width: 2 },
          marker: { size: 6 },
        }]}
        layout={layoutBase}
        config={config}
        style={{ width: '100%' }}
      />
    </ChartCard>
  );
}


export function SimilarityChart({ tickets }: { tickets: Ticket[] }) {
  const scores = tickets.flatMap(
    (t) => t.analysis?.similar_tickets?.map((s) => s.similarity) ?? []
  );

  if (scores.length === 0) {
    return (
      <ChartCard title="Retrieval similarity scores">
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          No similar incidents retrieved yet. Add entries to the knowledge base first.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Retrieval similarity scores">
      <Plot
        data={[{
          type: 'histogram',
          x: scores,
          xbins: { start: 60, end: 100, size: 5 },
          marker: { color: '#2563eb' },
        }]}
        layout={{
          ...layoutBase,
          xaxis: { title: { text: 'Cosine similarity (%)' } },
          yaxis: { title: { text: 'Matches' } },
        }}
        config={config}
        style={{ width: '100%' }}
      />
    </ChartCard>
  );
}