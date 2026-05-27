import bcrypt from 'bcryptjs';
import { UserService } from '../../../src/modules/user/user.service';
import { UserRepository } from '../../../src/modules/user/user.repository';
import { testUsers, invalidUsers } from '../../fixtures/testData';

jest.mock('../../../src/modules/user/user.repository');
jest.mock('../../../src/shared/database');

describe('UserService — Unit Tests', () => {
  let service: UserService;
  let mockRepo: jest.Mocked<UserRepository>;

  const mockUser = {
    id: 'user-001',
    email: 'customer@ecommerce.test',
    passwordHash: '$2a$10$hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    role: 'customer' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = new UserRepository() as jest.Mocked<UserRepository>;
    service = new UserService(mockRepo);
  });

  // ── register ──────────────────────────────────────────────────
  describe('register()', () => {
    it('should register a new user and return token', async () => {
      mockRepo.FindByEmail.mockResolvedValueOnce(null);
      mockRepo.Create.mockResolvedValueOnce(mockUser);

      const result = await service.RegisterUser(testUsers.customer);

      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockRepo.Create).toHaveBeenCalledWith(
        testUsers.customer.email.toLowerCase(),
        expect.any(String), // hashed password
        testUsers.customer.firstName,
        testUsers.customer.lastName
      );
    });

    it('should throw ConflictError for duplicate email', async () => {
      mockRepo.FindByEmail.mockResolvedValueOnce(mockUser);

      await expect(service.RegisterUser(testUsers.customer)).rejects.toThrow(
        'Email already registered'
      );
    });

    it('should throw ValidationError for invalid email', async () => {
      await expect(
        service.RegisterUser(invalidUsers.invalidEmail as any)
      ).rejects.toThrow('Valid email is required');
    });

    it('should throw ValidationError for short password', async () => {
      await expect(
        service.RegisterUser(invalidUsers.shortPassword as any)
      ).rejects.toThrow('at least 8 characters');
    });

    it('should throw ValidationError for missing first name', async () => {
      await expect(
        service.RegisterUser(invalidUsers.missingFirstName as any)
      ).rejects.toThrow('First name is required');
    });
  });

  // ── login ─────────────────────────────────────────────────────
  describe('login()', () => {
    it('should login with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('CustPass123!', 10);
      mockRepo.FindByEmail.mockResolvedValueOnce({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      const result = await service.LoginUser({
        email: 'customer@ecommerce.test',
        password: 'CustPass123!',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('customer@ecommerce.test');
    });

    it('should throw for non-existent user', async () => {
      mockRepo.FindByEmail.mockResolvedValueOnce(null);

      await expect(
        service.LoginUser({ email: 'no@user.com', password: 'pass' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      mockRepo.FindByEmail.mockResolvedValueOnce({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      await expect(
        service.LoginUser({ email: mockUser.email, password: 'wrong-password' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw for deactivated account', async () => {
      mockRepo.FindByEmail.mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.LoginUser({ email: mockUser.email, password: 'anything' })
      ).rejects.toThrow('Account is deactivated');
    });

    it('should throw for missing credentials', async () => {
      await expect(
        service.LoginUser({ email: '', password: '' })
      ).rejects.toThrow('Email and password are required');
    });
  });

  // ── getProfile ────────────────────────────────────────────────
  describe('getProfile()', () => {
    it('should return user profile without password', async () => {
      mockRepo.FindById.mockResolvedValueOnce(mockUser);

      const profile = await service.GetUserProfile('user-001');

      expect(profile).not.toHaveProperty('passwordHash');
      expect(profile.email).toBe(mockUser.email);
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockRepo.FindById.mockResolvedValueOnce(null);

      await expect(service.GetUserProfile('nope')).rejects.toThrow('User not found');
    });
  });

  // ── deactivateAccount ─────────────────────────────────────────
  describe('deactivateAccount()', () => {
    it('should deactivate an existing user', async () => {
      mockRepo.Deactivate.mockResolvedValueOnce(true);

      await expect(
        service.DeactivateUser('user-001')
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundError for non-existent user', async () => {
      mockRepo.Deactivate.mockResolvedValueOnce(false);

      await expect(service.DeactivateUser('nope')).rejects.toThrow(
        'User not found'
      );
    });
  });
});
