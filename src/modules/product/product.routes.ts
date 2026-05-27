import { Router } from 'express';
import { ProductController } from './product.controller';
import { authMiddleware, adminMiddleware } from '../../shared/middleware/auth';

export class ProductRoutes {
  public readonly router: Router;
  private controller: ProductController;

  constructor(controller: ProductController = new ProductController()) {
    this.router = Router();
    this.controller = controller;
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.get('/', this.controller.GetAllProducts);
    this.router.get('/search', this.controller.SearchAllProducts);
    this.router.get('/:id', this.controller.GetProductById);
    this.router.post('/', authMiddleware, adminMiddleware, this.controller.CreateProduct);
    this.router.put('/:id', authMiddleware, adminMiddleware, this.controller.UpdateProduct);
    this.router.delete('/:id', authMiddleware, adminMiddleware, this.controller.DeleteProduct);
  }
}

export const productRoutes = new ProductRoutes().router;
