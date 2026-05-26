import { query, getOne, getMany } from '../../shared/database';
import { Payment, PaymentStatus } from '../../shared/types';
import { IPaymentRepository } from './interfaces/IPaymentRepository';

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

  async findById(id: string): Promise<Payment | null> {
    const row = await getOne<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);
    return row ? this.mapRow(row) : null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const row = await getOne<PaymentRow>(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );
    return row ? this.mapRow(row) : null;
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    const rows = await getMany<PaymentRow>(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  async create(
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

  async updateStatus(
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
