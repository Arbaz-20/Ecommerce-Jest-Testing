import {
  calculateTax,
  applyDiscount,
  calculateOrderTotal,
  isValidEmail,
  isValidPrice,
  paginate,
} from '../../../src/shared/utils';

describe('Shared Utilities — Unit Tests', () => {
  // ── calculateTax ──────────────────────────────────────────────
  describe('calculateTax()', () => {
    it('should calculate 8% tax by default', () => {
      expect(calculateTax(100)).toBe(8);
      expect(calculateTax(250)).toBe(20);
    });

    it('should use custom tax rate', () => {
      expect(calculateTax(100, 0.10)).toBe(10);
      expect(calculateTax(200, 0.05)).toBe(10);
    });

    it('should handle zero subtotal', () => {
      expect(calculateTax(0)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateTax(33.33)).toBe(2.67);
    });
  });

  // ── applyDiscount ─────────────────────────────────────────────
  describe('applyDiscount()', () => {
    it('should apply percentage discount', () => {
      expect(applyDiscount(100, 'percentage', 10)).toBe(10);
      expect(applyDiscount(200, 'percentage', 25)).toBe(50);
    });

    it('should apply fixed discount', () => {
      expect(applyDiscount(100, 'fixed', 15)).toBe(15);
    });

    it('should cap discount at subtotal for percentage', () => {
      expect(applyDiscount(50, 'percentage', 120)).toBe(50);
    });

    it('should cap discount at subtotal for fixed', () => {
      expect(applyDiscount(10, 'fixed', 50)).toBe(10);
    });

    it('should handle zero discount', () => {
      expect(applyDiscount(100, 'percentage', 0)).toBe(0);
      expect(applyDiscount(100, 'fixed', 0)).toBe(0);
    });
  });

  // ── calculateOrderTotal ───────────────────────────────────────
  describe('calculateOrderTotal()', () => {
    it('should compute subtotal + tax - discount', () => {
      expect(calculateOrderTotal(100, 8, 10)).toBe(98);
      expect(calculateOrderTotal(250, 20, 0)).toBe(270);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateOrderTotal(99.99, 8.33, 5.55)).toBe(102.77);
    });
  });

  // ── isValidEmail ──────────────────────────────────────────────
  describe('isValidEmail()', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('name.last@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@gmail.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('not-email')).toBe(false);
      expect(isValidEmail('@nodomain')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
    });
  });

  // ── isValidPrice ──────────────────────────────────────────────
  describe('isValidPrice()', () => {
    it('should accept valid prices', () => {
      expect(isValidPrice(0)).toBe(true);
      expect(isValidPrice(99.99)).toBe(true);
      expect(isValidPrice(0.01)).toBe(true);
    });

    it('should reject invalid prices', () => {
      expect(isValidPrice(-1)).toBe(false);
      expect(isValidPrice(NaN)).toBe(false);
      expect(isValidPrice(Infinity)).toBe(false);
    });
  });

  // ── paginate ──────────────────────────────────────────────────
  describe('paginate()', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

    it('should return first page', () => {
      const result = paginate(items, 1, 10);
      expect(result.items).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(3);
    });

    it('should return last page with remaining items', () => {
      const result = paginate(items, 3, 10);
      expect(result.items).toHaveLength(5);
    });

    it('should return empty for beyond last page', () => {
      const result = paginate(items, 5, 10);
      expect(result.items).toHaveLength(0);
    });
  });
});
