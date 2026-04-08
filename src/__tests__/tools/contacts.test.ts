import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
  get: vi.fn(),
  mutate: vi.fn(),
  cp: vi.fn((path: string) => `/companies/test-slug${path}`),
  slug: vi.fn(() => "test-slug"),
}));

import { get, mutate } from "../../client.js";
import { register } from "../../tools/contacts.js";
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

describe("fiken_list_contacts", () => {
  it("calls GET /contacts with filters", async () => {
    const data = [{ contactId: 1, name: "Acme AS" }];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 25, customer: true, supplier: false, name: "Acme" };
    const result = await server.getHandler("fiken_list_contacts")(params);
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/contacts", params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
    const result = await server.getHandler("fiken_list_contacts")({});
    expect(result.isError).toBe(true);
  });

  it("handles non-Error thrown values", async () => {
    mockGet.mockRejectedValue("network error");
    const result = await server.getHandler("fiken_list_contacts")({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: network error");
  });
});

describe("fiken_create_contact", () => {
  it("calls POST /contacts with body", async () => {
    mockMutate.mockResolvedValue({ created: true, location: "/companies/test-slug/contacts/5" });
    const body = { name: "New Customer", email: "cust@test.no", customer: true };
    const result = await server.getHandler("fiken_create_contact")(body);
    expect(mockMutate).toHaveBeenCalledWith("POST", "/companies/test-slug/contacts", body);
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_contact")({ name: "Bad" });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_contact", () => {
  it("calls GET /contacts/{contactId}", async () => {
    const data = { contactId: 42, name: "Test AS" };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_contact")({ contactId: 42 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/contacts/42");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_contact")({ contactId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_update_contact", () => {
  it("calls PUT /contacts/{contactId} with body (contactId excluded)", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const input = { contactId: 42, name: "Updated AS", email: "new@test.no", customer: true };
    const result = await server.getHandler("fiken_update_contact")(input);
    expect(mockMutate).toHaveBeenCalledWith("PUT", "/companies/test-slug/contacts/42", {
      name: "Updated AS",
      email: "new@test.no",
      customer: true,
    });
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_update_contact")({ contactId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_delete_contact", () => {
  it("calls DELETE /contacts/{contactId}", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const result = await server.getHandler("fiken_delete_contact")({ contactId: 42 });
    expect(mockMutate).toHaveBeenCalledWith("DELETE", "/companies/test-slug/contacts/42");
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_delete_contact")({ contactId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_list_contact_persons", () => {
  it("calls GET /contacts/{contactId}/contactPerson", async () => {
    const data = [{ contactPersonId: 1, name: "John Doe" }];
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_list_contact_persons")({ contactId: 42 });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/contacts/42/contactPerson");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_list_contact_persons")({ contactId: 999 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_create_contact_person", () => {
  it("calls POST /contacts/{contactId}/contactPerson with body (contactId excluded)", async () => {
    mockMutate.mockResolvedValue({
      created: true,
      location: "/companies/test-slug/contacts/42/contactPerson/1",
    });
    const input = { contactId: 42, name: "Jane Doe", email: "jane@test.no" };
    const result = await server.getHandler("fiken_create_contact_person")(input);
    expect(mockMutate).toHaveBeenCalledWith(
      "POST",
      "/companies/test-slug/contacts/42/contactPerson",
      { name: "Jane Doe", email: "jane@test.no" },
    );
    expect(result.content[0].text).toContain("created");
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
    const result = await server.getHandler("fiken_create_contact_person")({ contactId: 42 });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_get_contact_person", () => {
  it("calls GET /contacts/{contactId}/contactPerson/{contactPersonId}", async () => {
    const data = { contactPersonId: 7, name: "Jane Doe" };
    mockGet.mockResolvedValue(data);
    const result = await server.getHandler("fiken_get_contact_person")({
      contactId: 42,
      contactPersonId: 7,
    });
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/contacts/42/contactPerson/7");
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_get_contact_person")({
      contactId: 42,
      contactPersonId: 999,
    });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_update_contact_person", () => {
  it("calls PUT /contacts/{contactId}/contactPerson/{id} with body", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const input = {
      contactId: 42,
      contactPersonId: 7,
      name: "Updated Name",
      phoneNumber: "12345678",
    };
    const result = await server.getHandler("fiken_update_contact_person")(input);
    expect(mockMutate).toHaveBeenCalledWith(
      "PUT",
      "/companies/test-slug/contacts/42/contactPerson/7",
      { name: "Updated Name", phoneNumber: "12345678" },
    );
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_update_contact_person")({
      contactId: 42,
      contactPersonId: 999,
    });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_delete_contact_person", () => {
  it("calls DELETE /contacts/{contactId}/contactPerson/{contactPersonId}", async () => {
    mockMutate.mockResolvedValue({ success: true });
    const result = await server.getHandler("fiken_delete_contact_person")({
      contactId: 42,
      contactPersonId: 7,
    });
    expect(mockMutate).toHaveBeenCalledWith(
      "DELETE",
      "/companies/test-slug/contacts/42/contactPerson/7",
    );
    expect(result.isError).toBeUndefined();
  });

  it("returns error on failure", async () => {
    mockMutate.mockRejectedValue(new Error("Fiken 404: Not Found"));
    const result = await server.getHandler("fiken_delete_contact_person")({
      contactId: 42,
      contactPersonId: 999,
    });
    expect(result.isError).toBe(true);
  });
});

describe("fiken_list_groups", () => {
  it("calls GET /groups with params", async () => {
    const data = ["Customers A", "VIP"];
    mockGet.mockResolvedValue(data);
    const params = { page: 0, pageSize: 50 };
    const result = await server.getHandler("fiken_list_groups")(params);
    expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/groups", params);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it("returns error on failure", async () => {
    mockGet.mockRejectedValue(new Error("Fiken 500: Server Error"));
    const result = await server.getHandler("fiken_list_groups")({});
    expect(result.isError).toBe(true);
  });
});
