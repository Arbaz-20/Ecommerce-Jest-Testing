import {
  User,
  RegisterUserDTO,
  LoginDTO,
  AuthResponse,
  PaginatedResponse,
} from '../../../shared/types';
import { UserListQuery } from './IUserRepository';

export interface IUserService {
  RegisterUser(dto: RegisterUserDTO): Promise<AuthResponse>;
  LoginUser(dto: LoginDTO): Promise<AuthResponse>;
  GetUserProfile(userId: string): Promise<Omit<User, 'passwordHash'>>;
  GetAllUsers(options: UserListQuery): Promise<PaginatedResponse<Omit<User, 'passwordHash'>>>;
  UpdateUserProfile(
    userId: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<Omit<User, 'passwordHash'>>;
  DeactivateUser(userId: string): Promise<void>;
}
