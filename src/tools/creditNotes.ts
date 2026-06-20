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

const creditNoteLine = z.object({
    incomeAccount: z.string().optional(),
    vatType: z.string().optional(),
    unitPrice: z.number().int(),
    quantity: z.number(),
    discount: z.number().optional(),
    productId: z.number().int().optional(),
    description: z.string().optional(),
    comment: z.string().optional(),
});

const roundingType = z
    .enum(["none", "round_half", "round_whole", "round_down_half", "round_down_whole"])
    .optional();

const draftSchema = z.object({
    type: z.enum(["invoice", "cash_invoice", "offer", "order_confirmation", "credit_note"]),
    uuid: z.string().optional(),
    issueDate: z.string().optional().describe("YYYY-MM-DD"),
    daysUntilDueDate: z.number().int(),
    invoiceText: z.string().optional(),
    yourReference: z.string().optional(),
    ourReference: z.string().optional(),
    orderReference: z.string().optional(),
    lines: z
        .array(
            z.object({
                invoiceishDraftLineId: z.number().int().optional(),
                description: z.string().optional(),
                unitPrice: z.number().int().optional(),
                vatType: z.string().optional(),
                quantity: z.number(),
                discount: z.number().optional(),
                productId: z.number().int().optional(),
                comment: z.string().optional(),
                incomeAccount: z.string().optional(),
            }),
        )
        .optional(),
    currency: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
    paymentAccount: z.string().optional(),
    customerId: z.number().int().describe("Customer contact ID"),
    contactPersonId: z.number().int().optional(),
    projectId: z.number().int().optional(),
    roundingType,
});

export function register(server: McpServer) {
    server.registerTool(
        "fiken_list_credit_notes",
        {
            ...R,
            description: "Returns all credit notes for the company",
            inputSchema: z.object({
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
                issueDate: z.string().optional(),
                issueDateLe: z.string().optional(),
                issueDateLt: z.string().optional(),
                issueDateGe: z.string().optional(),
                issueDateGt: z.string().optional(),
                lastModifiedLe: z.string().optional(),
                lastModifiedGe: z.string().optional(),
                customerId: z.number().int().optional(),
                settled: z.boolean().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/creditNotes"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_credit_note",
        {
            ...R,
            description: "Returns a specific credit note by ID",
            inputSchema: z.object({ creditNoteId: z.number().int() }),
        },
        async ({ creditNoteId }) => {
            try {
                return ok(await get(cp(`/creditNotes/${creditNoteId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_full_credit_note",
        {
            ...W,
            description: "Creates a credit note covering the full amount of an invoice",
            inputSchema: z.object({
                issueDate: z.string().describe("Issue date YYYY-MM-DD"),
                invoiceId: z.number().int().describe("ID of the invoice to credit"),
                creditNoteText: z.string().optional(),
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/creditNotes/full"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_partial_credit_note",
        {
            ...W,
            description:
                "Creates a credit note for a partial amount of an invoice. Lines must total less than the original invoice.",
            inputSchema: z.object({
                ourReference: z.string().optional(),
                yourReference: z.string().optional(),
                orderReference: z.string().optional(),
                project: z.number().int().optional(),
                currency: z.string().optional().describe('ISO 4217, e.g. "NOK"'),
                issueDate: z.string().describe("Issue date YYYY-MM-DD"),
                invoiceId: z.number().int().optional().describe("ID of the invoice to credit"),
                contactId: z.number().int().optional(),
                contactPersonId: z.number().int().optional(),
                creditNoteText: z.string().optional(),
                lines: z.array(creditNoteLine),
                roundingType,
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/creditNotes/partial"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_send_credit_note",
        {
            ...W,
            description: "Sends a credit note via email and/or EHF",
            inputSchema: z.object({
                creditNoteId: z.number().int(),
                method: z.array(z.enum(["email", "ehf", "efaktura", "sms", "letter", "auto"])),
                includeDocumentAttachments: z.boolean(),
                recipientName: z.string().optional(),
                recipientEmail: z.string().optional(),
                message: z.string().optional(),
                emailSendOption: z.enum(["document_link", "attachment", "auto"]).optional(),
                mergeInvoiceAndAttachments: z.boolean().optional(),
                organizationNumber: z.string().optional(),
                mobileNumber: z.string().optional(),
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/creditNotes/send"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_credit_note_counter",
        {
            ...R,
            description: "Retrieves the current credit note number counter",
            inputSchema: z.object({}),
        },
        async () => {
            try {
                return ok(await get(cp("/creditNotes/counter")));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_credit_note_counter",
        {
            ...W,
            description: "Creates the first credit note number counter",
            inputSchema: z.object({
                value: z.number().int().optional(),
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/creditNotes/counter"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_list_credit_note_drafts",
        {
            ...R,
            description: "Returns all credit note drafts for the company",
            inputSchema: z.object({
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/creditNotes/drafts"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_credit_note_draft",
        {
            ...W,
            description: "Creates a new credit note draft",
            inputSchema: draftSchema,
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/creditNotes/drafts"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_credit_note_draft",
        {
            ...R,
            description: "Returns a specific credit note draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await get(cp(`/creditNotes/drafts/${draftId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_update_credit_note_draft",
        {
            ...W,
            description: "Updates a credit note draft",
            inputSchema: z.object({ draftId: z.number().int(), ...draftSchema.shape }),
        },
        async ({ draftId, ...body }) => {
            try {
                return ok(await mutate("PUT", cp(`/creditNotes/drafts/${draftId}`), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_delete_credit_note_draft",
        {
            ...D,
            description: "Deletes a credit note draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await mutate("DELETE", cp(`/creditNotes/drafts/${draftId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_credit_note_draft_attachments",
        {
            ...R,
            description: "Returns all attachments for a credit note draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(await get(cp(`/creditNotes/drafts/${draftId}/attachments`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_credit_note_from_draft",
        {
            ...W,
            description: "Creates a finalized credit note from a draft",
            inputSchema: z.object({ draftId: z.number().int() }),
        },
        async ({ draftId }) => {
            try {
                return ok(
                    await mutate("POST", cp(`/creditNotes/drafts/${draftId}/createCreditNote`)),
                );
            } catch (e) {
                return err(e);
            }
        },
    );
}
