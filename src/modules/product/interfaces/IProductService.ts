import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  PaginatedResponse,
} from '../../../shared/types';
import { ProductListQuery } from './IProductRepository';

export interface IProductService {
  GetProductById(id: string): Promise<Product>;
  GetAllProducts(options: ProductListQuery): Promise<PaginatedResponse<Product>>;
  SearchAllProducts(keyword: string): Promise<Product[]>;
  CreateProduct(dto: CreateProductDTO): Promise<Product>;
  UpdateProduct(id: string, dto: UpdateProductDTO): Promise<Product>;
  ReserveStock(productId: string, quantity: number): Promise<Product>;
  ReleaseStock(productId: string, quantity: number): Promise<Product>;
  DeleteProduct(id: string): Promise<void>;
}
