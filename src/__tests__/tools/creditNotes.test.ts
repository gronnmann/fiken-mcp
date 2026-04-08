import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
  get: vi.fn(),
  mutate: vi.fn(),
  cp: vi.fn((path: string) => `/companies/test-slug${path}`),
  slug: vi.fn(() => "test-slug"),
}));

import { get, mutate } from "../../client.js";
import { register } from "../../tools/creditNotes.js";
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

describe("fiken_list_credit_notes", () => {
  it("calls GET /creditNotes with filters", async () => {
    const data = [{ creditNoteId: 1 }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 25, settled: false, customerId: 42 };
    const result = await server.getHandler("fiken_list_credit_notes")(params);
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/creditNotes", params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
    const result = await server.getHandler("fiken_list_credit_notes")({});
    expect(result.isError).toBe(true);
  });

  it("handles non-Error thrown values", async () => {
    mockGet.mockRejectedValue("rate limited");
    const result = await server.getHandler("fiken_list_credit_notes")({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: rate limited");
  });
});

describe("fiken_get_credit_note", () => {
  it("calls GET /creditNotes/{creditNoteId}", async () => {
    const data = { creditNoteId: 1, creditNoteNumber: 1 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_credit_note")({ creditNoteId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/creditNotes/1");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_credit_note")({ creditNoteId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_full_credit_note", () => {
  it("calls POST /creditNotes/full with body", async () => {
    mockMutate.mockResolvedValue({ created: true, location: "/companies/test-slug/creditNotes/1" });
    const body = { invoiceId: 5, creditNoteText: "Full refund" };
    const result = await server.getHandler("fiken_create_full_credit_note")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/creditNotes/full", body);
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_full_credit_note")({ invoiceId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_partial_credit_note", () => {
  it("calls POST /creditNotes/partial with body", async () => {
    mockMutate.mockResolvedValue({ created: true, location: "/companies/test-slug/creditNotes/2" });
    const body = {
      invoiceId: 5,
      creditNoteText: "Partial refund",
      lines: [{ description: "Return", netPrice: 50000, vat: 12500, vatType: "HIGH" }],
    };
    const result = await server.getHandler("fiken_create_partial_credit_note")(body);
    expect(mockMutate).toHaveBeenCalledWith(
      "POST",
      "/companies/test-slug/creditNotes/partial",
      body,
    );
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_partial_credit_note")({ invoiceId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_send_credit_note", () => {
  it("calls POST /creditNotes/send with body", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const body = { creditNoteId: 1, method: ["email" as const], recipientEmail: "test@test.no" };
    const result = await server.getHandler("fiken_send_credit_note")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/creditNotes/send", body);
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_send_credit_note")({
      creditNoteId: 1,
      method: ["email"],
    });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_credit_note_counter", () => {
  it("calls GET /creditNotes/counter", async () => {
    const data = { value: 42 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_credit_note_counter")({});
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/creditNotes/counter");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 500: Server Error"));
    const result = await server.getHandler("fiken_get_credit_note_counter")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_credit_note_counter", () => {
  it("calls POST /creditNotes/counter with body", async () => {
    mockMutate.mockResolvedValue({
      created: true,
      location: "/companies/test-slug/creditNotes/counter",
    });
    const body = { value: 1 };
    const result = await server.getHandler("fiken_create_credit_note_counter")(body);
    expect(mockMutate).toHaveBeenCalledWith(
      "POST",
      "/companies/test-slug/creditNotes/counter",
      body,
    );
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 409: Conflict"));
    const result = await server.getHandler("fiken_create_credit_note_counter")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_list_credit_note_drafts", () => {
  it("calls GET /creditNotes/drafts with params", async () => {
    const data = [{ draftId: 1 }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 10 };
    const result = await server.getHandler("fiken_list_credit_note_drafts")(params);
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/creditNotes/drafts", params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
    const result = await server.getHandler("fiken_list_credit_note_drafts")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_credit_note_draft", () => {
  it("calls POST /creditNotes/drafts with body", async () => {
    mockMutate.mockResolvedValue({
      created: true,
      location: "/companies/test-slug/creditNotes/drafts/1",
    });
    const body = { issueDate: "2024-01-15", contactId: 42 };
    const result = await server.getHandler("fiken_create_credit_note_draft")(body);
    expect(mockMutate).toHaveBeenCalledWith(
      "POST",
      "/companies/test-slug/creditNotes/drafts",
      body,
    );
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_credit_note_draft")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_credit_note_draft", () => {
  it("calls GET /creditNotes/drafts/{draftId}", async () => {
    const data = { draftId: 1 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_credit_note_draft")({ draftId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/creditNotes/drafts/1");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_credit_note_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_update_credit_note_draft", () => {
  it("calls PUT /creditNotes/drafts/{draftId} with body (draftId excluded)", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const input = { draftId: 1, issueDate: "2024-02-01", contactId: 5 };
    const result = await server.getHandler("fiken_update_credit_note_draft")(input);
    expect(mockMutate).toHaveBeenCalledWith("PUT", "/companies/test-slug/creditNotes/drafts/1", {
      issueDate: "2024-02-01",
      contactId: 5,
    });
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_update_credit_note_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_delete_credit_note_draft", () => {
  it("calls DELETE /creditNotes/drafts/{draftId}", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const result = await server.getHandler("fiken_delete_credit_note_draft")({ draftId: 1 });
    expect(mockMutate).toHaveBeenCalledWith("DELETE", "/companies/test-slug/creditNotes/drafts/1");
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_delete_credit_note_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_credit_note_draft_attachments", () => {
  it("calls GET /creditNotes/drafts/{draftId}/attachments", async () => {
    const data = [{ fileName: "cn-draft.pdf" }];
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_credit_note_draft_attachments")({
      draftId: 1,
    });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/creditNotes/drafts/1/attachments");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_credit_note_draft_attachments")({
      draftId: 999,
    });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_credit_note_from_draft", () => {
  it("calls POST /creditNotes/drafts/{draftId}/createCreditNote", async () => {
    mockMutate.mockResolvedValue({ created: true, location: "/companies/test-slug/creditNotes/5" });
    const result = await server.getHandler("fiken_create_credit_note_from_draft")({ draftId: 1 });
    expect(mockMutate).toHaveBeenCalledWith(
      "POST",
      "/companies/test-slug/creditNotes/drafts/1/createCreditNote",
    );
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_credit_note_from_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});
