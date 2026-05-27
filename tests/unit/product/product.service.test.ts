import {
  mockQuery,
  mockGetOne,
  mockGetMany,
  resetDbMocks,
  mockQueryReturning,
} from '../../mocks/database.mock';

import { ProductService } from '../../../src/modules/product/product.service';
import { testProducts, invalidProducts } from '../../fixtures/testData';

describe('ProductService — Unit Tests', () => {
  let service: ProductService;

  beforeEach(() => {
    resetDbMocks();
    service = new ProductService();
  });

  // ── getProduct ────────────────────────────────────────────────
  describe('getProduct()', () => {
    it('should return product when found', async () => {
      const mockProduct = {
        id: 'prod-001',
        ...testProducts[0],
        created_at: new Date(),
        updated_at: new Date(),
      };
      mockGetOne.mockResolvedValueOnce(mockProduct);

      const product = await service.GetProductById('prod-001');

      expect(product).toEqual(mockProduct);
      expect(mockGetOne).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE id = $1',
        ['prod-001']
      );
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockGetOne.mockResolvedValueOnce(null);

      await expect(service.GetProductById('nonexistent')).rejects.toThrow(
        'Product not found'
      );
    });
  });

  // ── listProducts ──────────────────────────────────────────────
  describe('listProducts()', () => {
    it('should return paginated products', async () => {
      const mockProducts = testProducts.map((p, i) => ({
        id: `prod-${i}`,
        ...p,
      }));

      // COUNT query then SELECT query
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: mockProducts });

      const result = await service.GetAllProducts({ page: 1, pageSize: 20 });

      expect(result.total).toBe(5);
      expect(result.items).toHaveLength(5);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by category', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.GetAllProducts({ page: 1, pageSize: 20, category: 'electronics' });

      // Both queries should include the category filter
      expect(mockQuery.mock.calls[0][1]).toEqual(['electronics']);
    });
  });

  // ── searchProducts ────────────────────────────────────────────
  describe('searchProducts()', () => {
    it('should search products by keyword', async () => {
      mockGetMany.mockResolvedValueOnce([{ id: 'prod-001', name: 'Keyboard' }]);

      const results = await service.SearchAllProducts('keyboard');

      expect(results).toHaveLength(1);
      expect(mockGetMany).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%keyboard%']
      );
    });

    it('should throw ValidationError for short keyword', async () => {
      await expect(service.SearchAllProducts('a')).rejects.toThrow(
        'at least 2 characters'
      );
    });

    it('should throw ValidationError for empty keyword', async () => {
      await expect(service.SearchAllProducts('')).rejects.toThrow(
        'at least 2 characters'
      );
    });
  });

  // ── createProduct ─────────────────────────────────────────────
  describe('createProduct()', () => {
    it('should create a valid product', async () => {
      const dto = testProducts[0];
      const expected = { id: 'new-prod', ...dto };
      mockQueryReturning(expected);

      const product = await service.CreateProduct(dto);

      expect(product).toEqual(expected);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO products'),
        [dto.name, dto.description, dto.price, dto.stock, dto.category]
      );
    });

    it('should reject product with empty name', async () => {
      await expect(
        service.CreateProduct(invalidProducts.missingName as any)
      ).rejects.toThrow('Product name is required');
    });

    it('should reject product with negative price', async () => {
      await expect(
        service.CreateProduct(invalidProducts.negativePrice as any)
      ).rejects.toThrow('Price must be a non-negative number');
    });

    it('should reject product with negative stock', async () => {
      await expect(
        service.CreateProduct(invalidProducts.negativeStock as any)
      ).rejects.toThrow('Stock cannot be negative');
    });

    it('should reject product with empty category', async () => {
      await expect(
        service.CreateProduct(invalidProducts.missingCategory as any)
      ).rejects.toThrow('Category is required');
    });
  });

  // ── updateProduct ─────────────────────────────────────────────
  describe('updateProduct()', () => {
    it('should update an existing product', async () => {
      const existing = { id: 'prod-001', ...testProducts[0] };
      mockGetOne.mockResolvedValueOnce(existing);

      const updated = { ...existing, price: 199.99 };
      mockQueryReturning(updated);

      const result = await service.UpdateProduct('prod-001', { price: 199.99 });

      expect(result.price).toBe(199.99);
    });

    it('should throw NotFoundError for non-existent product', async () => {
      mockGetOne.mockResolvedValueOnce(null);

      await expect(
        service.UpdateProduct('nope', { price: 10 })
      ).rejects.toThrow('Product not found');
    });

    it('should reject negative price update', async () => {
      const existing = { id: 'prod-001', ...testProducts[0] };
      mockGetOne.mockResolvedValueOnce(existing);

      await expect(
        service.UpdateProduct('prod-001', { price: -5 })
      ).rejects.toThrow('Price must be a non-negative number');
    });
  });

  // ── reserveStock ──────────────────────────────────────────────
  describe('reserveStock()', () => {
    it('should decrement stock successfully', async () => {
      const updatedProduct = { id: 'prod-001', stock: 45 };
      mockQueryReturning(updatedProduct);

      const result = await service.ReserveStock('prod-001', 5);

      expect(result.stock).toBe(45);
    });

    it('should throw when insufficient stock', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.ReserveStock('prod-001', 999)
      ).rejects.toThrow('Insufficient stock');
    });

    it('should throw for non-positive quantity', async () => {
      await expect(service.ReserveStock('prod-001', 0)).rejects.toThrow(
        'Quantity must be positive'
      );
      await expect(service.ReserveStock('prod-001', -1)).rejects.toThrow(
        'Quantity must be positive'
      );
    });
  });

  // ── deleteProduct ─────────────────────────────────────────────
  describe('deleteProduct()', () => {
    it('should delete an existing product', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      await expect(service.DeleteProduct('prod-001')).resolves.toBeUndefined();
    });

    it('should throw NotFoundError if product does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      await expect(service.DeleteProduct('nope')).rejects.toThrow(
        'Product not found'
      );
    });
  });
});
