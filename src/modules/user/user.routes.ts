import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../shared/middleware/auth';

export class UserRoutes {
  public readonly router: Router;
  private controller: UserController;

  constructor(controller: UserController = new UserController()) {
    this.router = Router();
    this.controller = controller;
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.post('/register', this.controller.register);
    this.router.post('/login', this.controller.login);
    this.router.get('/profile', authMiddleware, this.controller.getProfile);
    this.router.put('/profile', authMiddleware, this.controller.updateProfile);
    this.router.post('/deactivate', authMiddleware, this.controller.deactivate);
  }
}

export const userRoutes = new UserRoutes().router;
