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
        "fiken_list_order_confirmations",
        {
            ...R,
            description: "Returns all order confirmations for the company",
            inputSchema: z.object({
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/orderConfirmations"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_order_confirmation",
        {
            ...R,
            description: "Returns a specific order confirmation by ID",
            inputSchema: z.object({ confirmationId: z.number().int() }),
        },
        async ({ confirmationId }) => {
            try {
                return ok(await get(cp(`/orderConfirmations/${confirmationId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_order_confirmation_counter",
        {
            ...R,
            description: "Retrieves the order confirmation number counter",
            inputSchema: z.object({}),
        },
        async () => {
            try {
                return ok(await get(cp("/orderConfirmations/counter")));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_order_confirmation_counter",
        {
            ...W,
            description: "Creates the first order confirmation number counter",
            inputSchema: z.object({ value: z.number().int().optional() }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/orderConfirmations/counter"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_invoice_draft_from_order_confirmation",
        {
            ...W,
            description: "Creates an invoice draft from an order confirmation",
            inputSchema: z.object({ confirmationId: z.number().int() }),
        },
        async ({ confirmationId }) => {
            try {
                return ok(
                    await mutate(
                        "POST",
                        cp(`/orderConfirmations/${confirmationId}/createInvoiceDraft`),
                    ),
                );
            } catch (e) {
                return err(e);
            }
        },
    );
}
