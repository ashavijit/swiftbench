import type { BenchResult, Reporter } from "../types.js";

/**
 * Generates HTML report with charts and styling
 * @param result - Benchmark result
 * @returns Complete HTML document
 */
function generateHtml(result: BenchResult): string {
  const errorRate = result.requests.total > 0
    ? ((result.requests.failed / result.requests.total) * 100).toFixed(2)
    : "0.00";
  
  const successRate = result.requests.total > 0
    ? ((result.requests.successful / result.requests.total) * 100).toFixed(1)
    : "100.0";

  const percentiles = [
    { label: "Min", value: result.latency.min, color: "#22c55e" },
    { label: "p50", value: result.latency.p50, color: "#3b82f6" },
    { label: "p75", value: result.latency.p75, color: "#8b5cf6" },
    { label: "p90", value: result.latency.p90, color: "#f59e0b" },
    { label: "p95", value: result.latency.p95, color: "#f97316" },
    { label: "p99", value: result.latency.p99, color: "#ef4444" },
    { label: "p99.9", value: result.latency.p999, color: "#dc2626" },
    { label: "Max", value: result.latency.max, color: "#991b1b" }
  ];

  const maxLatency = result.latency.max || 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SwiftBench Report - ${result.url}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --bg-card: #18181b;
      --bg-hover: #27272a;
      --border: #27272a;
      --border-subtle: #3f3f46;
      --text: #fafafa;
      --text-muted: #a1a1aa;
      --text-dim: #71717a;
      --primary: #3b82f6;
      --primary-glow: rgba(59, 130, 246, 0.15);
      --success: #22c55e;
      --success-glow: rgba(34, 197, 94, 0.15);
      --warning: #f59e0b;
      --error: #ef4444;
      --error-glow: rgba(239, 68, 68, 0.15);
      --purple: #8b5cf6;
      --gradient-1: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      --gradient-2: linear-gradient(135deg, #22c55e 0%, #3b82f6 100%);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem 0;
    }
    .logo {
      font-size: 2.5rem;
      font-weight: 700;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .subtitle .pill {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .stats-grid { grid-template-columns: 1fr; }
    }
    
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--gradient-1);
    }
    .stat-card.success::before { background: var(--success); }
    .stat-card.warning::before { background: var(--warning); }
    .stat-card.error::before { background: var(--error); }
    .stat-card.purple::before { background: var(--purple); }
    
    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-dim);
      margin-bottom: 0.5rem;
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      line-height: 1;
    }
    .stat-unit {
      font-size: 1rem;
      color: var(--text-muted);
      font-weight: 400;
      margin-left: 0.25rem;
    }
    .stat-subtext {
      font-size: 0.875rem;
      color: var(--text-dim);
      margin-top: 0.5rem;
    }
    
    /* Charts Section */
    .charts-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    @media (max-width: 1024px) {
      .charts-section { grid-template-columns: 1fr; }
    }
    
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
    }
    .card-badge {
      background: var(--bg-hover);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    /* Latency Distribution */
    .latency-bars {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .latency-row {
      display: grid;
      grid-template-columns: 60px 1fr 80px;
      align-items: center;
      gap: 1rem;
    }
    .latency-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .latency-bar-container {
      height: 24px;
      background: var(--bg);
      border-radius: 6px;
      overflow: hidden;
    }
    .latency-bar-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.5s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      min-width: 4px;
    }
    .latency-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: right;
    }
    
    /* Details Grid */
    .details-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    @media (max-width: 1024px) {
      .details-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .details-grid { grid-template-columns: 1fr; }
    }
    
    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }
    .detail-item:last-child { border-bottom: none; }
    .detail-label { color: var(--text-muted); }
    .detail-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 500;
    }
    
    /* Donut Chart */
    .donut-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .donut-legend {
      display: flex;
      gap: 1.5rem;
      margin-top: 1rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 2rem 0;
      border-top: 1px solid var(--border);
      color: var(--text-dim);
      font-size: 0.875rem;
    }
    .footer a {
      color: var(--primary);
      text-decoration: none;
    }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .stat-card, .card {
      animation: fadeIn 0.5s ease forwards;
    }
    .stat-card:nth-child(1) { animation-delay: 0.1s; }
    .stat-card:nth-child(2) { animation-delay: 0.2s; }
    .stat-card:nth-child(3) { animation-delay: 0.3s; }
    .stat-card:nth-child(4) { animation-delay: 0.4s; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1 class="logo">SwiftBench</h1>
      <p class="subtitle">
        <span class="pill">${result.method}</span>
        <span>${result.url}</span>
        <span class="pill">${result.duration}s</span>
        <span class="pill">${result.connections} connections</span>
      </p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Requests Per Second</div>
        <div class="stat-value">${Math.round(result.throughput.rps).toLocaleString()}<span class="stat-unit">req/s</span></div>
        <div class="stat-subtext">${result.requests.total.toLocaleString()} total requests</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">P99 Latency</div>
        <div class="stat-value">${result.latency.p99.toFixed(2)}<span class="stat-unit">ms</span></div>
        <div class="stat-subtext">99th percentile response time</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value">${successRate}<span class="stat-unit">%</span></div>
        <div class="stat-subtext">${result.requests.successful.toLocaleString()} successful</div>
      </div>
      <div class="stat-card ${parseFloat(errorRate) > 1 ? 'error' : 'warning'}">
        <div class="stat-label">Error Rate</div>
        <div class="stat-value">${errorRate}<span class="stat-unit">%</span></div>
        <div class="stat-subtext">${result.requests.failed.toLocaleString()} failed requests</div>
      </div>
    </div>

    <div class="charts-section">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Latency Distribution</h2>
          <span class="card-badge">Percentiles</span>
        </div>
        <div class="latency-bars">
          ${percentiles.map(p => `
            <div class="latency-row">
              <span class="latency-label">${p.label}</span>
              <div class="latency-bar-container">
                <div class="latency-bar-fill" style="width: ${Math.max(2, (p.value / maxLatency) * 100)}%; background: ${p.color};"></div>
              </div>
              <span class="latency-value">${p.value < 1 ? (p.value * 1000).toFixed(0) + ' µs' : p.value.toFixed(2) + ' ms'}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Request Breakdown</h2>
        </div>
        <div class="donut-container">
          <canvas id="donutChart" width="200" height="200"></canvas>
          <div class="donut-legend">
            <div class="legend-item">
              <span class="legend-dot" style="background: var(--success);"></span>
              <span>Success</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot" style="background: var(--error);"></span>
              <span>Failed</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="details-grid">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Latency Statistics</h2>
        </div>
        <div class="detail-item">
          <span class="detail-label">Minimum</span>
          <span class="detail-value">${result.latency.min < 1 ? (result.latency.min * 1000).toFixed(0) + ' µs' : result.latency.min.toFixed(2) + ' ms'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Average</span>
          <span class="detail-value">${result.latency.mean.toFixed(2)} ms</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Maximum</span>
          <span class="detail-value">${result.latency.max.toFixed(2)} ms</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Std Deviation</span>
          <span class="detail-value">${result.latency.stddev.toFixed(2)} ms</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Throughput</h2>
        </div>
        <div class="detail-item">
          <span class="detail-label">Data Transferred</span>
          <span class="detail-value">${(result.throughput.totalBytes / 1024 / 1024).toFixed(2)} MB</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Transfer Rate</span>
          <span class="detail-value">${(result.throughput.bytesPerSecond / 1024).toFixed(2)} KB/s</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Avg Response Size</span>
          <span class="detail-value">${result.requests.total > 0 ? Math.round(result.throughput.totalBytes / result.requests.total) : 0} bytes</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Configuration</h2>
        </div>
        <div class="detail-item">
          <span class="detail-label">Method</span>
          <span class="detail-value">${result.method}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Connections</span>
          <span class="detail-value">${result.connections}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Duration</span>
          <span class="detail-value">${result.duration}s</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Rate Limit</span>
          <span class="detail-value">${result.rate !== null ? result.rate + ' req/s' : 'Unlimited'}</span>
        </div>
      </div>
    </div>

    ${result.errors.timeouts > 0 || result.errors.connectionErrors > 0 || Object.keys(result.errors.byStatusCode).length > 0 ? `
    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-header">
        <h2 class="card-title">Error Breakdown</h2>
        <span class="card-badge" style="background: var(--error-glow); color: var(--error);">Issues Detected</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        ${result.errors.timeouts > 0 ? `
        <div class="detail-item">
          <span class="detail-label">Timeouts</span>
          <span class="detail-value" style="color: var(--error);">${result.errors.timeouts.toLocaleString()}</span>
        </div>` : ''}
        ${result.errors.connectionErrors > 0 ? `
        <div class="detail-item">
          <span class="detail-label">Connection Errors</span>
          <span class="detail-value" style="color: var(--error);">${result.errors.connectionErrors.toLocaleString()}</span>
        </div>` : ''}
        ${Object.entries(result.errors.byStatusCode).map(([code, count]) => `
        <div class="detail-item">
          <span class="detail-label">HTTP ${code}</span>
          <span class="detail-value" style="color: var(--error);">${count.toLocaleString()}</span>
        </div>`).join('')}
      </div>
    </div>
    ` : ''}

    <footer class="footer">
      <p>Generated by <strong>SwiftBench</strong> v${result.meta.version} | Node ${result.meta.nodeVersion} | ${result.meta.platform}</p>
      <p style="margin-top: 0.5rem;">${result.timestamp}</p>
    </footer>
  </div>

  <script>
    const ctx = document.getElementById('donutChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Successful', 'Failed'],
        datasets: [{
          data: [${result.requests.successful}, ${result.requests.failed}],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderWidth: 0,
          cutout: '70%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#27272a',
            titleColor: '#fafafa',
            bodyColor: '#a1a1aa',
            borderColor: '#3f3f46',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function(context) {
                const total = ${result.requests.total};
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return context.parsed.toLocaleString() + ' (' + percentage + '%)';
              }
            }
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

/**
 * HTML reporter for visual reports
 */
export class HtmlReporter implements Reporter {
  /**
   * Generates HTML report
   * @param result - Benchmark result
   * @returns HTML string
   */
  async report(result: BenchResult): Promise<string> {
    return generateHtml(result);
  }
}

/**
 * Creates an HTML reporter
 * @returns HTML reporter instance
 */
export function createHtmlReporter(): Reporter {
  return new HtmlReporter();
}
