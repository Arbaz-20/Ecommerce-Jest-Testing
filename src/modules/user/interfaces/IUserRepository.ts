import { User } from '../../../shared/types';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(
    email: string,
    passwordHash: string,
    firstName: string,
    lastName: string,
    role?: string
  ): Promise<User>;
  updateProfile(
    id: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<User | null>;
  deactivate(id: string): Promise<boolean>;
}
