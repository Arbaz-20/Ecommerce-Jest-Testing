import bcrypt from 'bcryptjs';
import { UserRepository } from './user.repository';
import { IUserRepository, UserListQuery } from './interfaces/IUserRepository';
import { IUserService } from './interfaces/IUserService';
import {
  User,
  RegisterUserDTO,
  LoginDTO,
  AuthResponse,
  PaginatedResponse,
} from '../../shared/types';
import { generateToken } from '../../shared/middleware/auth';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../shared/middleware/errorHandler';
import { isValidEmail, sanitizeUser } from '../../shared/utils';

const SALT_ROUNDS = 10;

export class UserService implements IUserService {
  private repo: IUserRepository;

  constructor(repo: IUserRepository = new UserRepository()) {
    this.repo = repo;
  }

  async RegisterUser(dto: RegisterUserDTO): Promise<AuthResponse> {
    if (!dto.email || !isValidEmail(dto.email)) {
      throw new ValidationError('Valid email is required');
    }
    if (!dto.password || dto.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }
    if (!dto.firstName || dto.firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }
    if (!dto.lastName || dto.lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    const existing = await this.repo.FindByEmail(dto.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.repo.Create(
      dto.email,
      passwordHash,
      dto.firstName.trim(),
      dto.lastName.trim()
    );

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { token, user: sanitizeUser(user) };
  }

  async LoginUser(dto: LoginDTO): Promise<AuthResponse> {
    if (!dto.email || !dto.password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await this.repo.FindByEmail(dto.email);
    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ValidationError('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ValidationError('Invalid email or password');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { token, user: sanitizeUser(user) };
  }

  async GetUserProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.repo.FindById(userId);
    if (!user) throw new NotFoundError('User');
    return sanitizeUser(user);
  }

  async GetAllUsers(
    options: UserListQuery
  ): Promise<PaginatedResponse<Omit<User, 'passwordHash'>>> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize && options.pageSize > 0 ? Math.min(options.pageSize, 100) : 20;
    const { items, total } = await this.repo.FindAll({ ...options, page, pageSize });
    return {
      items: items.map((u) => sanitizeUser(u)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async UpdateUserProfile(
    userId: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<Omit<User, 'passwordHash'>> {
    const updated = await this.repo.UpdateProfile(userId, data);
    if (!updated) throw new NotFoundError('User');
    return sanitizeUser(updated);
  }

  async DeactivateUser(userId: string): Promise<void> {
    const success = await this.repo.Deactivate(userId);
    if (!success) throw new NotFoundError('User');
  }
}
