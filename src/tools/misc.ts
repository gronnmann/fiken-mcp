import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, mutate, cp } from "../client.js";

const R = { annotations: { readOnlyHint: true } } as const;
const W = { annotations: { readOnlyHint: false } } as const;

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(e: unknown) {
  return {
    content: [
      { type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` },
    ],
    isError: true as const,
  };
}

const paging = z.object({
  page: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});

export function register(server: McpServer) {
  // Products / reports
  server.registerTool(
    "fiken_create_product_sales_report",
    {
      ...W,
      description: "Creates a product sales report for a date range",
      inputSchema: z.object({
        from: z.string().describe("Start date YYYY-MM-DD"),
        to: z.string().describe("End date YYYY-MM-DD"),
        includeZeroValues: z.boolean().optional().describe("Include products with zero sales"),
        projectId: z.number().int().optional(),
      }),
    },
    async (body) => {
      try {
        return ok(await mutate("POST", cp("/products/salesReport"), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  // Projects
  server.registerTool(
    "fiken_list_projects",
    {
      ...R,
      description: "Returns all projects for the company",
      inputSchema: z.object({
        ...paging.shape,
        completed: z.boolean().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/projects"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  // Time entries
  server.registerTool(
    "fiken_list_time_entries",
    {
      ...R,
      description: "Returns time entries for the company",
      inputSchema: z.object({
        ...paging.shape,
        startDate: z.string().optional().describe("YYYY-MM-DD"),
        endDate: z.string().optional().describe("YYYY-MM-DD"),
        projectId: z.number().int().optional(),
        userId: z.number().int().optional(),
        activityId: z.number().int().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/timeEntries"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  // Activities
  server.registerTool(
    "fiken_list_activities",
    {
      ...R,
      description: "Returns all activity types for the company",
      inputSchema: paging,
    },
    async (p) => {
      try {
        return ok(await get(cp("/activities"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  // Time users
  server.registerTool(
    "fiken_list_time_users",
    {
      ...R,
      description: "Returns all time-tracking users for the company",
      inputSchema: paging,
    },
    async (p) => {
      try {
        return ok(await get(cp("/timeUsers"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  // Inbox
  server.registerTool(
    "fiken_list_inbox",
    {
      ...R,
      description: "Returns incoming documents in the company inbox",
      inputSchema: z.object({
        ...paging.shape,
        sortBy: z.string().optional().describe('e.g. "createdDate desc"'),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional().describe('e.g. "new", "approved"'),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/inbox"), p));
      } catch (e) {
        return err(e);
      }
    },
  );
}
