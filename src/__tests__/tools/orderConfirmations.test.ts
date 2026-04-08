import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
  get: vi.fn(),
  mutate: vi.fn(),
  cp: vi.fn((path: string) => `/companies/test-slug${path}`),
  slug: vi.fn(() => "test-slug"),
}));

import { get, mutate } from "../../client.js";
import { register } from "../../tools/orderConfirmations.js";
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

describe("fiken_list_order_confirmations", () => {
  it("calls GET /orderConfirmations with params", async () => {
    const data = [{ confirmationId: 1 }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 10 };
    const result = await server.getHandler("fiken_list_order_confirmations")(params);
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/orderConfirmations", params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
    const result = await server.getHandler("fiken_list_order_confirmations")({});
    expect(result.isError).toBe(true);
  });

  it("handles non-Error thrown values", async () => {
    mockGet.mockRejectedValue("connection refused");
    const result = await server.getHandler("fiken_list_order_confirmations")({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: connection refused");
  });
});

describe("fiken_get_order_confirmation", () => {
  it("calls GET /orderConfirmations/{confirmationId}", async () => {
    const data = { confirmationId: 1, confirmationNumber: 1 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_order_confirmation")({ confirmationId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/orderConfirmations/1");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_order_confirmation")({ confirmationId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_order_confirmation_counter", () => {
  it("calls GET /orderConfirmations/counter", async () => {
    const data = { value: 5 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_order_confirmation_counter")({});
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/orderConfirmations/counter");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 500: Server Error"));
    const result = await server.getHandler("fiken_get_order_confirmation_counter")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_order_confirmation_counter", () => {
  it("calls POST /orderConfirmations/counter with body", async () => {
    mockMutate.mockResolvedValue({
      created: true,
      location: "/companies/test-slug/orderConfirmations/counter",
    });
    const body = { value: 1 };
    const result = await server.getHandler("fiken_create_order_confirmation_counter")(body);
    expect(mockMutate).toHaveBeenCalledWith(
      "POST",
      "/companies/test-slug/orderConfirmations/counter",
      body,
    );
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 409: Conflict"));
    const result = await server.getHandler("fiken_create_order_confirmation_counter")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_invoice_draft_from_order_confirmation", () => {
  it("calls POST /orderConfirmations/{confirmationId}/createInvoiceDraft", async () => {
    mockMutate.mockResolvedValue({
      created: true,
      location: "/companies/test-slug/invoices/drafts/1",
    });
    const result = await server.getHandler("fiken_create_invoice_draft_from_order_confirmation")({
      confirmationId: 1,
    });
    expect(mockMutate).toHaveBeenCalledWith(
      "POST",
      "/companies/test-slug/orderConfirmations/1/createInvoiceDraft",
    );
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_invoice_draft_from_order_confirmation")({
      confirmationId: 999,
    });
    expect(result.isError).toBe(true);
  });
});
