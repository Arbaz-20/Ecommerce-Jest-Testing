import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware, adminMiddleware } from '../../shared/middleware/auth';

export class UserRoutes {
  public readonly router: Router;
  private controller: UserController;

  constructor(controller: UserController = new UserController()) {
    this.router = Router();
    this.controller = controller;
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.post('/register', this.controller.RegisterUser);
    this.router.post('/login', this.controller.LoginUser);
    this.router.get('/profile', authMiddleware, this.controller.GetUserProfile);
    this.router.put('/profile', authMiddleware, this.controller.UpdateUserProfile);
    this.router.post('/deactivate', authMiddleware, this.controller.DeactivateUser);
    this.router.get('/', authMiddleware, adminMiddleware, this.controller.GetAllUsers);
  }
}

export const userRoutes = new UserRoutes().router;
