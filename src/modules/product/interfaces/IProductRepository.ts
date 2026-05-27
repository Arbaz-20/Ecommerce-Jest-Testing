import { Product, CreateProductDTO, UpdateProductDTO } from '../../../shared/types';

export interface ProductListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  category?: string;
}

export interface IProductRepository {
  FindById(id: string): Promise<Product | null>;
  FindAll(options: ProductListQuery): Promise<{ items: Product[]; total: number }>;
  Search(keyword: string): Promise<Product[]>;
  Create(dto: CreateProductDTO): Promise<Product>;
  Update(id: string, dto: UpdateProductDTO): Promise<Product | null>;
  UpdateStock(id: string, quantityChange: number): Promise<Product | null>;
  Delete(id: string): Promise<boolean>;
}
