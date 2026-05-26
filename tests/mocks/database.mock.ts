/**
 * Mock database module for unit tests.
 * Replaces the real pg pool with in-memory jest mock functions.
 */

const mockQuery = jest.fn();
const mockGetOne = jest.fn();
const mockGetMany = jest.fn();
const mockGetPool = jest.fn().mockReturnValue({ query: mockQuery, end: jest.fn() });

jest.mock('../../src/shared/database', () => ({
  query: mockQuery,
  getOne: mockGetOne,
  getMany: mockGetMany,
  getPool: mockGetPool,
  setPool: jest.fn(),
  closePool: jest.fn(),
}));

export { mockQuery, mockGetOne, mockGetMany, mockGetPool };

// Helper to reset all mocks between tests
export function resetDbMocks(): void {
  mockQuery.mockReset();
  mockGetOne.mockReset();
  mockGetMany.mockReset();
}

// Helper to mock a successful INSERT/UPDATE RETURNING
export function mockQueryReturning<T>(data: T): void {
  mockQuery.mockResolvedValueOnce({ rows: [data], rowCount: 1 });
}

// Helper to mock a SELECT COUNT query
export function mockQueryCount(count: number): void {
  mockQuery.mockResolvedValueOnce({ rows: [{ count: String(count) }] });
}

// Helper to mock a DELETE
export function mockQueryDelete(deleted: boolean): void {
  mockQuery.mockResolvedValueOnce({ rowCount: deleted ? 1 : 0 });
}
