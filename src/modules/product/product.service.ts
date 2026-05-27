import { ProductRepository } from './product.repository';
import { IProductRepository, ProductListQuery } from './interfaces/IProductRepository';
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

  public async GetProductById(id: string): Promise<Product> {
    const product = await this.repo.FindById(id);
    if (!product) throw new NotFoundError('Product');
    return product;
  }

  public async GetAllProducts(options: ProductListQuery): Promise<PaginatedResponse<Product>> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize && options.pageSize > 0 ? Math.min(options.pageSize, 100) : 20;
    const { items, total } = await this.repo.FindAll({ ...options, page, pageSize });
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  public async SearchAllProducts(keyword: string): Promise<Product[]> {
    if (!keyword || keyword.trim().length < 2) {
      throw new ValidationError('Search keyword must be at least 2 characters');
    }
    return this.repo.Search(keyword.trim());
  }

  public async CreateProduct(dto: CreateProductDTO): Promise<Product> {
    this.ValidateProductData(dto);
    return this.repo.Create(dto);
  }

  public async UpdateProduct(id: string, dto: UpdateProductDTO): Promise<Product> {
    const existing = await this.repo.FindById(id);
    if (!existing) throw new NotFoundError('Product');

    if (dto.price !== undefined && !isValidPrice(dto.price)) {
      throw new ValidationError('Price must be a non-negative number');
    }
    if (dto.stock !== undefined && dto.stock < 0) {
      throw new ValidationError('Stock cannot be negative');
    }

    const updated = await this.repo.Update(id, dto);
    if (!updated) throw new NotFoundError('Product');
    return updated;
  }

  public async ReserveStock(productId: string, quantity: number): Promise<Product> {
    if (quantity <= 0) {
      throw new ValidationError('Quantity must be positive');
    }
    const updated = await this.repo.UpdateStock(productId, -quantity);
    if (!updated) {
      throw new ValidationError(`Insufficient stock for product ${productId}`);
    }
    return updated;
  }

  public async ReleaseStock(productId: string, quantity: number): Promise<Product> {
    const updated = await this.repo.UpdateStock(productId, quantity);
    if (!updated) throw new NotFoundError('Product');
    return updated;
  }

  public async DeleteProduct(id: string): Promise<void> {
    const deleted = await this.repo.Delete(id);
    if (!deleted) throw new NotFoundError('Product');
  }

  private ValidateProductData(dto: CreateProductDTO): void {
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
