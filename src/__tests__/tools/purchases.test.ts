import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
    get: vi.fn(),
    mutate: vi.fn(),
    uploadMultipart: vi.fn(),
    cp: vi.fn((path: string) => `/companies/test-slug${path}`),
    slug: vi.fn(() => "test-slug"),
}));

import { get, mutate, uploadMultipart } from "../../client.js";
import { register } from "../../tools/purchases.js";
import { createMockServer } from "../helpers.js";

const mockGet = vi.mocked(get);
const mockMutate = vi.mocked(mutate);
const mockUploadMultipart = vi.mocked(uploadMultipart);
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
            date: "2024-01-15",
            kind: "cash_purchase",
            currency: "NOK",
            paid: true,
            lines: [
                {
                    description: "Office supplies",
                    netPrice: 50000,
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
            date: "2024-01-01",
            kind: "cash_purchase",
            currency: "NOK",
            paid: true,
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
    it("calls PATCH /purchases/{purchaseId}/delete with description", async () => {
        mockMutate.mockResolvedValue({ success: true });
        const result = await server.getHandler("fiken_delete_purchase")({
            purchaseId: 1,
            description: "Duplicate purchase",
        });
        expect(mockMutate).toHaveBeenCalledWith(
            "PATCH",
            "/companies/test-slug/purchases/1/delete?description=Duplicate%20purchase",
        );
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

describe("fiken_add_purchase_attachment", () => {
    it("uploads a base64 attachment to a purchase", async () => {
        mockUploadMultipart.mockResolvedValue({
            created: true,
            location: "/companies/test-slug/purchases/1/attachments/2",
        });

        const result = await server.getHandler("fiken_add_purchase_attachment")({
            purchaseId: 1,
            filename: "receipt.pdf",
            fileBase64: Buffer.from("pdf").toString("base64"),
            attachToSale: true,
            attachToPayment: false,
        });

        expect(mockUploadMultipart).toHaveBeenCalledOnce();
        const [path, params, form] = mockUploadMultipart.mock.calls[0];
        expect(path).toBe("/companies/test-slug/purchases/1/attachments");
        expect(params).toEqual({ attachToPayment: false, attachToSale: true });
        expect(form.get("filename")).toBe("receipt.pdf");
        expect((form.get("file") as Blob).size).toBe(3);
        expect(result.content[0].text).toContain("created");
    });

    it("uploads a file path attachment and derives filename when omitted", async () => {
        mockUploadMultipart.mockResolvedValue({
            created: true,
            location: "/companies/test-slug/purchases/1/attachments/2",
        });
        const dir = await mkdtemp(join(tmpdir(), "fiken-mcp-"));
        const filePath = join(dir, "invoice.pdf");
        await writeFile(filePath, Buffer.from("pdf"));

        try {
            const result = await server.getHandler("fiken_add_purchase_attachment")({
                purchaseId: 1,
                filePath,
                attachToPayment: true,
            });

            const [, params, form] = mockUploadMultipart.mock.calls[0];
            expect(params).toEqual({ attachToPayment: true, attachToSale: undefined });
            expect(form.get("filename")).toBe("invoice.pdf");
            expect((form.get("file") as Blob).size).toBe(3);
            expect(result.isError).toBeUndefined();
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it("rejects missing and duplicate file sources", async () => {
        const missing = await server.getHandler("fiken_add_purchase_attachment")({
            purchaseId: 1,
            filename: "receipt.pdf",
            attachToSale: true,
        });
        expect(missing.isError).toBe(true);
        expect(missing.content[0].text).toContain("Either filePath or fileBase64 is required");

        const duplicate = await server.getHandler("fiken_add_purchase_attachment")({
            purchaseId: 1,
            filename: "receipt.pdf",
            filePath: "/tmp/receipt.pdf",
            fileBase64: Buffer.from("pdf").toString("base64"),
            attachToSale: true,
        });
        expect(duplicate.isError).toBe(true);
        expect(duplicate.content[0].text).toContain("Provide only one of filePath or fileBase64");
    });

    it("rejects unsupported filenames", async () => {
        const result = await server.getHandler("fiken_add_purchase_attachment")({
            purchaseId: 1,
            filename: "receipt.txt",
            fileBase64: Buffer.from("pdf").toString("base64"),
            attachToSale: true,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(
            "filename must end with .png, .jpeg, .jpg, .gif, or .pdf",
        );
    });

    it("rejects calls without an attachment classification flag", async () => {
        const result = await server.getHandler("fiken_add_purchase_attachment")({
            purchaseId: 1,
            filename: "receipt.pdf",
            fileBase64: Buffer.from("pdf").toString("base64"),
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(
            "At least one of attachToPayment or attachToSale must be true",
        );
    });

    it("returns error on upload failure", async () => {
        mockUploadMultipart.mockRejectedValue(new Error("Fiken 400: Bad Request"));

        const result = await server.getHandler("fiken_add_purchase_attachment")({
            purchaseId: 1,
            filename: "receipt.pdf",
            fileBase64: Buffer.from("pdf").toString("base64"),
            attachToSale: true,
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("Error: Fiken 400: Bad Request");
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
        const body = {
            invoiceIssueDate: "2024-01-15",
            contactId: 10,
            cash: false,
            paid: false,
            lines: [],
        };
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
        const input = {
            draftId: 1,
            invoiceIssueDate: "2024-02-01",
            cash: true,
            paid: true,
            lines: [],
        };
        const result = await server.getHandler("fiken_update_purchase_draft")(input);
        expect(mockMutate).toHaveBeenCalledWith("PUT", "/companies/test-slug/purchases/drafts/1", {
            invoiceIssueDate: "2024-02-01",
            cash: true,
            paid: true,
            lines: [],
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
