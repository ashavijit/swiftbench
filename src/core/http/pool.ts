import { HttpClient } from './client.js'

import type { HttpClientConfig } from './client.js'

/**
 * Connection pool manager for multiple workers
 */
export class ConnectionPool {
  private readonly clients: Map<number, HttpClient> = new Map()
  private readonly config: Omit<HttpClientConfig, 'connections'>
  private readonly connectionsPerClient: number

  /**
   * Creates a connection pool manager
   * @param config - Base client configuration
   * @param connectionsPerClient - Connections per worker
   */
  constructor(config: Omit<HttpClientConfig, 'connections'>, connectionsPerClient: number) {
    this.config = config
    this.connectionsPerClient = connectionsPerClient
  }

  /**
   * Gets or creates a client for a worker
   * @param workerId - Worker identifier
   * @returns HTTP client for the worker
   */
  getClient(workerId: number): HttpClient {
    const existing = this.clients.get(workerId)
    if (existing !== undefined) {
      return existing
    }

    const client = new HttpClient({
      ...this.config,
      connections: this.connectionsPerClient
    })

    this.clients.set(workerId, client)
    return client
  }

  /**
   * Closes all connections in the pool
   */
  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = []

    for (const client of this.clients.values()) {
      closePromises.push(client.close())
    }

    await Promise.all(closePromises)
    this.clients.clear()
  }

  /**
   * Destroys all connections immediately
   */
  async destroyAll(): Promise<void> {
    const destroyPromises: Promise<void>[] = []

    for (const client of this.clients.values()) {
      destroyPromises.push(client.destroy())
    }

    await Promise.all(destroyPromises)
    this.clients.clear()
  }

  /**
   * Gets the number of active clients
   * @returns Number of active clients
   */
  get size(): number {
    return this.clients.size
  }
}
