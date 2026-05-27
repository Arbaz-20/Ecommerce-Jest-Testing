import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';
import { IProductService } from './interfaces/IProductService';
import { ProductListQuery } from './interfaces/IProductRepository';

export class ProductController {
  private service: IProductService;

  constructor(service: IProductService = new ProductService()) {
    this.service = service;
  }

  GetAllProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const options: ProductListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
        search: (req.query.search as string) || undefined,
        sortBy: (req.query.sortBy as ProductListQuery['sortBy']) || undefined,
        sortOrder: (req.query.sortOrder as ProductListQuery['sortOrder']) || undefined,
        category: (req.query.category as string) || undefined,
      };
      const result = await this.service.GetAllProducts(options);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  SearchAllProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const keyword = req.query.q as string;
      const products = await this.service.SearchAllProducts(keyword);
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  };

  GetProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.service.GetProductById(req.params.id);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  };

  CreateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.service.CreateProduct(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  };

  UpdateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.service.UpdateProduct(req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  };

  DeleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.DeleteProduct(req.params.id);
      res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
      next(err);
    }
  };
}
