import { User } from '../../../shared/types';

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'createdAt' | 'email' | 'firstName' | 'lastName';
  sortOrder?: 'asc' | 'desc';
  role?: string;
  isActive?: boolean;
}

export interface IUserRepository {
  FindById(id: string): Promise<User | null>;
  FindAll(options: UserListQuery): Promise<{ items: User[]; total: number }>;
  FindByEmail(email: string): Promise<User | null>;
  Create(
    email: string,
    passwordHash: string,
    firstName: string,
    lastName: string,
    role?: string
  ): Promise<User>;
  UpdateProfile(
    id: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<User | null>;
  Deactivate(id: string): Promise<boolean>;
}
