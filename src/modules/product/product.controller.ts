import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';
import { IProductService } from './interfaces/IProductService';

export class ProductController {
  private service: IProductService;

  constructor(service: IProductService = new ProductService()) {
    this.service = service;
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const category = req.query.category as string | undefined;
      const result = await this.service.listProducts(page, pageSize, category);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const keyword = req.query.q as string;
      const products = await this.service.searchProducts(keyword);
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.service.getProduct(req.params.id);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.service.createProduct(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.service.updateProduct(req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deleteProduct(req.params.id);
      res.json({ success: true, message: 'Product deleted' });
    } catch (err) {
      next(err);
    }
  };
}
