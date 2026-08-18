import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    if (process.env.SQL_HOST) {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 5000,
      });

      global._postgresPool.on('error', (err) => {
        console.warn('SQL pool connection notification:', err.message);
      });
    } else {
      // Mock pool when SQL_HOST is not provided to prevent startup hangs or connection timeouts
      global._postgresPool = new Pool({
        max: 0,
        connectionTimeoutMillis: 1000,
      });
      global._postgresPool.on('error', () => {});
    }
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
