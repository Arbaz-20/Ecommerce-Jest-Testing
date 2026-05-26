import { query, getOne, getMany } from '../../shared/database';
import { Product, CreateProductDTO, UpdateProductDTO } from '../../shared/types';
import { IProductRepository } from './interfaces/IProductRepository';

export class ProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    return getOne<Product>('SELECT * FROM products WHERE id = $1', [id]);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    category?: string
  ): Promise<{ items: Product[]; total: number }> {
    let countQuery = 'SELECT COUNT(*) FROM products';
    let dataQuery = 'SELECT * FROM products';
    const params: any[] = [];

    if (category) {
      countQuery += ' WHERE category = $1';
      dataQuery += ' WHERE category = $1';
      params.push(category);
    }

    const offset = (page - 1) * pageSize;
    dataQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, category ? [category] : []),
      query<Product>(dataQuery, [...params, pageSize, offset]),
    ]);

    return {
      items: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async search(keyword: string): Promise<Product[]> {
    return getMany<Product>(
      `SELECT * FROM products
       WHERE name ILIKE $1 OR description ILIKE $1
       ORDER BY created_at DESC`,
      [`%${keyword}%`]
    );
  }

  async create(dto: CreateProductDTO): Promise<Product> {
    const result = await query<Product>(
      `INSERT INTO products (name, description, price, stock, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [dto.name, dto.description, dto.price, dto.stock, dto.category]
    );
    return result.rows[0];
  }

  async update(id: string, dto: UpdateProductDTO): Promise<Product | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }
    if (dto.price !== undefined) {
      fields.push(`price = $${paramIndex++}`);
      values.push(dto.price);
    }
    if (dto.stock !== undefined) {
      fields.push(`stock = $${paramIndex++}`);
      values.push(dto.stock);
    }
    if (dto.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(dto.category);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query<Product>(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async updateStock(id: string, quantityChange: number): Promise<Product | null> {
    const result = await query<Product>(
      `UPDATE products
       SET stock = stock + $1, updated_at = NOW()
       WHERE id = $2 AND stock + $1 >= 0
       RETURNING *`,
      [quantityChange, id]
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM products WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
