import { query, getOne, getMany } from '../../shared/database';
import { Order, OrderItem, OrderStatus } from '../../shared/types';
import { IOrderRepository, OrderListQuery } from './interfaces/IOrderRepository';

export interface OrderRow {
  id: string;
  user_id: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  payment_id: string | null;
  coupon_code: string | null;
  created_at: Date;
  updated_at: Date;
}

const SORT_COLUMN_MAP: Record<NonNullable<OrderListQuery['sortBy']>, string> = {
  createdAt: 'created_at',
  total: 'total',
  status: 'status',
};

export class OrderRepository implements IOrderRepository {
  private mapRow(row: OrderRow, items: OrderItem[]): Order {
    return {
      id: row.id,
      userId: row.user_id,
      items,
      subtotal: Number(row.subtotal),
      tax: Number(row.tax),
      discount: Number(row.discount),
      total: Number(row.total),
      status: row.status,
      shippingAddress: {
        street: row.shipping_street,
        city: row.shipping_city,
        state: row.shipping_state,
        zip: row.shipping_zip,
        country: row.shipping_country,
      },
      paymentId: row.payment_id ?? undefined,
      couponCode: row.coupon_code ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async LoadItems(orderId: string): Promise<OrderItem[]> {
    return getMany<OrderItem>(
      `SELECT product_id as "productId", product_name as "productName",
              quantity, unit_price as "unitPrice", total_price as "totalPrice"
       FROM order_items WHERE order_id = $1`,
      [orderId]
    );
  }

  async FindById(id: string): Promise<Order | null> {
    const row = await getOne<OrderRow>('SELECT * FROM orders WHERE id = $1', [id]);
    if (!row) return null;
    const items = await this.LoadItems(id);
    return this.mapRow(row, items);
  }

  async FindAll(options: OrderListQuery): Promise<{ items: Order[]; total: number }> {
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
      where.push(`(id::text ILIKE $${params.length} OR coupon_code ILIKE $${params.length})`);
    }

    const whereClause = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const dataQuery =
      `SELECT * FROM orders${whereClause} ` +
      `ORDER BY ${sortColumn} ${sortOrder} ` +
      `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) FROM orders${whereClause}`;

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, params),
      query<OrderRow>(dataQuery, [...params, pageSize, offset]),
    ]);

    const orders: Order[] = [];
    for (const row of dataResult.rows) {
      const items = await this.LoadItems(row.id);
      orders.push(this.mapRow(row, items));
    }

    return {
      items: orders,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async FindByUserId(userId: string): Promise<Order[]> {
    const rows = await getMany<OrderRow>(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const orders: Order[] = [];
    for (const row of rows) {
      const items = await this.LoadItems(row.id);
      orders.push(this.mapRow(row, items));
    }
    return orders;
  }

  async Create(
    userId: string,
    items: OrderItem[],
    subtotal: number,
    tax: number,
    discount: number,
    total: number,
    shippingAddress: Order['shippingAddress'],
    couponCode?: string
  ): Promise<Order> {
    const orderResult = await query<OrderRow>(
      `INSERT INTO orders
         (user_id, subtotal, tax, discount, total, status,
          shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country,
          coupon_code)
       VALUES ($1, $2, $3, $4, $5, 'pending_payment', $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId, subtotal, tax, discount, total,
        shippingAddress.street, shippingAddress.city,
        shippingAddress.state, shippingAddress.zip, shippingAddress.country,
        couponCode ?? null,
      ]
    );

    const orderRow = orderResult.rows[0];

    for (const item of items) {
      await query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderRow.id, item.productId, item.productName, item.quantity, item.unitPrice, item.totalPrice]
      );
    }

    return this.mapRow(orderRow, items);
  }

  async UpdateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    await query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );
    return this.FindById(id);
  }

  async SetPaymentId(orderId: string, paymentId: string): Promise<void> {
    await query(
      `UPDATE orders SET payment_id = $1, updated_at = NOW() WHERE id = $2`,
      [paymentId, orderId]
    );
  }
}
