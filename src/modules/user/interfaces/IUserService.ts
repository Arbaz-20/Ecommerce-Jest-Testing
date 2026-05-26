import {
  User,
  RegisterUserDTO,
  LoginDTO,
  AuthResponse,
} from '../../../shared/types';

export interface IUserService {
  register(dto: RegisterUserDTO): Promise<AuthResponse>;
  login(dto: LoginDTO): Promise<AuthResponse>;
  getProfile(userId: string): Promise<Omit<User, 'passwordHash'>>;
  updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<Omit<User, 'passwordHash'>>;
  deactivateAccount(userId: string): Promise<void>;
}
