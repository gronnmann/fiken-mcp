import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, mutate, cp, slug } from "../client.js";

const R = { annotations: { readOnlyHint: true } } as const;
const W = { annotations: { readOnlyHint: false, destructiveHint: true } } as const;

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
    "fiken_list_transactions",
    {
      ...R,
      description: "Returns all transactions for the company",
      inputSchema: z.object({
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
        createdDate: z.string().optional().describe("YYYY-MM-DD"),
        createdDateLe: z.string().optional(),
        createdDateLt: z.string().optional(),
        createdDateGe: z.string().optional(),
        createdDateGt: z.string().optional(),
        lastModifiedLe: z.string().optional(),
        lastModifiedGe: z.string().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/transactions"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_transaction",
    {
      ...R,
      description: "Returns a specific transaction by ID",
      inputSchema: z.object({ transactionId: z.number().int() }),
    },
    async ({ transactionId }) => {
      try {
        return ok(await get(cp(`/transactions/${transactionId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_delete_transaction",
    {
      ...W,
      description: "Marks a transaction as deleted and creates a reversing transaction",
      inputSchema: z.object({
        transactionId: z.number().int(),
        description: z.string().describe("Reason for deletion (required by API)"),
      }),
    },
    async ({ transactionId, description }) => {
      const path = `/companies/${slug()}/transactions/${transactionId}/delete?description=${encodeURIComponent(description)}`;
      try {
        return ok(await mutate("PATCH", path));
      } catch (e) {
        return err(e);
      }
    },
  );
}
