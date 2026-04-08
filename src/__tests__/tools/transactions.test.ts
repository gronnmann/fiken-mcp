import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';

vi.mock('../../client.js', () => ({
  get: vi.fn(),
  mutate: vi.fn(),
  cp: vi.fn((path: string) => `/companies/test-slug${path}`),
  slug: vi.fn(() => 'test-slug'),
}));

import { get, mutate } from '../../client.js';
import { register } from '../../tools/transactions.js';
import { createMockServer } from '../helpers.js';

const mockGet = vi.mocked(get);
const mockMutate = vi.mocked(mutate);
const server = createMockServer();

beforeAll(() => { register(server); });
beforeEach(() => { vi.clearAllMocks(); });

describe('fiken_list_transactions', () => {
  it('calls GET /transactions with filters', async () => {
    const data = [{ transactionId: 1 }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 25, createdDate: '2024-01-01' };
    const result = await server.getHandler('fiken_list_transactions')(params);
    expect(mockGet).toHaveBeenCalledWith('/companies/test-slug/transactions', params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it('returns error on failure', async () => {
    mockGet.mockRejectedValue(new Error('Fiken 401: Unauthorized'));
    const result = await server.getHandler('fiken_list_transactions')({});
    expect(result.isError).toBe(true);
  });

  it('handles non-Error thrown values', async () => {
    mockGet.mockRejectedValue({ code: 500 });
    const result = await server.getHandler('fiken_list_transactions')({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Error: [object Object]');
  });
});

describe('fiken_get_transaction', () => {
  it('calls GET /transactions/{transactionId}', async () => {
    const data = { transactionId: 42, description: 'Test' };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler('fiken_get_transaction')({ transactionId: 42 });
    expect(mockGet).toHaveBeenCalledWith('/companies/test-slug/transactions/42');
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it('returns error on failure', async () => {
    mockGet.mockRejectedValue(new Error('Fiken 404: Not Found'));
    const result = await server.getHandler('fiken_get_transaction')({ transactionId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe('fiken_delete_transaction', () => {
  it('calls PATCH /companies/{slug}/transactions/{id}/delete?description=...', async () => {
    mockMutate.mockResolvedValue({ success: true });
    const result = await server.getHandler('fiken_delete_transaction')({
      transactionId: 42,
      description: 'Test reason',
    });
    expect(mockMutate).toHaveBeenCalledWith(
      'PATCH',
      '/companies/test-slug/transactions/42/delete?description=Test%20reason',
    );
    expect(result.isError).toBeUndefined();
  });

  it('encodes special characters in description', async () => {
    mockMutate.mockResolvedValue({ success: true });
    await server.getHandler('fiken_delete_transaction')({
      transactionId: 1,
      description: 'Reason & more',
    });
    expect(mockMutate).toHaveBeenCalledWith(
      'PATCH',
      '/companies/test-slug/transactions/1/delete?description=Reason%20%26%20more',
    );
  });

  it('returns error on failure', async () => {
    mockMutate.mockRejectedValue(new Error('Fiken 404: Not Found'));
    const result = await server.getHandler('fiken_delete_transaction')({
      transactionId: 999,
      description: 'Gone',
    });
    expect(result.isError).toBe(true);
  });
});
