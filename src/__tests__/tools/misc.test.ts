import { vi, describe, it, expect, beforeAll, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
    get: vi.fn(),
    mutate: vi.fn(),
    cp: vi.fn((path: string) => `/companies/test-slug${path}`),
    slug: vi.fn(() => "test-slug"),
}));

import { get, mutate } from "../../client.js";
import { register } from "../../tools/misc.js";
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

describe("fiken_create_product_sales_report", () => {
    it("calls POST /products/salesReport with body", async () => {
        const data = [{ productId: 1, totalSold: 5 }];
        mockMutate.mockResolvedValue(data);
        const body = { from: "2024-01-01", to: "2024-12-31", includeZeroValues: false };
        const result = await server.getHandler("fiken_create_product_sales_report")(body);
        expect(mockMutate).toHaveBeenCalledWith(
            "POST",
            "/companies/test-slug/products/salesReport",
            body,
        );
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockMutate.mockRejectedValue(new Error("Fiken 400: Bad Request"));
        const result = await server.getHandler("fiken_create_product_sales_report")({
            from: "2024-01-01",
            to: "2024-12-31",
        });
        expect(result.isError).toBe(true);
    });

    it("handles non-Error thrown values", async () => {
        mockMutate.mockRejectedValue("quota exceeded");
        const result = await server.getHandler("fiken_create_product_sales_report")({
            from: "2024-01-01",
            to: "2024-12-31",
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toBe("Error: quota exceeded");
    });
});

describe("fiken_list_projects", () => {
    it("calls GET /projects with params", async () => {
        const data = [{ projectId: 1, name: "Project Alpha" }];
        mockGet.mockResolvedValue(data);
        const params = { page: 0, pageSize: 10, completed: false };
        const result = await server.getHandler("fiken_list_projects")(params);
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/projects", params);
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
        const result = await server.getHandler("fiken_list_projects")({});
        expect(result.isError).toBe(true);
    });
});

describe("fiken_list_time_entries", () => {
    it("calls GET /timeEntries with filters", async () => {
        const data = [{ timeEntryId: 1, hours: 8 }];
        mockGet.mockResolvedValue(data);
        const params = {
            page: 0,
            pageSize: 50,
            startDate: "2024-01-01",
            endDate: "2024-01-31",
            projectId: 5,
            userId: 2,
        };
        const result = await server.getHandler("fiken_list_time_entries")(params);
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/timeEntries", params);
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
        const result = await server.getHandler("fiken_list_time_entries")({});
        expect(result.isError).toBe(true);
    });
});

describe("fiken_list_activities", () => {
    it("calls GET /activities with params", async () => {
        const data = [{ activityId: 1, name: "Development" }];
        mockGet.mockResolvedValue(data);
        const params = { page: 0, pageSize: 25 };
        const result = await server.getHandler("fiken_list_activities")(params);
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/activities", params);
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
        const result = await server.getHandler("fiken_list_activities")({});
        expect(result.isError).toBe(true);
    });
});

describe("fiken_list_time_users", () => {
    it("calls GET /timeUsers with params", async () => {
        const data = [{ userId: 1, name: "Alice" }];
        mockGet.mockResolvedValue(data);
        const params = { page: 0, pageSize: 25 };
        const result = await server.getHandler("fiken_list_time_users")(params);
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/timeUsers", params);
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
        const result = await server.getHandler("fiken_list_time_users")({});
        expect(result.isError).toBe(true);
    });
});

describe("fiken_list_inbox", () => {
    it("calls GET /inbox with filters", async () => {
        const data = [{ documentId: 1, name: "Invoice.pdf", status: "new" }];
        mockGet.mockResolvedValue(data);
        const params = { page: 0, pageSize: 25, status: "new", name: "Invoice" };
        const result = await server.getHandler("fiken_list_inbox")(params);
        expect(mockGet).toHaveBeenCalledWith("/companies/test-slug/inbox", params);
        expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
    });

    it("returns error on failure", async () => {
        mockGet.mockRejectedValue(new Error("Fiken 401: Unauthorized"));
        const result = await server.getHandler("fiken_list_inbox")({});
        expect(result.isError).toBe(true);
    });
});
