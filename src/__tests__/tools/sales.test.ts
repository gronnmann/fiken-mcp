import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
    get: vi.fn(),
    mutate: vi.fn(),
    cp: vi.fn((path: string) => `/companies/test-slug${path}`),
    slug: vi.fn(() => "test-slug"),
}));

import { get, mutate } from "../../client.js";
import { register } from "../../tools/sales.js";
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

describe("fiken_list_sales", () => {
    it("calls GET /sales with filters", async () => {
        const data = [{ saleId: 1 }];
        mockGet.mockResolvedValue(data);
        const params = { page: 0, pageSize: 25, settled: false, customerId: 42 };
        const result = await server.getHandler("fiken_list_sales")(params);
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/sales", params);
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
        const result = await server.getHandler("fiken_list_sales")({});
        expect(result.isError).toBe(true);
    });

    it("handles non-Error thrown values", async () => {
        mockGet.mockRejectedValue(42);
        const result = await server.getHandler("fiken_list_sales")({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("Error: 42");
    });
});

describe("fiken_create_sale", () => {
    it("calls POST /sales with body", async () => {
        mockMutate.mockResolvedValue({ created: true, location: "/companies/test-slug/sales/1" });
        const body = {
            date: "2024-01-15",
            lines: [
                {
                    description: "Product",
                    netAmount: 100000,
                    vat: 25000,
                    vatType: "HIGH",
                    account: "3000",
                },
            ],
        };
        const result = await server.getHandler("fiken_create_sale")(body);
        expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/sales", body);
        expect(result.content[0].text).toContain("created");
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
        const result = await server.getHandler("fiken_create_sale")({
            date: "2024-01-01",
            lines: [],
        });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_get_sale", () => {
    it("calls GET /sales/{saleId}", async () => {
        const data = { saleId: 1 };
        mockGet.mockResolvedValue(data);
        const result = await server.getHandler("fiken_get_sale")({ saleId: 1 });
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/sales/1");
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_get_sale")({ saleId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_delete_sale", () => {
    it("calls DELETE /sales/{saleId}", async () => {
        mockMutate.mockResolvedValue({ success: true });
        const result = await server.getHandler("fiken_delete_sale")({ saleId: 1 });
        expect(mockMutate).toHaveBeenCalledWith("DELETE", "/companies/test-slug/sales/1");
        expect(result.isError).toBeUndefined();
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_delete_sale")({ saleId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_get_sale_attachments", () => {
    it("calls GET /sales/{saleId}/attachments", async () => {
        const data = [{ fileName: "receipt.pdf" }];
        mockGet.mockResolvedValue(data);
        const result = await server.getHandler("fiken_get_sale_attachments")({ saleId: 1 });
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/sales/1/attachments");
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_get_sale_attachments")({ saleId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_list_sale_drafts", () => {
    it("calls GET /sales/drafts with params", async () => {
        const data = [{ draftId: 1 }];
        mockGet.mockResolvedValue(data);
        const params = { page: 0, pageSize: 10 };
        const result = await server.getHandler("fiken_list_sale_drafts")(params);
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/sales/drafts", params);
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
        const result = await server.getHandler("fiken_list_sale_drafts")({});
        expect(result.isError).toBe(true);
    });
});

describe("fiken_create_sale_draft", () => {
    it("calls POST /sales/drafts with body", async () => {
        mockMutate.mockResolvedValue({
            created: true,
            location: "/companies/test-slug/sales/drafts/1",
        });
        const body = { date: "2024-01-15", customer: { contactId: 42 } };
        const result = await server.getHandler("fiken_create_sale_draft")(body);
        expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/sales/drafts", body);
        expect(result.content[0].text).toContain("created");
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
        const result = await server.getHandler("fiken_create_sale_draft")({});
        expect(result.isError).toBe(true);
    });
});

describe("fiken_get_sale_draft", () => {
    it("calls GET /sales/drafts/{draftId}", async () => {
        const data = { draftId: 1 };
        mockGet.mockResolvedValue(data);
        const result = await server.getHandler("fiken_get_sale_draft")({ draftId: 1 });
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/sales/drafts/1");
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_get_sale_draft")({ draftId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_update_sale_draft", () => {
    it("calls PUT /sales/drafts/{draftId} with body (draftId excluded)", async () => {
        mockMutate.mockResolvedValue({ success: true });
        const input = { draftId: 1, date: "2024-02-01", paymentAccount: "1920:10001" };
        const result = await server.getHandler("fiken_update_sale_draft")(input);
        expect(mockMutate).toHaveBeenCalledWith("PUT", "/companies/test-slug/sales/drafts/1", {
            date: "2024-02-01",
            paymentAccount: "1920:10001",
        });
        expect(result.isError).toBeUndefined();
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_update_sale_draft")({ draftId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_delete_sale_draft", () => {
    it("calls DELETE /sales/drafts/{draftId}", async () => {
        mockMutate.mockResolvedValue({ success: true });
        const result = await server.getHandler("fiken_delete_sale_draft")({ draftId: 1 });
        expect(mockMutate).toHaveBeenCalledWith("DELETE", "/companies/test-slug/sales/drafts/1");
        expect(result.isError).toBeUndefined();
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_delete_sale_draft")({ draftId: 999 });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_get_sale_draft_attachments", () => {
    it("calls GET /sales/drafts/{draftId}/attachments", async () => {
        const data = [{ fileName: "sale-draft.pdf" }];
        mockGet.mockResolvedValue(data);
        const result = await server.getHandler("fiken_get_sale_draft_attachments")({ draftId: 1 });
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/sales/drafts/1/attachments");
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
        const result = await server.getHandler("fiken_get_sale_draft_attachments")({
            draftId: 999,
        });
        expect(result.isError).toBe(true);
    });
});

describe("fiken_create_sale_from_draft", () => {
    it("calls POST /sales/drafts/{draftId}/createSale", async () => {
        mockMutate.mockResolvedValue({ created: true, location: "/companies/test-slug/sales/3" });
        const result = await server.getHandler("fiken_create_sale_from_draft")({ draftId: 1 });
        expect(mockMutate).toHaveBeenCalledWith(
            "POST",
            "/companies/test-slug/sales/drafts/1/createSale",
        );
        expect(result.content[0].text).toContain("created");
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
        const result = await server.getHandler("fiken_create_sale_from_draft")({ draftId: 999 });
        expect(result.isError).toBe(true);
    });
});
