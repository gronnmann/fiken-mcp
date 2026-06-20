import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, mutate, cp, uploadMultipart } from "../client.js";

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
    description: z.string().describe("Description of the product or service"),
    vatType: z.string().describe('e.g. "HIGH", "NONE", "LOW"'),
    netPrice: z.number().int().optional().describe("Net amount in cents"),
    vat: z.number().int().optional().describe("VAT amount in NOK øre"),
    account: z.string().optional().describe('Account code, e.g. "6540"'),
    netPriceInCurrency: z.number().int().optional().describe("Net amount in currency cents"),
    vatInCurrency: z.number().int().optional().describe("VAT amount in currency cents"),
    projectId: z.number().int().optional(),
});

const paymentSchema = z.object({
    date: z.string().describe("Payment date YYYY-MM-DD"),
    account: z.string().describe('Payment account, e.g. "1920:10001"'),
    amount: z.number().int().describe("Amount paid in cents"),
    amountInNok: z.number().int().optional().describe("NOK amount for foreign currency payments"),
    currency: z.string().optional().describe('ISO 4217, e.g. "NOK"'),
    fee: z.number().int().optional().describe("Payment fee in NOK cents"),
});

const draftLine = z.object({
    text: z.string().describe("Description of the sale/purchase line"),
    vatType: z.string().describe('e.g. "HIGH", "NONE", "LOW"'),
    incomeAccount: z.string().describe('Account code, e.g. "3000"'),
    net: z.number().int().describe("Net amount in cents"),
    gross: z.number().int().describe("Gross amount in cents"),
    projectId: z.number().int().optional(),
});

const draftSchema = z.object({
    invoiceIssueDate: z.string().optional().describe("YYYY-MM-DD"),
    dueDate: z.string().optional().describe("YYYY-MM-DD"),
    invoiceNumber: z.string().optional(),
    contactId: z.number().int().optional().describe("Contact ID"),
    projectId: z.number().int().optional(),
    cash: z.boolean(),
    currency: z.string().optional().describe('ISO 4217, e.g. "NOK"'),
    kid: z.string().optional().describe("Norwegian KID number"),
    paid: z.boolean(),
    payments: z.array(paymentSchema).optional(),
    lines: z.array(draftLine),
});

const attachmentSchema = z
    .object({
        purchaseId: z.number().int(),
        filename: z
            .string()
            .optional()
            .describe(
                "Filename for the attachment. Must end with .png, .jpeg, .jpg, .gif, or .pdf",
            ),
        filePath: z.string().optional().describe("Local path to the attachment file"),
        fileBase64: z.string().optional().describe("Base64-encoded attachment file contents"),
        attachToPayment: z.boolean().optional(),
        attachToSale: z.boolean().optional(),
    })
    .superRefine((value, ctx) => {
        if (!value.filePath && !value.fileBase64) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Either filePath or fileBase64 is required",
            });
        }
        if (value.filePath && value.fileBase64) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Provide only one of filePath or fileBase64",
            });
        }
        if (value.fileBase64 && !value.filename) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "filename is required when using fileBase64",
            });
        }
        if (!value.attachToPayment && !value.attachToSale) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "At least one of attachToPayment or attachToSale must be true",
            });
        }
    });

function assertSupportedAttachmentFilename(filename: string) {
    if (!/\.(png|jpe?g|gif|pdf)$/i.test(filename)) {
        throw new Error("filename must end with .png, .jpeg, .jpg, .gif, or .pdf");
    }
}

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
                paid: z.boolean().optional(),
                settledDate: z.string().optional().describe("YYYY-MM-DD"),
                settledDateLe: z.string().optional(),
                settledDateLt: z.string().optional(),
                settledDateGe: z.string().optional(),
                settledDateGt: z.string().optional(),
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
                identifier: z.string().optional().describe("Invoice/sale number or similar"),
                date: z.string().describe("Payment date YYYY-MM-DD"),
                dueDate: z.string().optional(),
                kind: z
                    .enum(["cash_purchase", "supplier"])
                    .describe("Purchased with cash or through a supplier"),
                lines: z.array(purchaseLine),
                supplierId: z.number().int().optional().describe("Supplier contact ID"),
                currency: z.string().describe('ISO 4217, e.g. "NOK"'),
                paymentAccount: z.string().optional(),
                paymentDate: z.string().optional(),
                paymentAmountInNok: z
                    .number()
                    .int()
                    .optional()
                    .describe("Required for foreign currency payment; cents in NOK"),
                kid: z.string().optional().describe("Norwegian KID number"),
                projectId: z.number().int().optional(),
                paid: z.boolean(),
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
            inputSchema: z.object({
                purchaseId: z.number().int(),
                description: z.string().describe("Reason for deleting the purchase"),
            }),
        },
        async ({ purchaseId, description }) => {
            try {
                return ok(
                    await mutate(
                        "PATCH",
                        `${cp(`/purchases/${purchaseId}/delete`)}?description=${encodeURIComponent(description)}`,
                    ),
                );
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
        "fiken_add_purchase_attachment",
        {
            ...W,
            description: "Creates and adds a new attachment to a purchase",
            inputSchema: attachmentSchema,
        },
        async (rawInput) => {
            try {
                const {
                    purchaseId,
                    filename,
                    filePath,
                    fileBase64,
                    attachToPayment,
                    attachToSale,
                } = attachmentSchema.parse(rawInput);
                const resolvedFilename = filename ?? basename(filePath!);
                assertSupportedAttachmentFilename(resolvedFilename);

                const bytes =
                    fileBase64 !== undefined
                        ? Buffer.from(fileBase64, "base64")
                        : await readFile(filePath!);
                const form = new FormData();
                form.append("filename", resolvedFilename);
                form.append("file", new Blob([bytes]), resolvedFilename);

                return ok(
                    await uploadMultipart(
                        cp(`/purchases/${purchaseId}/attachments`),
                        { attachToPayment, attachToSale },
                        form,
                    ),
                );
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
