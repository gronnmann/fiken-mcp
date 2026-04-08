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

const invoiceLine = z.object({
    description: z.string().optional(),
    netPrice: z.number().int().optional().describe("Net price in NOK øre (cents)"),
    vat: z.number().int().optional().describe("VAT amount in NOK øre"),
    vatType: z
        .string()
        .optional()
        .describe('VAT type, e.g. "HIGH", "NONE", "LOW", "EXEMPT_IMPORT_EXPORT"'),
    unit: z.string().optional(),
    unitPrice: z.number().int().optional().describe("Unit price in NOK øre"),
    quantity: z.number().optional(),
    discount: z.number().optional().describe("Discount percentage"),
    productId: z.number().int().optional(),
    account: z.string().optional().describe('Account code, e.g. "3000"'),
    comment: z.string().optional(),
    incomeAccount: z.string().optional(),
    projectId: z.number().int().optional(),
});

const draftSchema = z.object({
    type: z.enum(["invoice", "offer", "order_confirmation", "credit_note"]).optional(),
    uuid: z.string().optional(),
    issueDate: z.string().optional().describe("YYYY-MM-DD"),
    daysUntilDueDate: z.number().int().optional(),
    invoiceText: z.string().optional(),
    yourReference: z.string().optional(),
    ourReference: z.string().optional(),
    orderReference: z.string().optional(),
    lines: z.array(invoiceLine).optional(),
    currency: z.string().optional().describe('ISO 4217, e.g. "NOK"'),
    bankAccountNumber: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
    paymentAccount: z.string().optional().describe("Account code for payment"),
    contactId: z.number().int().optional(),
    contactPersonId: z.number().int().optional(),
    projectId: z.number().int().optional(),
});

export function register(server: McpServer) {
    server.registerTool(
        "fiken_list_invoices",
        {
            ...R,
            description: "Returns all invoices for the company",
            inputSchema: z.object({
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
                issueDate: z.string().optional().describe("YYYY-MM-DD"),
                issueDateLe: z.string().optional(),
                issueDateLt: z.string().optional(),
                issueDateGe: z.string().optional(),
                issueDateGt: z.string().optional(),
                lastModified: z.string().optional(),
                lastModifiedLe: z.string().optional(),
                lastModifiedLt: z.string().optional(),
                lastModifiedGe: z.string().optional(),
                lastModifiedGt: z.string().optional(),
                customerId: z.number().int().optional(),
                settled: z.boolean().optional(),
                orderReference: z.string().optional(),
                invoiceNumber: z.number().int().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/invoices"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_invoice",
        {
            ...W,
            description: "Creates a new invoice. Amounts are in NOK øre (cents).",
            inputSchema: z.object({
                issueDate: z.string().describe("Issue date YYYY-MM-DD (required)"),
                dueDate: z.string().optional().describe("Due date YYYY-MM-DD"),
                daysUntilDueDate: z.number().int().optional(),
                lines: z.array(invoiceLine).describe("Invoice line items (required)"),
                customerId: z.number().int().optional().describe("Contact ID of the customer"),
                bankAccountCode: z.string().optional().describe("Bank account code for payment"),
                cash: z.boolean().optional().describe("True if paid immediately by cash"),
                invoiceText: z.string().optional(),
                yourReference: z.string().optional(),
                ourReference: z.string().optional(),
                orderReference: z.string().optional(),
                contactPersonId: z.number().int().optional(),
                currency: z.string().optional().describe('ISO 4217, e.g. "NOK"'),
                paymentAccount: z
                    .string()
                    .optional()
                    .describe("Account code, required if cash=true"),
                projectId: z.number().int().optional(),
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/invoices"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_invoice",
        {
            ...R,
            description: "Returns a specific invoice by ID",
            inputSchema: z.object({
                invoiceId: z.number().int(),
            }),
        },
        async ({ invoiceId }) => {
            try {
                return ok(await get(cp(`/invoices/${invoiceId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_update_invoice",
        {
            ...W,
            description: "Updates an invoice (due date and/or manual send status)",
            inputSchema: z.object({
                invoiceId: z.number().int(),
                dueDate: z.string().optional().describe("New due date YYYY-MM-DD"),
                sentManually: z.boolean().optional().describe("Mark invoice as manually sent"),
            }),
        },
        async ({ invoiceId, ...body }) => {
            try {
                return ok(await mutate("PATCH", cp(`/invoices/${invoiceId}`), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_invoice_attachments",
        {
            ...R,
            description: "Returns all attachments for an invoice",
            inputSchema: z.object({
                invoiceId: z.number().int(),
            }),
        },
        async ({ invoiceId }) => {
            try {
                return ok(await get(cp(`/invoices/${invoiceId}/attachments`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_send_invoice",
        {
            ...W,
            description: "Sends an invoice via email and/or EHF",
            inputSchema: z.object({
                invoiceId: z.number().int(),
                method: z
                    .array(z.enum(["email", "ehf", "vipps", "efaktura", "auto"]))
                    .describe("Delivery methods"),
                includeDocumentAttachments: z.boolean().optional(),
                recipientName: z.string().optional(),
                recipientEmail: z.string().optional(),
                message: z.string().optional(),
                emailSendOption: z.string().optional(),
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/invoices/send"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_invoice_counter",
        {
            ...R,
            description: "Retrieves the current invoice number counter",
            inputSchema: z.object({}),
        },
        async () => {
            try {
                return ok(await get(cp("/invoices/counter")));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_invoice_counter",
        {
            ...W,
            description: "Creates the first invoice number counter",
            inputSchema: z.object({
                value: z.number().int().optional().describe("Starting invoice number"),
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/invoices/counter"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_list_invoice_drafts",
        {
            ...R,
            description: "Returns all invoice drafts for the company",
            inputSchema: z.object({
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
                orderReference: z.string().optional(),
                uuid: z.string().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/invoices/drafts"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_invoice_draft",
        {
            ...W,
            description: "Creates a new invoice draft",
            inputSchema: draftSchema,
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/invoices/drafts"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_invoice_draft",
        {
            ...R,
            description: "Returns a specific invoice draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await get(cp(`/invoices/drafts/${draftId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_update_invoice_draft",
        {
            ...W,
            description: "Updates an existing invoice draft",
            inputSchema: z.object({ draftId: z.number().int(), ...draftSchema.shape }),
        },
        async ({ draftId, ...body }) => {
            try {
                return ok(await mutate("PUT", cp(`/invoices/drafts/${draftId}`), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_delete_invoice_draft",
        {
            ...D,
            description: "Deletes an invoice draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await mutate("DELETE", cp(`/invoices/drafts/${draftId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_invoice_draft_attachments",
        {
            ...R,
            description: "Returns all attachments for an invoice draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await get(cp(`/invoices/drafts/${draftId}/attachments`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_invoice_from_draft",
        {
            ...W,
            description: "Creates a finalized invoice from a draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await mutate("POST", cp(`/invoices/drafts/${draftId}/createInvoice`)));
            } catch (e) {
                return err(e);
            }
        },
    );
}
