import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
  get: vi.fn(),
  mutate: vi.fn(),
  cp: vi.fn((path: string) => `/companies/test-slug${path}`),
  slug: vi.fn(() => "test-slug"),
}));

import { get, mutate } from "../../client.js";
import { register } from "../../tools/invoices.js";
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

describe("fiken_list_invoices", () => {
  it("calls GET /invoices with filters", async () => {
    const data = [{ invoiceId: 1, invoiceNumber: 100 }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 25, settled: false, customerId: 42 };
    const result = await server.getHandler("fiken_list_invoices")(params);
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/invoices", params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
    const result = await server.getHandler("fiken_list_invoices")({});
    expect(result.isError).toBe(true);
  });

  it("handles non-Error thrown values", async () => {
    mockGet.mockRejectedValue("service unavailable");
    const result = await server.getHandler("fiken_list_invoices")({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: service unavailable");
  });
});

describe("fiken_create_invoice", () => {
  it("calls POST /invoices with body", async () => {
    mockMutate.mockResolvedValue({ created: true, location: "/companies/test-slug/invoices/1" });
    const body = {
      issueDate: "2024-01-15",
      lines: [{ description: "Service", netPrice: 100000, vat: 25000, vatType: "HIGH" }],
      customerId: 42,
    };
    const result = await server.getHandler("fiken_create_invoice")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/invoices", body);
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_invoice")({
      issueDate: "2024-01-01",
      lines: [],
    });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_invoice", () => {
  it("calls GET /invoices/{invoiceId}", async () => {
    const data = { invoiceId: 1, invoiceNumber: 100 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_invoice")({ invoiceId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/invoices/1");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_invoice")({ invoiceId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_update_invoice", () => {
  it("calls PATCH /invoices/{invoiceId} with body (invoiceId excluded)", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const input = { invoiceId: 1, dueDate: "2024-02-28", sentManually: true };
    const result = await server.getHandler("fiken_update_invoice")(input);
    expect(mockMutate).toHaveBeenCalledWith("PATCH", "/companies/test-slug/invoices/1", {
      dueDate: "2024-02-28",
      sentManually: true,
    });
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_update_invoice")({ invoiceId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_invoice_attachments", () => {
  it("calls GET /invoices/{invoiceId}/attachments", async () => {
    const data = [{ attachmentId: 1, fileName: "doc.pdf" }];
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_invoice_attachments")({ invoiceId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/invoices/1/attachments");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_invoice_attachments")({ invoiceId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_send_invoice", () => {
  it("calls POST /invoices/send with full body", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const body = {
      invoiceId: 1,
      method: ["email" as const],
      recipientName: "John Doe",
      recipientEmail: "john@test.no",
      message: "Please find invoice attached",
    };
    const result = await server.getHandler("fiken_send_invoice")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/invoices/send", body);
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_send_invoice")({
      invoiceId: 1,
      method: ["email"],
    });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_invoice_counter", () => {
  it("calls GET /invoices/counter", async () => {
    const data = { value: 1042 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_invoice_counter")({});
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/invoices/counter");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 500: Server Error"));
    const result = await server.getHandler("fiken_get_invoice_counter")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_invoice_counter", () => {
  it("calls POST /invoices/counter with body", async () => {
    mockMutate.mockResolvedValue({
      created: true,
      location: "/companies/test-slug/invoices/counter",
    });
    const body = { value: 1000 };
    const result = await server.getHandler("fiken_create_invoice_counter")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/invoices/counter", body);
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 409: Conflict"));
    const result = await server.getHandler("fiken_create_invoice_counter")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_list_invoice_drafts", () => {
  it("calls GET /invoices/drafts with params", async () => {
    const data = [{ draftId: 1, type: "invoice" }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 10, orderReference: "ORD-001" };
    const result = await server.getHandler("fiken_list_invoice_drafts")(params);
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/invoices/drafts", params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
    const result = await server.getHandler("fiken_list_invoice_drafts")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_invoice_draft", () => {
  it("calls POST /invoices/drafts with body", async () => {
    mockMutate.mockResolvedValue({
      created: true,
      location: "/companies/test-slug/invoices/drafts/1",
    });
    const body = { type: "invoice" as const, issueDate: "2024-01-15", contactId: 42 };
    const result = await server.getHandler("fiken_create_invoice_draft")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/invoices/drafts", body);
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_invoice_draft")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_invoice_draft", () => {
  it("calls GET /invoices/drafts/{draftId}", async () => {
    const data = { draftId: 1, type: "invoice" };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_invoice_draft")({ draftId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/invoices/drafts/1");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_invoice_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_update_invoice_draft", () => {
  it("calls PUT /invoices/drafts/{draftId} with body (draftId excluded)", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const input = { draftId: 1, issueDate: "2024-02-01", contactId: 5 };
    const result = await server.getHandler("fiken_update_invoice_draft")(input);
    expect(mockMutate).toHaveBeenCalledWith("PUT", "/companies/test-slug/invoices/drafts/1", {
      issueDate: "2024-02-01",
      contactId: 5,
    });
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_update_invoice_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_delete_invoice_draft", () => {
  it("calls DELETE /invoices/drafts/{draftId}", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const result = await server.getHandler("fiken_delete_invoice_draft")({ draftId: 1 });
    expect(mockMutate).toHaveBeenCalledWith("DELETE", "/companies/test-slug/invoices/drafts/1");
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_delete_invoice_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_invoice_draft_attachments", () => {
  it("calls GET /invoices/drafts/{draftId}/attachments", async () => {
    const data = [{ fileName: "draft.pdf" }];
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_invoice_draft_attachments")({ draftId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/invoices/drafts/1/attachments");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_invoice_draft_attachments")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_invoice_from_draft", () => {
  it("calls POST /invoices/drafts/{draftId}/createInvoice", async () => {
    mockMutate.mockResolvedValue({ created: true, location: "/companies/test-slug/invoices/10" });
    const result = await server.getHandler("fiken_create_invoice_from_draft")({ draftId: 1 });
    expect(mockMutate).toHaveBeenCalledWith(
      "POST",
      "/companies/test-slug/invoices/drafts/1/createInvoice",
    );
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_invoice_from_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});
