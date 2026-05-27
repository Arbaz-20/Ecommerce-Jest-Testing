import { query, getOne, getMany } from '../../shared/database';
import { Payment, PaymentStatus } from '../../shared/types';
import { IPaymentRepository, PaymentListQuery } from './interfaces/IPaymentRepository';

interface PaymentRow {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus;
  transaction_id: string | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

const SORT_COLUMN_MAP: Record<NonNullable<PaymentListQuery['sortBy']>, string> = {
  createdAt: 'created_at',
  amount: 'amount',
  status: 'status',
};

export class PaymentRepository implements IPaymentRepository {
  private mapRow(row: PaymentRow): Payment {
    return {
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      amount: Number(row.amount),
      currency: row.currency,
      method: row.method as Payment['method'],
      status: row.status,
      transactionId: row.transaction_id ?? undefined,
      failureReason: row.failure_reason ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async FindById(id: string): Promise<Payment | null> {
    const row = await getOne<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);
    return row ? this.mapRow(row) : null;
  }

  async FindAll(options: PaymentListQuery): Promise<{ items: Payment[]; total: number }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize && options.pageSize > 0 ? Math.min(options.pageSize, 100) : 20;
    const sortColumn = SORT_COLUMN_MAP[options.sortBy ?? 'createdAt'];
    const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const where: string[] = [];
    const params: any[] = [];

    if (options.userId) {
      params.push(options.userId);
      where.push(`user_id = $${params.length}`);
    }
    if (options.status) {
      params.push(options.status);
      where.push(`status = $${params.length}`);
    }
    if (options.search && options.search.trim().length > 0) {
      params.push(`%${options.search.trim()}%`);
      where.push(
        `(id::text ILIKE $${params.length} OR transaction_id ILIKE $${params.length})`
      );
    }

    const whereClause = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const dataQuery =
      `SELECT * FROM payments${whereClause} ` +
      `ORDER BY ${sortColumn} ${sortOrder} ` +
      `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) FROM payments${whereClause}`;

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, params),
      query<PaymentRow>(dataQuery, [...params, pageSize, offset]),
    ]);

    return {
      items: dataResult.rows.map((r) => this.mapRow(r)),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async FindByOrderId(orderId: string): Promise<Payment | null> {
    const row = await getOne<PaymentRow>(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );
    return row ? this.mapRow(row) : null;
  }

  async FindByUserId(userId: string): Promise<Payment[]> {
    const rows = await getMany<PaymentRow>(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  async Create(
    orderId: string,
    userId: string,
    amount: number,
    method: string,
    currency: string = 'USD'
  ): Promise<Payment> {
    const result = await query<PaymentRow>(
      `INSERT INTO payments (order_id, user_id, amount, currency, method, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [orderId, userId, amount, currency, method]
    );
    return this.mapRow(result.rows[0]);
  }

  async UpdateStatus(
    id: string,
    status: PaymentStatus,
    transactionId?: string,
    failureReason?: string
  ): Promise<Payment | null> {
    const result = await query<PaymentRow>(
      `UPDATE payments
       SET status = $1, transaction_id = $2, failure_reason = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, transactionId ?? null, failureReason ?? null, id]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }
}
