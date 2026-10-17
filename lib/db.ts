// Postgres connection (Supabase) via postgres.js
// Uses the Supabase connection pooler (Supavisor, transaction mode) — safe for serverless.
// All tables live in schema `fixhub` and are referenced fully-qualified: fixhub.tickets etc.
import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var __fixhubSql: ReturnType<typeof postgres> | undefined;
}

function createSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set (Supabase → Project Settings → Database → Connection string, Transaction pooler, port 6543)');
  }
  return postgres(url, {
    prepare: false,          // required for Supavisor transaction mode
    max: 3,                  // small pool per serverless instance
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
    transform: { undefined: null },
  });
}

const sql = global.__fixhubSql ?? createSql();
if (process.env.NODE_ENV !== 'production') global.__fixhubSql = sql;

export default sql;
export { sql };
