import { Pool, PoolClient } from "pg";
import { env } from "./env";
import { logger } from "../utils/logger";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  logger.error("Unexpected database error", { error: err.message });
});

pool.on("connect", () => {
  logger.info("New database connection established");
});

export async function query<T = any>(
  text: string,
  params?: any[],
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug("Executed query", { text, duration, rows: result.rowCount });
    return result.rows;
  } catch (error) {
    logger.error("Database query error", { text, error });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return await pool.query();
}

export async function closePool(): Promise<void> {
  await pool.end();
  logger.info("Database pool closed");
}
