import mysql, { Pool } from 'mysql2/promise';

// Lazily-initialized singleton pool — mirrors the existing per-request-init
// pattern used for the Razorpay client (src/app/api/payment/create-order/route.ts),
// so a build/deploy without DB credentials configured yet doesn't fail.
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      throw new Error('MySQL is not configured: set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env');
    }
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
      decimalNumbers: true,
    });
  }
  return pool;
}
