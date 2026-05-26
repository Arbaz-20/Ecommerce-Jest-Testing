import { Product, CreateProductDTO, UpdateProductDTO } from '../../../shared/types';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(
    page?: number,
    pageSize?: number,
    category?: string
  ): Promise<{ items: Product[]; total: number }>;
  search(keyword: string): Promise<Product[]>;
  create(dto: CreateProductDTO): Promise<Product>;
  update(id: string, dto: UpdateProductDTO): Promise<Product | null>;
  updateStock(id: string, quantityChange: number): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}
