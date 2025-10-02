import { pool } from '@/lib/database';
import bcrypt from 'bcryptjs';

export interface IUser {
  id?: number;
  name: string;
  email: string;
  password: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

class User {
  // Create a new user
  static async create(userData: CreateUserData): Promise<UserResponse> {
    const { name, email, password } = userData;

    // Validate input
    if (!name || name.length < 2 || name.length > 50) {
      throw new Error('Name must be between 2 and 50 characters');
    }

    if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      throw new Error('Please enter a valid email');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const query = `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at, updated_at
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, [name.trim(), email.toLowerCase().trim(), password]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Find user by email
  static async findByEmail(email: string): Promise<IUser | null> {
    const query = `
      SELECT id, name, email, password, created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, [email.toLowerCase().trim()]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Find user by ID
  static async findById(id: number): Promise<UserResponse | null> {
    const query = `
      SELECT id, name, email, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Get all users (for admin)
  static async findAll(): Promise<UserResponse[]> {
    const query = `
      SELECT id, name, email, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Check if email exists
  static async emailExists(email: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)
    `;

    const client = await pool.connect();
    try {
      const result = await client.query(query, [email.toLowerCase().trim()]);
      return result.rows[0].exists;
    } finally {
      client.release();
    }
  }

  // Verify password
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Create tables (for setup)
  static async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL CHECK (length(name) >= 2 AND length(name) <= 50),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL CHECK (length(password) >= 6),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `;

    const client = await pool.connect();
    try {
      await client.query(query);
      console.log('Users table created successfully');
    } finally {
      client.release();
    }
  }
}

export default User;