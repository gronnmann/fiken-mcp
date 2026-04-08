import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, mutate, cp } from "../client.js";

const R = { annotations: { readOnlyHint: true } } as const;
const W = { annotations: { readOnlyHint: false } } as const;
const D = { annotations: { readOnlyHint: false, destructiveHint: true } } as const;

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

const saleLine = z.object({
  description: z.string().optional(),
  vatType: z.string().optional().describe('e.g. "HIGH", "NONE", "LOW"'),
  netAmount: z.number().int().optional().describe("Net amount in NOK øre"),
  vat: z.number().int().optional(),
  grossAmount: z.number().int().optional(),
  account: z.string().optional().describe('Account code, e.g. "3000"'),
  projectId: z.number().int().optional(),
});

const draftSchema = z.object({
  type: z.string().optional(),
  date: z.string().optional().describe("YYYY-MM-DD"),
  invoiceText: z.string().optional(),
  currency: z.string().optional(),
  paymentDate: z.string().optional().describe("YYYY-MM-DD"),
  paymentFee: z.number().int().optional().describe("Payment fee in NOK øre"),
  paymentAccount: z.string().optional(),
  customer: z.object({ contactId: z.number().int() }).optional(),
  projectId: z.number().int().optional(),
  lines: z.array(saleLine).optional(),
});

export function register(server: McpServer) {
  server.registerTool(
    "fiken_list_sales",
    {
      ...R,
      description: "Returns all sales for the company",
      inputSchema: z.object({
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
        sortBy: z.string().optional(),
        date: z.string().optional().describe("YYYY-MM-DD"),
        dateLe: z.string().optional(),
        dateLt: z.string().optional(),
        dateGe: z.string().optional(),
        dateGt: z.string().optional(),
        lastModifiedLe: z.string().optional(),
        lastModifiedGe: z.string().optional(),
        customerId: z.number().int().optional(),
        settled: z.boolean().optional(),
        saleNumber: z.string().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/sales"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_create_sale",
    {
      ...W,
      description: "Creates a new sale. Amounts in NOK øre.",
      inputSchema: z.object({
        date: z.string().describe("Sale date YYYY-MM-DD"),
        kind: z.enum(["cash_sale", "invoice", "external_invoice"]).optional(),
        totalPaid: z.number().int().optional().describe("Total paid in NOK øre"),
        totalPaidInCurrency: z.number().int().optional(),
        currency: z.string().optional(),
        saleNumber: z.string().optional(),
        customer: z.object({ contactId: z.number().int() }).optional(),
        paymentDate: z.string().optional(),
        paymentFee: z.number().int().optional(),
        paymentAccount: z.string().optional(),
        projectId: z.number().int().optional(),
        lines: z.array(saleLine),
      }),
    },
    async (body) => {
      try {
        return ok(await mutate("POST", cp("/sales"), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_sale",
    {
      ...R,
      description: "Returns a specific sale by ID",
      inputSchema: z.object({ saleId: z.number().int() }),
    },
    async ({ saleId }) => {
      try {
        return ok(await get(cp(`/sales/${saleId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_delete_sale",
    {
      ...D,
      description: "Deletes a sale",
      inputSchema: z.object({ saleId: z.number().int() }),
    },
    async ({ saleId }) => {
      try {
        return ok(await mutate("DELETE", cp(`/sales/${saleId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_sale_attachments",
    {
      ...R,
      description: "Returns all attachments for a sale",
      inputSchema: z.object({ saleId: z.number().int() }),
    },
    async ({ saleId }) => {
      try {
        return ok(await get(cp(`/sales/${saleId}/attachments`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_list_sale_drafts",
    {
      ...R,
      description: "Returns all sale drafts for the company",
      inputSchema: z.object({
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/sales/drafts"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_create_sale_draft",
    {
      ...W,
      description: "Creates a new sale draft",
      inputSchema: draftSchema,
    },
    async (body) => {
      try {
        return ok(await mutate("POST", cp("/sales/drafts"), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_sale_draft",
    {
      ...R,
      description: "Returns a specific sale draft",
      inputSchema: z.object({ draftId: z.number().int() }),
    },
    async ({ draftId }) => {
      try {
        return ok(await get(cp(`/sales/drafts/${draftId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_update_sale_draft",
    {
      ...W,
      description: "Updates a sale draft",
      inputSchema: z.object({ draftId: z.number().int(), ...draftSchema.shape }),
    },
    async ({ draftId, ...body }) => {
      try {
        return ok(await mutate("PUT", cp(`/sales/drafts/${draftId}`), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_delete_sale_draft",
    {
      ...D,
      description: "Deletes a sale draft",
      inputSchema: z.object({ draftId: z.number().int() }),
    },
    async ({ draftId }) => {
      try {
        return ok(await mutate("DELETE", cp(`/sales/drafts/${draftId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_sale_draft_attachments",
    {
      ...R,
      description: "Returns all attachments for a sale draft",
      inputSchema: z.object({ draftId: z.number().int() }),
    },
    async ({ draftId }) => {
      try {
        return ok(await get(cp(`/sales/drafts/${draftId}/attachments`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_create_sale_from_draft",
    {
      ...W,
      description: "Creates a finalized sale from a draft",
      inputSchema: z.object({ draftId: z.number().int() }),
    },
    async ({ draftId }) => {
      try {
        return ok(await mutate("POST", cp(`/sales/drafts/${draftId}/createSale`)));
      } catch (e) {
        return err(e);
      }
    },
  );
}
