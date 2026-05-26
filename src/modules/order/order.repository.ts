import { query, getOne, getMany } from '../../shared/database';
import { Order, OrderItem, OrderStatus } from '../../shared/types';
import { IOrderRepository } from './interfaces/IOrderRepository';

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

  async findById(id: string): Promise<Order | null> {
    const row = await getOne<OrderRow>('SELECT * FROM orders WHERE id = $1', [id]);
    if (!row) return null;

    const items = await getMany<OrderItem>(
      `SELECT product_id as "productId", product_name as "productName",
              quantity, unit_price as "unitPrice", total_price as "totalPrice"
       FROM order_items WHERE order_id = $1`,
      [id]
    );
    return this.mapRow(row, items);
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const rows = await getMany<OrderRow>(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const orders: Order[] = [];
    for (const row of rows) {
      const items = await getMany<OrderItem>(
        `SELECT product_id as "productId", product_name as "productName",
                quantity, unit_price as "unitPrice", total_price as "totalPrice"
         FROM order_items WHERE order_id = $1`,
        [row.id]
      );
      orders.push(this.mapRow(row, items));
    }
    return orders;
  }

  async create(
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

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    await query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id]
    );
    return this.findById(id);
  }

  async setPaymentId(orderId: string, paymentId: string): Promise<void> {
    await query(
      `UPDATE orders SET payment_id = $1, updated_at = NOW() WHERE id = $2`,
      [paymentId, orderId]
    );
  }
}
