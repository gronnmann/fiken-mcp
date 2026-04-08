import { vi, describe, it, expect, beforeAll } from "vitest";

const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockRegisterTool = vi.fn();
const MockMcpServer = vi.fn(() => ({ connect: mockConnect, registerTool: mockRegisterTool }));
const MockStdioTransport = vi.fn(() => ({}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({ McpServer: MockMcpServer }));
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
    StdioServerTransport: MockStdioTransport,
}));

const registerUser = vi.fn();
const registerAccounts = vi.fn();
const registerContacts = vi.fn();
const registerInvoices = vi.fn();
const registerCreditNotes = vi.fn();
const registerOffers = vi.fn();
const registerOrderConfirmations = vi.fn();
const registerJournalEntries = vi.fn();
const registerTransactions = vi.fn();
const registerPurchases = vi.fn();
const registerSales = vi.fn();
const registerMisc = vi.fn();

vi.mock("../tools/user.js", () => ({ register: registerUser }));
vi.mock("../tools/accounts.js", () => ({ register: registerAccounts }));
vi.mock("../tools/contacts.js", () => ({ register: registerContacts }));
vi.mock("../tools/invoices.js", () => ({ register: registerInvoices }));
vi.mock("../tools/creditNotes.js", () => ({ register: registerCreditNotes }));
vi.mock("../tools/offers.js", () => ({ register: registerOffers }));
vi.mock("../tools/orderConfirmations.js", () => ({ register: registerOrderConfirmations }));
vi.mock("../tools/journalEntries.js", () => ({ register: registerJournalEntries }));
vi.mock("../tools/transactions.js", () => ({ register: registerTransactions }));
vi.mock("../tools/purchases.js", () => ({ register: registerPurchases }));
vi.mock("../tools/sales.js", () => ({ register: registerSales }));
vi.mock("../tools/misc.js", () => ({ register: registerMisc }));

describe("index", () => {
    beforeAll(async () => {
        await import("../index.js");
    });

    it("creates McpServer with name and version", () => {
        expect(MockMcpServer).toHaveBeenCalledWith({ name: "fiken-mcp", version: "1.0.0" });
    });

    it("creates StdioServerTransport", () => {
        expect(MockStdioTransport).toHaveBeenCalledOnce();
    });

    it("calls server.connect with the transport", () => {
        expect(mockConnect).toHaveBeenCalledOnce();
        expect(mockConnect).toHaveBeenCalledWith(MockStdioTransport.mock.results[0].value);
    });

    it("registers all 12 tool modules", () => {
        const serverInstance = MockMcpServer.mock.results[0].value;
        expect(registerUser).toHaveBeenCalledWith(serverInstance);
        expect(registerAccounts).toHaveBeenCalledWith(serverInstance);
        expect(registerContacts).toHaveBeenCalledWith(serverInstance);
        expect(registerInvoices).toHaveBeenCalledWith(serverInstance);
        expect(registerCreditNotes).toHaveBeenCalledWith(serverInstance);
        expect(registerOffers).toHaveBeenCalledWith(serverInstance);
        expect(registerOrderConfirmations).toHaveBeenCalledWith(serverInstance);
        expect(registerJournalEntries).toHaveBeenCalledWith(serverInstance);
        expect(registerTransactions).toHaveBeenCalledWith(serverInstance);
        expect(registerPurchases).toHaveBeenCalledWith(serverInstance);
        expect(registerSales).toHaveBeenCalledWith(serverInstance);
        expect(registerMisc).toHaveBeenCalledWith(serverInstance);
    });
});
