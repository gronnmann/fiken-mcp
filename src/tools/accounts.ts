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
        "fiken_list_accounts",
        {
            ...R,
            description: "Retrieves bookkeeping accounts for the current year",
            inputSchema: z.object({
                fromAccount: z.string().optional().describe("Filter from account code"),
                toAccount: z.string().optional().describe("Filter to account code"),
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/accounts"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_account",
        {
            ...R,
            description: "Retrieves a specific bookkeeping account by account code",
            inputSchema: z.object({
                accountCode: z.string().describe('Account code, e.g. "3020" or "1500:10001"'),
            }),
        },
        async ({ accountCode }) => {
            try {
                return ok(await get(cp(`/accounts/${accountCode}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_list_account_balances",
        {
            ...R,
            description: "Retrieves accounts and closing balances for a given date",
            inputSchema: z.object({
                date: z.string().describe("Date in YYYY-MM-DD format (required)"),
                fromAccount: z.string().optional(),
                toAccount: z.string().optional(),
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/accountBalances"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_account_balance",
        {
            ...R,
            description: "Retrieves a specific account and its balance for a given date",
            inputSchema: z.object({
                accountCode: z.string().describe("Account code"),
                date: z.string().describe("Date in YYYY-MM-DD format (required)"),
            }),
        },
        async ({ accountCode, date }) => {
            try {
                return ok(await get(cp(`/accountBalances/${accountCode}`), { date }));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_list_bank_accounts",
        {
            ...R,
            description: "Retrieves all bank accounts for the company",
            inputSchema: z.object({
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
                inactive: z.boolean().optional().describe("Include inactive accounts"),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/bankAccounts"), p));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_create_bank_account",
        {
            ...W,
            description: "Creates a new bank account for the company",
            inputSchema: z.object({
                name: z.string().describe("Name of the bank account"),
                bankAccountNumber: z.string().optional().describe("Norwegian bank account number"),
                iban: z.string().optional(),
                bic: z.string().optional(),
                foreignService: z
                    .boolean()
                    .optional()
                    .describe("True if this is a foreign bank service"),
                type: z.enum(["normal", "tax_deduction", "foreign", "credit_card"]).optional(),
                inactive: z.boolean().optional(),
            }),
        },
        async (body) => {
            try {
                return ok(await mutate("POST", cp("/bankAccounts"), body));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_get_bank_account",
        {
            ...R,
            description: "Retrieves a specific bank account by ID",
            inputSchema: z.object({
                bankAccountId: z.number().int().describe("Bank account ID"),
            }),
        },
        async ({ bankAccountId }) => {
            try {
                return ok(await get(cp(`/bankAccounts/${bankAccountId}`)));
            } catch (e) {
                return err(e);
            }
        },
    );

    server.registerTool(
        "fiken_list_bank_balances",
        {
            ...R,
            description: "Retrieves bank balances for the company at a given date",
            inputSchema: z.object({
                date: z.string().optional().describe("Date in YYYY-MM-DD format"),
                page: z.number().int().optional(),
                pageSize: z.number().int().optional(),
            }),
        },
        async (p) => {
            try {
                return ok(await get(cp("/bankBalances"), p));
            } catch (e) {
                return err(e);
            }
        },
    );
}
