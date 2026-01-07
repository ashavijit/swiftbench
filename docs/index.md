<p align="center">
  <img src="assets/logo.png" alt="SwiftBench" height="80">
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
# or
npm install swiftbench --save-dev
```

## Quick Start

### CLI

```bash
# Simple benchmark
swiftbench http://localhost:3000

# High-load test
swiftbench http://localhost:3000 -c 200 -d 30

# Rate limited
swiftbench http://localhost:3000 --rate 1000

# POST with JSON
swiftbench http://localhost:3000/api -m POST --json '{"key": "value"}'

# Generate HTML report
swiftbench http://localhost:3000 --output html -o report.html

# Compare multiple frameworks
swiftbench --compare http://localhost:3000 http://localhost:3001 http://localhost:3002 -c 100 -d 10
```

### Programmatic API

```typescript
import { bench, defineConfig } from "swiftbench";

// Simple benchmark
const result = await bench("http://localhost:3000");
console.log(`RPS: ${result.throughput.rps}`);
console.log(`P99: ${result.latency.p99}ms`);

// With options
const result = await bench("http://localhost:3000", {
  connections: 200,
  duration: 30
});

// Full configuration
const result = await bench({
  url: "http://localhost:3000/api",
  method: "POST",
  headers: { "Authorization": "Bearer token" },
  body: JSON.stringify({ key: "value" }),
  rate: 500,
  duration: 20
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

## Output Example

```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│   Stat   │   Min    │   p50    │   p90    │   p99    │   Avg    │  Stdev   │   Max    │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Latency  │  110 µs  │  500 µs  │ 1.50 ms  │ 3.50 ms  │ 1.13 ms  │ 1.45 ms  │ 83.69 ms │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
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
```

### Exit Codes

| Code | Description |
|------|-------------|
| `0` | Success - all thresholds passed |
| `1` | Threshold exceeded |
| `2` | Error (unreachable, crash, etc.) |

## Requirements

- Node.js >= 18.0.0

## Comparison

How does SwiftBench compare to other tools?

| Feature | SwiftBench | Autocannon | k6 | wrk |
|---------|:----------:|:----------:|:--:|:---:|
| **Language** | Node.js (TS) | Node.js | Go/JS | C |
| **Zero Config** | ✅ | ✅ | ❌ | ✅ |
| **CI Quality Gates** | ✅ | ❌ | ✅ | ❌ |
| **HTML Reports** | ✅ | ❌ | ☁️ | ❌ |
| **HTTP/2** | ✅ | ✅ | ✅ | ❌ |
| **Compare Mode** | ✅ | ❌ | ❌ | ❌ |
| **Scripting** | 🔜 | ✅ | ✅ | ✅ |

## License

MIT © 2024
