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

const purchaseLine = z.object({
    description: z.string().optional(),
    vatType: z.string().optional().describe('e.g. "HIGH", "NONE", "LOW"'),
    netAmount: z.number().int().optional().describe("Net amount in NOK øre"),
    vat: z.number().int().optional().describe("VAT amount in NOK øre"),
    grossAmount: z.number().int().optional().describe("Gross amount in NOK øre"),
    account: z.string().optional().describe('Account code, e.g. "6540"'),
    projectId: z.number().int().optional(),
});

const draftSchema = z.object({
    description: z.string().optional(),
    purchaseDate: z.string().optional().describe("YYYY-MM-DD"),
    dueDate: z.string().optional().describe("YYYY-MM-DD"),
    supplier: z.object({ contactId: z.number().int() }).optional(),
    cash: z.boolean().optional(),
    paymentAccount: z.string().optional().describe('Account code for payment, e.g. "1920:10001"'),
    identifier: z.string().optional().describe("Supplier invoice number"),
    currency: z.string().optional().describe('ISO 4217, e.g. "NOK"'),
    lines: z.array(purchaseLine).optional(),
    projectId: z.number().int().optional(),
    paid: z.boolean().optional(),
    paymentDate: z.string().optional().describe("YYYY-MM-DD"),
});

export function register(server: McpServer) {
    server.registerTool(
        "fiken_list_purchases",
        {
            ...R,
            description: "Returns all purchases for the company",
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
                supplierId: z.number().int().optional(),
                paid: z.boolean().optional(),
                kind: z.string().optional().describe('e.g. "supplier_purchase", "cash_purchase"'),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/purchases"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_purchase",
        {
            ...W,
            description: "Creates a new purchase. Amounts in NOK øre.",
            inputSchema: z.object({
                description: z.string().optional(),
                kind: z
                    .enum(["supplier_purchase", "cash_purchase", "foreign_purchase_credit_card"])
                    .optional(),
                transactionDate: z.string().describe("YYYY-MM-DD"),
                dueDate: z.string().optional(),
                supplier: z.object({ contactId: z.number().int() }).optional(),
                cash: z.boolean().optional(),
                paymentAccount: z.string().optional(),
                bankAccountCode: z.string().optional(),
                identifier: z.string().optional().describe("Supplier invoice number"),
                currency: z.string().optional(),
                lines: z.array(purchaseLine),
                projectId: z.number().int().optional(),
                paid: z.boolean().optional(),
                paymentDate: z.string().optional(),
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/purchases"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_purchase",
        {
            ...R,
            description: "Returns a specific purchase by ID",
            inputSchema: z.object({ purchaseId: z.number().int() }),
        },
        async ({ purchaseId }) => {
            try {
                return ok(await get(cp(`/purchases/${purchaseId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_delete_purchase",
        {
            ...D,
            description: "Deletes a purchase",
            inputSchema: z.object({ purchaseId: z.number().int() }),
        },
        async ({ purchaseId }) => {
            try {
                return ok(await mutate("DELETE", cp(`/purchases/${purchaseId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_purchase_attachments",
        {
            ...R,
            description: "Returns all attachments for a purchase",
            inputSchema: z.object({ purchaseId: z.number().int() }),
        },
        async ({ purchaseId }) => {
            try {
                return ok(await get(cp(`/purchases/${purchaseId}/attachments`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_list_purchase_drafts",
        {
            ...R,
            description: "Returns all purchase drafts for the company",
            inputSchema: z.object({
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/purchases/drafts"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_purchase_draft",
        {
            ...W,
            description: "Creates a new purchase draft",
            inputSchema: draftSchema,
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/purchases/drafts"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_purchase_draft",
        {
            ...R,
            description: "Returns a specific purchase draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await get(cp(`/purchases/drafts/${draftId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_update_purchase_draft",
        {
            ...W,
            description: "Updates a purchase draft",
            inputSchema: z.object({ draftId: z.number().int(), ...draftSchema.shape }),
        },
        async ({ draftId, ...body }) => {
            try {
                return ok(await mutate("PUT", cp(`/purchases/drafts/${draftId}`), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_delete_purchase_draft",
        {
            ...D,
            description: "Deletes a purchase draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await mutate("DELETE", cp(`/purchases/drafts/${draftId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_purchase_draft_attachments",
        {
            ...R,
            description: "Returns all attachments for a purchase draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await get(cp(`/purchases/drafts/${draftId}/attachments`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_purchase_from_draft",
        {
            ...W,
            description: "Creates a finalized purchase from a draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await mutate("POST", cp(`/purchases/drafts/${draftId}/createPurchase`)));
            } catch (e) {
                return err(e);
            }
        },
    );
}
