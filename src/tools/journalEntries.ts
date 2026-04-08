import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, mutate, cp } from "../client.js";

const R = { annotations: { readOnlyHint: true } } as const;
const W = { annotations: { readOnlyHint: false } } as const;

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(e: unknown) {
  return {
    content: [
      { type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` },
    ],
    isError: true as const,
  };
}

export function register(server: McpServer) {
  server.registerTool(
    "fiken_list_journal_entries",
    {
      ...R,
      description: "Returns all general journal entries for the company",
      inputSchema: z.object({
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
        date: z.string().optional().describe("YYYY-MM-DD"),
        dateLe: z.string().optional(),
        dateLt: z.string().optional(),
        dateGe: z.string().optional(),
        dateGt: z.string().optional(),
        lastModifiedLe: z.string().optional(),
        lastModifiedGe: z.string().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/journalEntries"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_journal_entry",
    {
      ...R,
      description: "Returns a specific journal entry by ID",
      inputSchema: z.object({ journalEntryId: z.number().int() }),
    },
    async ({ journalEntryId }) => {
      try {
        return ok(await get(cp(`/journalEntries/${journalEntryId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_journal_entry_attachments",
    {
      ...R,
      description: "Returns all attachments for a journal entry",
      inputSchema: z.object({ journalEntryId: z.number().int() }),
    },
    async ({ journalEntryId }) => {
      try {
        return ok(await get(cp(`/journalEntries/${journalEntryId}/attachments`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_create_journal_entry",
    {
      ...W,
      description: "Creates a new general journal entry. Amounts are in NOK øre (cents).",
      inputSchema: z.object({
        description: z.string().describe("Description of the journal entry"),
        journalEntryDate: z.string().describe("Date YYYY-MM-DD"),
        open: z.boolean().optional().describe("Whether the entry is open"),
        lines: z
          .array(
            z.object({
              amount: z.number().int().describe("Amount in NOK øre"),
              debitAccount: z.string().describe('Debit account code, e.g. "1920"'),
              debitVatCode: z.number().int().optional(),
              creditAccount: z.string().describe('Credit account code, e.g. "3000"'),
              creditVatCode: z.number().int().optional(),
              projectId: z.number().int().optional(),
            }),
          )
          .describe("Journal entry lines (required, debits must equal credits)"),
      }),
    },
    async (body) => {
      try {
        return ok(await mutate("POST", cp("/generalJournalEntries"), body));
      } catch (e) {
        return err(e);
      }
    },
  );
}
