import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function calculateTax(subtotal: number, taxRate: number = 0.08): number {
  return Math.round(subtotal * taxRate * 100) / 100;
}

export function applyDiscount(
  subtotal: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    const discount = Math.round(subtotal * (discountValue / 100) * 100) / 100;
    return Math.min(discount, subtotal);
  }
  return Math.min(discountValue, subtotal);
}

export function calculateOrderTotal(
  subtotal: number,
  tax: number,
  discount: number
): number {
  return Math.round((subtotal + tax - discount) * 100) / 100;
}

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidPrice(price: number): boolean {
  return typeof price === 'number' && price >= 0 && isFinite(price);
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function sanitizeUser(user: any): any {
  const { passwordHash, password_hash, ...safe } = user;
  return safe;
}
