import { query, getOne } from '../../shared/database';
import { User } from '../../shared/types';
import { IUserRepository, UserListQuery } from './interfaces/IUserRepository';

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

const SORT_COLUMN_MAP: Record<NonNullable<UserListQuery['sortBy']>, string> = {
  createdAt: 'created_at',
  email: 'email',
  firstName: 'first_name',
  lastName: 'last_name',
};

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

  async FindById(id: string): Promise<User | null> {
    const row = await getOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return row ? this.mapRow(row) : null;
  }

  async FindAll(options: UserListQuery): Promise<{ items: User[]; total: number }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize && options.pageSize > 0 ? Math.min(options.pageSize, 100) : 20;
    const sortColumn = SORT_COLUMN_MAP[options.sortBy ?? 'createdAt'];
    const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const where: string[] = [];
    const params: any[] = [];

    if (options.role) {
      params.push(options.role);
      where.push(`role = $${params.length}`);
    }
    if (typeof options.isActive === 'boolean') {
      params.push(options.isActive);
      where.push(`is_active = $${params.length}`);
    }
    if (options.search && options.search.trim().length > 0) {
      params.push(`%${options.search.trim()}%`);
      where.push(
        `(email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`
      );
    }

    const whereClause = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const dataQuery =
      `SELECT * FROM users${whereClause} ` +
      `ORDER BY ${sortColumn} ${sortOrder} ` +
      `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) FROM users${whereClause}`;

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, params),
      query<UserRow>(dataQuery, [...params, pageSize, offset]),
    ]);

    return {
      items: dataResult.rows.map((r) => this.mapRow(r)),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async FindByEmail(email: string): Promise<User | null> {
    const row = await getOne<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return row ? this.mapRow(row) : null;
  }

  async Create(
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

  async UpdateProfile(
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

    if (fields.length === 0) return this.FindById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async Deactivate(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
