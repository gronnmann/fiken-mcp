import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
    get: vi.fn(),
    mutate: vi.fn(),
    cp: vi.fn((path: string) => `/companies/test-slug${path}`),
    slug: vi.fn(() => "test-slug"),
}));

import { get, mutate } from "../../client.js";
import { register } from "../../tools/purchases.js";
import { createMockServer } from "../helpers.js";

const mockGet = vi.mocked(get);
const mockMutate = vi.mocked(mutate);
const server = createMockServer();

beforeAll(() => {
    register(server);
});
beforeEach(() => {
    vi.clearAllMocks();
});

describe("fiken_list_purchases", () => {
    it("calls GET /purchases with filters", async () => {
        const data = [{ purchaseId: 1 }];
        mockGet.mockResolvedValue(data);
        const params = { page: 0, pageSize: 25, paid: false, supplierId: 10 };
        const result = await server.getHandler("fiken_list_purchases")(params);
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/purchases", params);
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
        const result = await server.getHandler("fiken_list_purchases")({});
        expect(result.isError).toBe(true);
    });

    it("handles non-Error thrown values", async () => {
        mockGet.mockRejectedValue("network timeout");
        const result = await server.getHandler("fiken_list_purchases")({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("Error: network timeout");
    });
});

describe("fiken_create_purchase", () => {
    it("calls POST /purchases with body", async () => {
        mockMutate.mockResolvedValue({
            created: true,
            location: "/companies/test-slug/purchases/1",
        });
        const body = {
            transactionDate: "2024-01-15",
            lines: [
                {
                    description: "Office supplies",
                    netAmount: 50000,
                    vat: 12500,
                    vatType: "HIGH",
                    account: "6540",
                },
            ],
        };
        const result = await server.getHandler("fiken_create_purchase")(body);
        expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/purchases", body);
        expect(result.content[0].text).toContain("created");
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
        const result = await server.getHandler("fiken_create_purchase")({
            transactionDate: "2024-01-01",
            lines: [],
        });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_get_purchase", () => {
    it("calls GET /purchases/{purchaseId}", async () => {
        const data = { purchaseId: 1, description: "Test" };
        mockGet.mockResolvedValue(data);
        const result = await server.getHandler("fiken_get_purchase")({ purchaseId: 1 });
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/purchases/1");
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_get_purchase")({ purchaseId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_delete_purchase", () => {
    it("calls DELETE /purchases/{purchaseId}", async () => {
        mockMutate.mockResolvedValue({ success: true });
        const result = await server.getHandler("fiken_delete_purchase")({ purchaseId: 1 });
        expect(mockMutate).toHaveBeenCalledWith("DELETE", "/companies/test-slug/purchases/1");
        expect(result.isError).toBeUndefined();
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_delete_purchase")({ purchaseId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_get_purchase_attachments", () => {
    it("calls GET /purchases/{purchaseId}/attachments", async () => {
        const data = [{ fileName: "invoice.pdf" }];
        mockGet.mockResolvedValue(data);
        const result = await server.getHandler("fiken_get_purchase_attachments")({ purchaseId: 1 });
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/purchases/1/attachments");
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_get_purchase_attachments")({
            purchaseId: 999,
        });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_list_purchase_drafts", () => {
    it("calls GET /purchases/drafts with params", async () => {
        const data = [{ draftId: 1 }];
        mockGet.mockResolvedValue(data);
        const params = { page: 0, pageSize: 10 };
        const result = await server.getHandler("fiken_list_purchase_drafts")(params);
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/purchases/drafts", params);
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
        const result = await server.getHandler("fiken_list_purchase_drafts")({});
        expect(result.isError).toBe(true);
    });
});

describe("fiken_create_purchase_draft", () => {
    it("calls POST /purchases/drafts with body", async () => {
        mockMutate.mockResolvedValue({
            created: true,
            location: "/companies/test-slug/purchases/drafts/1",
        });
        const body = { purchaseDate: "2024-01-15", supplier: { contactId: 10 } };
        const result = await server.getHandler("fiken_create_purchase_draft")(body);
        expect(mockMutate).toHaveBeenCalledWith(
            "POST",
            "/companies/test-slug/purchases/drafts",
            body,
        );
        expect(result.content[0].text).toContain("created");
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
        const result = await server.getHandler("fiken_create_purchase_draft")({});
        expect(result.isError).toBe(true);
    });
});

describe("fiken_get_purchase_draft", () => {
    it("calls GET /purchases/drafts/{draftId}", async () => {
        const data = { draftId: 1 };
        mockGet.mockResolvedValue(data);
        const result = await server.getHandler("fiken_get_purchase_draft")({ draftId: 1 });
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/purchases/drafts/1");
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_get_purchase_draft")({ draftId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_update_purchase_draft", () => {
    it("calls PUT /purchases/drafts/{draftId} with body (draftId excluded)", async () => {
        mockMutate.mockResolvedValue({ success: true });
        const input = { draftId: 1, purchaseDate: "2024-02-01", paymentAccount: "1920:10001" };
        const result = await server.getHandler("fiken_update_purchase_draft")(input);
        expect(mockMutate).toHaveBeenCalledWith("PUT", "/companies/test-slug/purchases/drafts/1", {
            purchaseDate: "2024-02-01",
            paymentAccount: "1920:10001",
        });
        expect(result.isError).toBeUndefined();
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_update_purchase_draft")({ draftId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_delete_purchase_draft", () => {
    it("calls DELETE /purchases/drafts/{draftId}", async () => {
        mockMutate.mockResolvedValue({ success: true });
        const result = await server.getHandler("fiken_delete_purchase_draft")({ draftId: 1 });
        expect(mockMutate).toHaveBeenCalledWith(
            "DELETE",
            "/companies/test-slug/purchases/drafts/1",
        );
        expect(result.isError).toBeUndefined();
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_delete_purchase_draft")({ draftId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_get_purchase_draft_attachments", () => {
    it("calls GET /purchases/drafts/{draftId}/attachments", async () => {
        const data = [{ fileName: "purchase-draft.pdf" }];
        mockGet.mockResolvedValue(data);
        const result = await server.getHandler("fiken_get_purchase_draft_attachments")({
            draftId: 1,
        });
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/purchases/drafts/1/attachments");
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_get_purchase_draft_attachments")({
            draftId: 999,
        });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_create_purchase_from_draft", () => {
    it("calls POST /purchases/drafts/{draftId}/createPurchase", async () => {
        mockMutate.mockResolvedValue({
            created: true,
            location: "/companies/test-slug/purchases/5",
        });
        const result = await server.getHandler("fiken_create_purchase_from_draft")({ draftId: 1 });
        expect(mockMutate).toHaveBeenCalledWith(
            "POST",
            "/companies/test-slug/purchases/drafts/1/createPurchase",
        );
        expect(result.content[0].text).toContain("created");
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
        const result = await server.getHandler("fiken_create_purchase_from_draft")({
            draftId: 999,
        });
        expect(result.isError).toBe(true);
    });
});
