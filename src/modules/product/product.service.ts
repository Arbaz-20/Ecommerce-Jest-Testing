import { ProductRepository } from './product.repository';
import { IProductRepository } from './interfaces/IProductRepository';
import { IProductService } from './interfaces/IProductService';
import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  PaginatedResponse,
} from '../../shared/types';
import { NotFoundError, ValidationError } from '../../shared/middleware/errorHandler';
import { isValidPrice } from '../../shared/utils';

export class ProductService implements IProductService {
  private repo: IProductRepository;

  constructor(repo: IProductRepository = new ProductRepository()) {
    this.repo = repo;
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  async listProducts(
    page: number = 1,
    pageSize: number = 20,
    category?: string
  ): Promise<PaginatedResponse<Product>> {
    const { items, total } = await this.repo.findAll(page, pageSize, category);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async searchProducts(keyword: string): Promise<Product[]> {
    if (!keyword || keyword.trim().length < 2) {
      throw new ValidationError('Search keyword must be at least 2 characters');
    }
    return this.repo.search(keyword.trim());
  }

  async createProduct(dto: CreateProductDTO): Promise<Product> {
    this.validateProductData(dto);
    return this.repo.create(dto);
  }

  async updateProduct(id: string, dto: UpdateProductDTO): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Product');

    if (dto.price !== undefined && !isValidPrice(dto.price)) {
      throw new ValidationError('Price must be a non-negative number');
    }
    if (dto.stock !== undefined && dto.stock < 0) {
      throw new ValidationError('Stock cannot be negative');
    }

    const updated = await this.repo.update(id, dto);
    if (!updated) throw new NotFoundError('Product');
    return updated;
  }

  async reserveStock(productId: string, quantity: number): Promise<Product> {
    if (quantity <= 0) {
      throw new ValidationError('Quantity must be positive');
    }
    const updated = await this.repo.updateStock(productId, -quantity);
    if (!updated) {
      throw new ValidationError(`Insufficient stock for product ${productId}`);
    }
    return updated;
  }

  async releaseStock(productId: string, quantity: number): Promise<Product> {
    const updated = await this.repo.updateStock(productId, quantity);
    if (!updated) throw new NotFoundError('Product');
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError('Product');
  }

  private validateProductData(dto: CreateProductDTO): void {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Product name is required');
    }
    if (!isValidPrice(dto.price)) {
      throw new ValidationError('Price must be a non-negative number');
    }
    if (dto.stock < 0) {
      throw new ValidationError('Stock cannot be negative');
    }
    if (!dto.category || dto.category.trim().length === 0) {
      throw new ValidationError('Category is required');
    }
  }
}
