import { query, getOne } from '../../shared/database';
import { User } from '../../shared/types';
import { IUserRepository } from './interfaces/IUserRepository';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository implements IUserRepository {
  private mapRow(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as User['role'],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const row = await getOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return row ? this.mapRow(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await getOne<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return row ? this.mapRow(row) : null;
  }

  async create(
    email: string,
    passwordHash: string,
    firstName: string,
    lastName: string,
    role: string = 'customer'
  ): Promise<User> {
    const result = await query<UserRow>(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email.toLowerCase(), passwordHash, firstName, lastName, role]
    );
    return this.mapRow(result.rows[0]);
  }

  async updateProfile(
    id: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.firstName) {
      fields.push(`first_name = $${idx++}`);
      values.push(data.firstName);
    }
    if (data.lastName) {
      fields.push(`last_name = $${idx++}`);
      values.push(data.lastName);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
