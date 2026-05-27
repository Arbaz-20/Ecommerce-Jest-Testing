import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { IUserService } from './interfaces/IUserService';
import { UserListQuery } from './interfaces/IUserRepository';
import { AuthenticatedRequest } from '../../shared/middleware/auth';

export class UserController {
  private service: IUserService;

  constructor(service: IUserService = new UserService()) {
    this.service = service;
  }

  RegisterUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.RegisterUser(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  LoginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.LoginUser(req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  GetUserProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const profile = await this.service.GetUserProfile(req.user!.userId);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  };

  GetAllUsers = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const options: UserListQuery = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
        search: (req.query.search as string) || undefined,
        sortBy: (req.query.sortBy as UserListQuery['sortBy']) || undefined,
        sortOrder: (req.query.sortOrder as UserListQuery['sortOrder']) || undefined,
        role: (req.query.role as string) || undefined,
        isActive:
          req.query.isActive === 'true'
            ? true
            : req.query.isActive === 'false'
              ? false
              : undefined,
      };
      const result = await this.service.GetAllUsers(options);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  UpdateUserProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const profile = await this.service.UpdateUserProfile(req.user!.userId, req.body);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  };

  DeactivateUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.service.DeactivateUser(req.user!.userId);
      res.json({ success: true, message: 'Account deactivated' });
    } catch (err) {
      next(err);
    }
  };
}
