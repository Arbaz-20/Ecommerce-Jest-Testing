import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  PaginatedResponse,
} from '../../../shared/types';

export interface IProductService {
  getProduct(id: string): Promise<Product>;
  listProducts(
    page?: number,
    pageSize?: number,
    category?: string
  ): Promise<PaginatedResponse<Product>>;
  searchProducts(keyword: string): Promise<Product[]>;
  createProduct(dto: CreateProductDTO): Promise<Product>;
  updateProduct(id: string, dto: UpdateProductDTO): Promise<Product>;
  reserveStock(productId: string, quantity: number): Promise<Product>;
  releaseStock(productId: string, quantity: number): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
}
