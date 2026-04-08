import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
  get: vi.fn(),
  mutate: vi.fn(),
  cp: vi.fn((path: string) => `/companies/test-slug${path}`),
  slug: vi.fn(() => "test-slug"),
}));

import { get, mutate } from "../../client.js";
import { register } from "../../tools/offers.js";
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

describe("fiken_list_offers", () => {
  it("calls GET /offers with params", async () => {
    const data = [{ offerId: 1 }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 10 };
    const result = await server.getHandler("fiken_list_offers")(params);
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/offers", params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
    const result = await server.getHandler("fiken_list_offers")({});
    expect(result.isError).toBe(true);
  });

  it("handles non-Error thrown values", async () => {
    mockGet.mockRejectedValue("bad gateway");
    const result = await server.getHandler("fiken_list_offers")({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: bad gateway");
  });
});

describe("fiken_get_offer", () => {
  it("calls GET /offers/{offerId}", async () => {
    const data = { offerId: 1, offerNumber: 1 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_offer")({ offerId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/offers/1");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_offer")({ offerId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_offer_counter", () => {
  it("calls GET /offers/counter", async () => {
    const data = { value: 12 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_offer_counter")({});
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/offers/counter");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 500: Server Error"));
    const result = await server.getHandler("fiken_get_offer_counter")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_offer_counter", () => {
  it("calls POST /offers/counter with body", async () => {
    mockMutate.mockResolvedValue({
      created: true,
      location: "/companies/test-slug/offers/counter",
    });
    const body = { value: 1 };
    const result = await server.getHandler("fiken_create_offer_counter")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/offers/counter", body);
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 409: Conflict"));
    const result = await server.getHandler("fiken_create_offer_counter")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_list_offer_drafts", () => {
  it("calls GET /offers/drafts with params", async () => {
    const data = [{ draftId: 1 }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 10 };
    const result = await server.getHandler("fiken_list_offer_drafts")(params);
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/offers/drafts", params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
    const result = await server.getHandler("fiken_list_offer_drafts")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_offer_draft", () => {
  it("calls POST /offers/drafts with body", async () => {
    mockMutate.mockResolvedValue({
      created: true,
      location: "/companies/test-slug/offers/drafts/1",
    });
    const body = { issueDate: "2024-01-15", contactId: 42 };
    const result = await server.getHandler("fiken_create_offer_draft")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/offers/drafts", body);
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_offer_draft")({});
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_offer_draft", () => {
  it("calls GET /offers/drafts/{draftId}", async () => {
    const data = { draftId: 1 };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_offer_draft")({ draftId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/offers/drafts/1");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_offer_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_update_offer_draft", () => {
  it("calls PUT /offers/drafts/{draftId} with body (draftId excluded)", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const input = { draftId: 1, issueDate: "2024-02-01", contactId: 5 };
    const result = await server.getHandler("fiken_update_offer_draft")(input);
    expect(mockMutate).toHaveBeenCalledWith("PUT", "/companies/test-slug/offers/drafts/1", {
      issueDate: "2024-02-01",
      contactId: 5,
    });
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_update_offer_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_delete_offer_draft", () => {
  it("calls DELETE /offers/drafts/{draftId}", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const result = await server.getHandler("fiken_delete_offer_draft")({ draftId: 1 });
    expect(mockMutate).toHaveBeenCalledWith("DELETE", "/companies/test-slug/offers/drafts/1");
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_delete_offer_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_offer_draft_attachments", () => {
  it("calls GET /offers/drafts/{draftId}/attachments", async () => {
    const data = [{ fileName: "offer-draft.pdf" }];
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_offer_draft_attachments")({ draftId: 1 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/offers/drafts/1/attachments");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_offer_draft_attachments")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_offer_from_draft", () => {
  it("calls POST /offers/drafts/{draftId}/createOffer", async () => {
    mockMutate.mockResolvedValue({ created: true, location: "/companies/test-slug/offers/3" });
    const result = await server.getHandler("fiken_create_offer_from_draft")({ draftId: 1 });
    expect(mockMutate).toHaveBeenCalledWith(
      "POST",
      "/companies/test-slug/offers/drafts/1/createOffer",
    );
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_offer_from_draft")({ draftId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_send_offer", () => {
  it("calls POST /offers/send with body", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const body = { offerId: 1, method: ["email" as const], recipientEmail: "customer@test.no" };
    const result = await server.getHandler("fiken_send_offer")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/offers/send", body);
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_send_offer")({ offerId: 999, method: ["email"] });
    expect(result.isError).toBe(true);
  });
});
