import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, cp } from "../client.js";

const R = { annotations: { readOnlyHint: true } } as const;

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

export function register(server: McpServer) {
  server.registerTool(
    "fiken_get_user",
    {
      ...R,
      description: "Returns information about the authenticated Fiken user",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return ok(await get("/user"));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_list_companies",
    {
      ...R,
      description: "Returns all companies the authenticated user has access to",
      inputSchema: z.object({
        page: z.number().int().optional().describe("Page number, 0-indexed"),
        pageSize: z.number().int().optional().describe("Results per page, max 100"),
        sortBy: z.string().optional().describe('e.g. "name asc", "createdDate desc"'),
      }),
    },
    async (p) => {
      try {
        return ok(await get("/companies", p));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_company",
    {
      ...R,
      description: "Returns details of the company configured via FIKEN_COMPANY_SLUG",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return ok(await get(cp("")));
      } catch (e) {
        return err(e);
      }
    },
  );
}
