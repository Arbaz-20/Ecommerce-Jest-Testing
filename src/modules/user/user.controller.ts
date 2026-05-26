import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { IUserService } from './interfaces/IUserService';
import { AuthenticatedRequest } from '../../shared/middleware/auth';

export class UserController {
  private service: IUserService;

  constructor(service: IUserService = new UserService()) {
    this.service = service;
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const profile = await this.service.getProfile(req.user!.userId);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const profile = await this.service.updateProfile(req.user!.userId, req.body);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  };

  deactivate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.service.deactivateAccount(req.user!.userId);
      res.json({ success: true, message: 'Account deactivated' });
    } catch (err) {
      next(err);
    }
  };
}
