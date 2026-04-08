import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';

vi.mock('../../client.js', () => ({
  get: vi.fn(),
  mutate: vi.fn(),
  cp: vi.fn((path: string) => `/companies/test-slug${path}`),
  slug: vi.fn(() => 'test-slug'),
}));

import { get, mutate } from '../../client.js';
import { register } from '../../tools/journalEntries.js';
import { createMockServer } from '../helpers.js';

const mockGet = vi.mocked(get);
const mockMutate = vi.mocked(mutate);
const server = createMockServer();

beforeAll(() => { register(server); });
beforeEach(() => { vi.clearAllMocks(); });

describe('fiken_list_journal_entries', () => {
  it('calls GET /journalEntries with filters', async () => {
    const data = [{ journalEntryId: 1 }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 25, date: '2024-01-01', dateLe: '2024-12-31' };
    const result = await server.getHandler('fiken_list_journal_entries')(params);
    expect(mockGet).toHaveBeenCalledWith('/companies/test-slug/journalEntries', params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it('returns error on failure', async () => {
    mockGet.mockRejectedValue(new Error('Fiken 401: Unauthorized'));
    const result = await server.getHandler('fiken_list_journal_entries')({});
    expect(result.isError).toBe(true);
  });

  it('handles non-Error thrown values', async () => {
    mockGet.mockRejectedValue('plain string error');
    const result = await server.getHandler('fiken_list_journal_entries')({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Error: plain string error');
  });
});

describe('fiken_get_journal_entry', () => {
  it('calls GET /journalEntries/{journalEntryId}', async () => {
    const data = { journalEntryId: 1, description: 'Test entry' };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler('fiken_get_journal_entry')({ journalEntryId: 1 });
    expect(mockGet).toHaveBeenCalledWith('/companies/test-slug/journalEntries/1');
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it('returns error on failure', async () => {
    mockGet.mockRejectedValue(new Error('Fiken 404: Not Found'));
    const result = await server.getHandler('fiken_get_journal_entry')({ journalEntryId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe('fiken_get_journal_entry_attachments', () => {
  it('calls GET /journalEntries/{journalEntryId}/attachments', async () => {
    const data = [{ fileName: 'receipt.pdf' }];
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler('fiken_get_journal_entry_attachments')({ journalEntryId: 1 });
    expect(mockGet).toHaveBeenCalledWith('/companies/test-slug/journalEntries/1/attachments');
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it('returns error on failure', async () => {
    mockGet.mockRejectedValue(new Error('Fiken 404: Not Found'));
    const result = await server.getHandler('fiken_get_journal_entry_attachments')({ journalEntryId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe('fiken_create_journal_entry', () => {
  it('calls POST /generalJournalEntries with body', async () => {
    mockMutate.mockResolvedValue({ created: true, location: '/companies/test-slug/journalEntries/1' });
    const body = {
      description: 'Correction entry',
      journalEntryDate: '2024-01-15',
      lines: [{
        amount: 100000,
        debitAccount: '1920',
        creditAccount: '3000',
      }],
    };
    const result = await server.getHandler('fiken_create_journal_entry')(body);
    expect(mockMutate).toHaveBeenCalledWith('POST', '/companies/test-slug/generalJournalEntries', body);
    expect(result.content[0].text).toContain('created');
  });

  it('returns error on failure', async () => {
    mockMutate.mockRejectedValue(new Error('Fiken 400: Bad Request'));
    const result = await server.getHandler('fiken_create_journal_entry')({
      description: 'Bad',
      journalEntryDate: '2024-01-01',
      lines: [],
    });
    expect(result.isError).toBe(true);
  });
});
