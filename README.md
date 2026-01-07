<p align="center">
  <img src="assets/logo.svg" alt="SwiftBench" height="80">
</p>

# SwiftBench

<p align="center">
  <strong>High-performance, TypeScript-first API benchmarking tool</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/swiftbench"><img src="https://img.shields.io/npm/v/swiftbench" alt="npm"></a>
  <a href="https://www.npmjs.com/package/swiftbench"><img src="https://img.shields.io/npm/dw/swiftbench" alt="downloads"></a>
  <a href="https://www.npmjs.com/package/swiftbench"><img src="https://img.shields.io/npm/dt/swiftbench.svg" alt="total downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/swiftbench" alt="license"></a>
</p>


<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#cli-options">CLI Options</a> •
  <a href="#programmatic-api">API</a> •
  <a href="#output-formats">Output</a>
</p>

---

A fast, zero-config API benchmarking tool built for real traffic simulation, accurate latency metrics, and CI automation. Built with worker threads and `undici` for maximum performance.

<p align="center">
  <img src="assets/details.gif" alt="SwiftBench Demo" width="100%">
</p>

## Installation

```bash
npm install -g swiftbench 
# or install as dev dependency
npm install swiftbench --save-dev
```

## Quick Start

### CLI

```bash
swiftbench http://localhost:3000
# implies -c 50 -d 10 (50 concurrent connections for 10 seconds)

swiftbench http://localhost:3000 -c 200 -d 30
# implies -c 200 -d 30 (200 concurrent connections for 30 seconds)

swiftbench http://localhost:3000 --rate 1000
# implies 1000 requests per second

swiftbench http://localhost:3000/api -m POST --json '{"key": "value"}'

swiftbench http://localhost:3000 --output html -o report.html

swiftbench --compare http://localhost:3000 http://localhost:3001 http://localhost:3002 -c 100 -d 10
```

### Programmatic API

```typescript
import { bench, defineConfig } from "swiftbench";

/*
 this is a simple benchmark
 i.e ==> bench("http://localhost:3000")
*/
const result = await bench("http://localhost:3000");
console.log(`RPS: ${result.throughput.rps}`);
console.log(`P99: ${result.latency.p99}ms`);

/*
 this is a benchmark with options
 i.e ==> bench("http://localhost:3000", { connections: 200, duration: 30 })
*/
const result = await bench("http://localhost:3000", {
  connections: 200,
  duration: 30
});

const result = await bench({
  url: "http://localhost:3000/api",
  method: "POST",
  headers: { "Authorization": "Bearer token" },
  body: JSON.stringify({ key: "value" }),
  rate: 500,
  duration: 20
});

const config = defineConfig({
  url: "http://localhost:3000",
  connections: 100,
  duration: 10,
  thresholds: {
    p99: 100,
    errorRate: 0.01
  }
});
```

## Features

- **Worker Thread Architecture** - Utilizes all CPU cores for maximum load generation
- **High-Performance HTTP** - Built on `undici` for efficient connection pooling
- **Accurate Latency Metrics** - Microsecond-precision timing with full percentile distribution
- **Pre-flight Reachability Check** - Validates target before benchmarking
- **Compare Mode** - Benchmark multiple URLs for framework comparison
- **Rate Limiting** - Token bucket algorithm for controlled load
- **CI Quality Gates** - Exit codes based on latency/error thresholds
- **Multiple Output Formats** - Console, JSON, HTML, CSV
- **Modern HTML Reports** - Interactive charts and analytics dashboard
- **HTTP/2 Support** - Test modern protocols
- **Zero Config** - Sensible defaults, just provide a URL

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --connections <n>` | Concurrent connections | 50 |
| `-d, --duration <n>` | Duration in seconds | 10 |
| `--rate <n>` | Requests per second limit | unlimited |
| `--timeout <n>` | Request timeout in ms | 5000 |
| `-m, --method <method>` | HTTP method | GET |
| `-H, --header <header>` | Add header (repeatable) | - |
| `--body <data>` | Request body | - |
| `--json <data>` | JSON body (sets Content-Type) | - |
| `--http2` | Use HTTP/2 | false |
| `--output <format>` | Format: console, json, html, csv | console |
| `-o <file>` | Output file path | - |
| `--p99 <ms>` | P99 latency threshold (CI) | - |
| `--error-rate <rate>` | Error rate threshold 0-1 (CI) | - |
| `--compare` | Compare multiple URLs | - |

## Output Formats

### Console

Clean terminal output with styled tables:

```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│   Stat   │   Min    │   p50    │   p90    │   p99    │   Avg    │  Stdev   │   Max    │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Latency  │  110 µs  │  500 µs  │ 1.50 ms  │ 3.50 ms  │ 1.13 ms  │ 1.45 ms  │ 83.69 ms │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```


```bash
swiftbench http://localhost:3000 --output json -o result.json
```

Machine-readable output for CI pipelines and data processing.


```bash
swiftbench http://localhost:3000 --output html -o report.html
```

Modern dark-themed report with:
- Interactive donut chart for request breakdown
- Latency distribution visualization
- Comprehensive statistics cards
- Error breakdown section

### CSV

```bash
swiftbench http://localhost:3000 --output csv -o results.csv
```

Spreadsheet-compatible format for data analysis.

## Compare Mode

Benchmark multiple URLs to compare framework performance:

```bash
swiftbench --compare http://localhost:3000 http://localhost:3001 -c 100 -d 10
```

Output:
```
Comparison Results
────────────────────────────────────────────────────────────────────────────────
URL                                      RPS          P50          P99        Err%
────────────────────────────────────────────────────────────────────────────────
#1 http://localhost:3000                167,098     0.50ms      2.50ms      0.00%
#2 http://localhost:3001                 45,231     2.10ms      8.50ms      0.01%
────────────────────────────────────────────────────────────────────────────────
```

## CI Integration

### GitHub Actions

```yaml
- name: API Performance Test
  run: |
    npx swiftbench http://localhost:3000 \
      --p99 100 \
      --error-rate 0.01 \
      --output json -o benchmark.json

- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: benchmark-results
    path: benchmark.json
```

### Exit Codes

| Code | Description |
|------|-------------|
| `0` | Success - all thresholds passed |
| `1` | Threshold exceeded |
| `2` | Error (unreachable, crash, etc.) |

## Result Object

```typescript
interface BenchResult {
  url: string;
  method: string;
  duration: number;
  connections: number;
  rate: number | null;
  requests: {
    total: number;
    successful: number;
    failed: number;
  };
  throughput: {
    rps: number;
    bytesPerSecond: number;
    totalBytes: number;
  };
  latency: {
    min: number;
    max: number;
    mean: number;
    stddev: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
  };
  errors: {
    timeouts: number;
    connectionErrors: number;
    byStatusCode: Record<number, number>;
  };
  timestamp: string;
  meta: {
    version: string;
    nodeVersion: string;
    platform: string;
  };
}
```

## Requirements

- Node.js >= 18.0.0

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

MIT © 2026

## Roadmap

We are constantly improving SwiftBench. Here are some features planned for future releases:

- [ ] **Request Scenarios** - Define complex multi-step flows (e.g., Login → Get Token → API Call)
- [ ] **GraphQL Support** - First-class support for GraphQL queries and mutations
- [ ] **Interactive TUI** - Real-time terminal dashboard with live graphs
- [ ] **Dynamic Payloads** - Generate random data per request using a scripting API
- [ ] **Custom Reporters** - Plug in your own reporting logic (Datadog, Prometheus, etc.)
- [ ] **Distributed Testing** - Coordinate multiple machines for massive load simulation

