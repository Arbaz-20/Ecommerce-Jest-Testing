import { generateToken } from '../../src/shared/middleware/auth';
import {
  CreateProductDTO,
  RegisterUserDTO,
  ShippingAddress,
  AuthTokenPayload,
} from '../../src/shared/types';

// ── Users ─────────────────────────────────────────────────────────
export const testUsers = {
  admin: {
    email: 'admin@ecommerce.test',
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'User',
  } as RegisterUserDTO,

  customer: {
    email: 'customer@ecommerce.test',
    password: 'CustPass123!',
    firstName: 'John',
    lastName: 'Doe',
  } as RegisterUserDTO,

  customer2: {
    email: 'customer2@ecommerce.test',
    password: 'Cust2Pass123!',
    firstName: 'Jane',
    lastName: 'Smith',
  } as RegisterUserDTO,
};

// ── Products ──────────────────────────────────────────────────────
export const testProducts: CreateProductDTO[] = [
  {
    name: 'Mechanical Keyboard',
    description: 'Cherry MX Blue switches, RGB backlit',
    price: 149.99,
    stock: 50,
    category: 'electronics',
  },
  {
    name: 'Wireless Mouse',
    description: 'Ergonomic design, 2.4GHz wireless',
    price: 49.99,
    stock: 100,
    category: 'electronics',
  },
  {
    name: 'USB-C Hub',
    description: '7-in-1 USB-C hub with HDMI, USB 3.0, SD card',
    price: 39.99,
    stock: 75,
    category: 'electronics',
  },
  {
    name: 'Standing Desk',
    description: 'Electric sit-stand desk, 120cm x 60cm',
    price: 499.99,
    stock: 20,
    category: 'furniture',
  },
  {
    name: 'Monitor Arm',
    description: 'Single arm, supports 27" monitors up to 9kg',
    price: 89.99,
    stock: 30,
    category: 'furniture',
  },
];

// ── Shipping Addresses ────────────────────────────────────────────
export const testAddresses: Record<string, ShippingAddress> = {
  istanbul: {
    street: 'Istiklal Caddesi 42',
    city: 'Istanbul',
    state: 'Istanbul',
    zip: '34000',
    country: 'Turkey',
  },
  newyork: {
    street: '350 5th Avenue',
    city: 'New York',
    state: 'NY',
    zip: '10118',
    country: 'USA',
  },
};

// ── Token Generators ──────────────────────────────────────────────
export function generateAdminToken(userId: string = 'admin-uuid-001'): string {
  return generateToken({
    userId,
    email: testUsers.admin.email,
    role: 'admin',
  });
}

export function generateCustomerToken(userId: string = 'customer-uuid-001'): string {
  return generateToken({
    userId,
    email: testUsers.customer.email,
    role: 'customer',
  });
}

export function generateTokenForUser(payload: AuthTokenPayload): string {
  return generateToken(payload);
}

// ── Invalid Data ──────────────────────────────────────────────────
export const invalidProducts = {
  missingName: {
    name: '',
    description: 'No name product',
    price: 10,
    stock: 5,
    category: 'electronics',
  },
  negativePrice: {
    name: 'Bad Product',
    description: 'Negative price',
    price: -50,
    stock: 5,
    category: 'electronics',
  },
  negativeStock: {
    name: 'Bad Stock Product',
    description: 'Negative stock',
    price: 10,
    stock: -1,
    category: 'electronics',
  },
  missingCategory: {
    name: 'No Category',
    description: 'No category product',
    price: 10,
    stock: 5,
    category: '',
  },
};

export const invalidUsers = {
  shortPassword: {
    email: 'test@test.com',
    password: 'short',
    firstName: 'Test',
    lastName: 'User',
  },
  invalidEmail: {
    email: 'not-an-email',
    password: 'ValidPass123!',
    firstName: 'Test',
    lastName: 'User',
  },
  missingFirstName: {
    email: 'test@test.com',
    password: 'ValidPass123!',
    firstName: '',
    lastName: 'User',
  },
};
