import { query, getOne, getMany } from '../../shared/database';
import { Product, CreateProductDTO, UpdateProductDTO } from '../../shared/types';
import { IProductRepository, ProductListQuery } from './interfaces/IProductRepository';

const SORT_COLUMN_MAP: Record<NonNullable<ProductListQuery['sortBy']>, string> = {
  name: 'name',
  price: 'price',
  stock: 'stock',
  createdAt: 'created_at',
};

export class ProductRepository implements IProductRepository {
  async FindById(id: string): Promise<Product | null> {
    return getOne<Product>('SELECT * FROM products WHERE id = $1', [id]);
  }

  async FindAll(options: ProductListQuery): Promise<{ items: Product[]; total: number }> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize && options.pageSize > 0 ? Math.min(options.pageSize, 100) : 20;
    const sortColumn = SORT_COLUMN_MAP[options.sortBy ?? 'createdAt'];
    const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const where: string[] = [];
    const params: any[] = [];

    if (options.category) {
      params.push(options.category);
      where.push(`category = $${params.length}`);
    }
    if (options.search && options.search.trim().length > 0) {
      params.push(`%${options.search.trim()}%`);
      where.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    const whereClause = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const dataQuery =
      `SELECT * FROM products${whereClause} ` +
      `ORDER BY ${sortColumn} ${sortOrder} ` +
      `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) FROM products${whereClause}`;

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, params),
      query<Product>(dataQuery, [...params, pageSize, offset]),
    ]);

    return {
      items: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async Search(keyword: string): Promise<Product[]> {
    return getMany<Product>(
      `SELECT * FROM products
       WHERE name ILIKE $1 OR description ILIKE $1
       ORDER BY created_at DESC`,
      [`%${keyword}%`]
    );
  }

  async Create(dto: CreateProductDTO): Promise<Product> {
    const result = await query<Product>(
      `INSERT INTO products (name, description, price, stock, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [dto.name, dto.description, dto.price, dto.stock, dto.category]
    );
    return result.rows[0];
  }

  async Update(id: string, dto: UpdateProductDTO): Promise<Product | null> {
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

    if (fields.length === 0) return this.FindById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query<Product>(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async UpdateStock(id: string, quantityChange: number): Promise<Product | null> {
    const result = await query<Product>(
      `UPDATE products
       SET stock = stock + $1, updated_at = NOW()
       WHERE id = $2 AND stock + $1 >= 0
       RETURNING *`,
      [quantityChange, id]
    );
    return result.rows[0] ?? null;
  }

  async Delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM products WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
