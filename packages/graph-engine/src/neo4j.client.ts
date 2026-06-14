import neo4j, { Driver, Session, QueryResult } from "neo4j-driver"
import { createLogger } from "@rip/shared-utils"

const log = createLogger("Neo4jClient")

export class Neo4jClient {
  private driver: Driver

  constructor(
    uri = process.env.NEO4J_URI ?? "bolt://localhost:7687",
    user = process.env.NEO4J_USER ?? "neo4j",
    password = process.env.NEO4J_PASSWORD ?? "password",
  ) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
  }

  async runQuery(cypher: string, params: Record<string, unknown> = {}): Promise<QueryResult> {
    const session: Session = this.driver.session()
    try {
      return await session.run(cypher, params)
    } finally {
      await session.close()
    }
  }

  async verifyConnectivity(): Promise<void> {
    await this.driver.verifyConnectivity()
    log.info("Neo4j connected")
  }

  async close(): Promise<void> {
    await this.driver.close()
  }
}
