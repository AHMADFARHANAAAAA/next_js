import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Please define the DATABASE_URL environment variable inside .env.local');
}

// Log for debugging
console.log('PostgreSQL URL:', DATABASE_URL.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
declare global {
  var postgres: Pool | undefined;
}

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('sslmode=disable') ? false : {
      rejectUnauthorized: false
    }
  });
} else {
  if (!global.postgres) {
    global.postgres = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('sslmode=disable') ? false : undefined
    });
  }
  pool = global.postgres;
}

async function dbConnect() {
  try {
    // Test the connection
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully');
    client.release();
    return pool;
  } catch (error) {
    console.error('PostgreSQL connection failed:', error);
    throw error;
  }
}

export default dbConnect;
export { pool };