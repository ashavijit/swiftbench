import { Pool, request } from "undici";

import type { HttpMethod } from "../../types.js";
import { DEFAULT_TIMEOUT_MS } from "../../constants.js";

/**
 * HTTP response from benchmark request
 */
export type HttpResponse = {
  statusCode: number;
  bytes: number;
  latencyUs: number;
};

/**
 * HTTP client configuration
 */
export type HttpClientConfig = {
  baseUrl: string;
  connections: number;
  timeout: number;
  http2: boolean;
};

/**
 * High-performance HTTP client wrapping undici
 */
export class HttpClient {
  private readonly pool: Pool;
  private readonly timeout: number;

  /**
   * Creates a new HTTP client
   * @param config - Client configuration
   */
  constructor(config: HttpClientConfig) {
    this.timeout = config.timeout;

    this.pool = new Pool(config.baseUrl, {
      connections: config.connections,
      pipelining: config.http2 ? 1 : 10,
      keepAliveTimeout: 60_000,
      keepAliveMaxTimeout: 600_000
    });
  }

  /**
   * Executes an HTTP request and measures latency
   * @param method - HTTP method
   * @param path - Request path
   * @param headers - Request headers
   * @param body - Request body
   * @returns Response with status, bytes, and latency
   */
  async execute(
    method: HttpMethod,
    path: string,
    headers: Record<string, string>,
    body: string | Buffer | null
  ): Promise<HttpResponse> {
    const start = process.hrtime.bigint();

    const response = await this.pool.request({
      method,
      path,
      headers,
      body: body ?? undefined,
      headersTimeout: this.timeout,
      bodyTimeout: this.timeout
    });

    const responseBody = await response.body.arrayBuffer();
    const end = process.hrtime.bigint();

    const latencyUs = Number((end - start) / 1000n);

    return {
      statusCode: response.statusCode,
      bytes: responseBody.byteLength,
      latencyUs
    };
  }

  /**
   * Closes the connection pool
   */
  async close(): Promise<void> {
    await this.pool.close();
  }

  /**
   * Destroys the connection pool immediately
   */
  async destroy(): Promise<void> {
    await this.pool.destroy();
  }
}

/**
 * Creates a standalone HTTP request (for simple benchmarks)
 * @param url - Full URL to request
 * @param method - HTTP method
 * @param headers - Request headers
 * @param body - Request body
 * @param timeout - Request timeout
 * @returns Response with status, bytes, and latency
 */
export async function httpRequest(
  url: string,
  method: HttpMethod,
  headers: Record<string, string>,
  body: string | Buffer | null,
  timeout: number = DEFAULT_TIMEOUT_MS
): Promise<HttpResponse> {
  const start = process.hrtime.bigint();

  const response = await request(url, {
    method,
    headers,
    body: body ?? undefined,
    headersTimeout: timeout,
    bodyTimeout: timeout
  });

  const responseBody = await response.body.arrayBuffer();
  const end = process.hrtime.bigint();

  const latencyUs = Number((end - start) / 1000n);

  return {
    statusCode: response.statusCode,
    bytes: responseBody.byteLength,
    latencyUs
  };
}
