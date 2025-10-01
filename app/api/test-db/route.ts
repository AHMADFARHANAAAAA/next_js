import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  let client;
  
  try {
    console.log('Testing PostgreSQL connection...');
    
    // Create pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : undefined
    });

    // Test connection
    client = await pool.connect();
    console.log('PostgreSQL connection successful!');
    
    // Test simple query
    await client.query('SELECT NOW() as current_time');
    console.log('Query test successful');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    console.log('Users table exists:', tableExists);
    
    // Create simple table if not exists
    if (!tableExists) {
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Users table created successfully');
    }
    
    // Count users
    const countResult = await client.query('SELECT COUNT(*) as total FROM users');
    const userCount = countResult.rows[0].total;
    
    return NextResponse.json({
      success: true,
      message: 'PostgreSQL database connected successfully',
      details: {
        database: 'edu',
        timestamp: new Date().toISOString(),
        usersTableExists: true,
        totalUsers: parseInt(userCount),
        connectionString: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@')
      }
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Database connection error:', error);
    
    let errorMessage = 'Database connection failed';
    let troubleshooting: string[] = [];
    let errorCode = 'UNKNOWN';

    // Specific error handling
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as { code: string; message: string; constructor: { name: string } };
      errorCode = dbError.code;
      
      switch (dbError.code) {
        case 'ECONNREFUSED':
          errorMessage = 'PostgreSQL service is not running';
          troubleshooting = [
            'Start PostgreSQL service: services.msc → postgresql → Start',
            'Check if PostgreSQL is installed',
            'Verify port 5432 is available'
          ];
          break;
        case '3D000':
          errorMessage = 'Database "edu" does not exist';
          troubleshooting = [
            'Create database: CREATE DATABASE edu;',
            'Use pgAdmin to create database "edu"'
          ];
          break;
        case '28P01':
          errorMessage = 'Authentication failed - wrong password';
          troubleshooting = [
            'Check password in .env.local (currently: 123)',
            'Verify PostgreSQL user password'
          ];
          break;
        default:
          errorMessage = `Database error: ${dbError.message}`;
          troubleshooting = [
            'Check PostgreSQL service status',
            'Verify connection string in .env.local',
            'Check database "edu" exists'
          ];
      }
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: {
        code: errorCode,
        type: error?.constructor?.name || 'UnknownError',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      troubleshooting,
      connectionString: process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':***@')
    }, { status: 500 });
    
  } finally {
    if (client) {
      client.release();
    }
  }
}