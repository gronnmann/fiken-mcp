import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, mutate, cp } from "../client.js";

const R = { annotations: { readOnlyHint: true } } as const;
const W = { annotations: { readOnlyHint: false } } as const;
const D = { annotations: { readOnlyHint: false, destructiveHint: true } } as const;

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

const draftSchema = z.object({
  issueDate: z.string().optional().describe("YYYY-MM-DD"),
  daysUntilDueDate: z.number().int().optional(),
  invoiceText: z.string().optional(),
  yourReference: z.string().optional(),
  ourReference: z.string().optional(),
  orderReference: z.string().optional(),
  lines: z
    .array(
      z.object({
        description: z.string().optional(),
        netPrice: z.number().int().optional(),
        vat: z.number().int().optional(),
        vatType: z.string().optional(),
        unit: z.string().optional(),
        unitPrice: z.number().int().optional(),
        quantity: z.number().optional(),
        discount: z.number().optional(),
        productId: z.number().int().optional(),
        account: z.string().optional(),
      }),
    )
    .optional(),
  currency: z.string().optional(),
  contactId: z.number().int().optional(),
  contactPersonId: z.number().int().optional(),
  projectId: z.number().int().optional(),
});

export function register(server: McpServer) {
  server.registerTool(
    "fiken_list_offers",
    {
      ...R,
      description: "Returns all offers for the company",
      inputSchema: z.object({
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/offers"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_offer",
    {
      ...R,
      description: "Returns a specific offer by ID",
      inputSchema: z.object({ offerId: z.number().int() }),
    },
    async ({ offerId }) => {
      try {
        return ok(await get(cp(`/offers/${offerId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_offer_counter",
    {
      ...R,
      description: "Retrieves the current offer number counter",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return ok(await get(cp("/offers/counter")));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_create_offer_counter",
    {
      ...W,
      description: "Creates the first offer number counter",
      inputSchema: z.object({ value: z.number().int().optional() }),
    },
    async (body) => {
      try {
        return ok(await mutate("POST", cp("/offers/counter"), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_list_offer_drafts",
    {
      ...R,
      description: "Returns all offer drafts for the company",
      inputSchema: z.object({
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/offers/drafts"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_create_offer_draft",
    {
      ...W,
      description: "Creates a new offer draft",
      inputSchema: draftSchema,
    },
    async (body) => {
      try {
        return ok(await mutate("POST", cp("/offers/drafts"), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_offer_draft",
    {
      ...R,
      description: "Returns a specific offer draft",
      inputSchema: z.object({ draftId: z.number().int() }),
    },
    async ({ draftId }) => {
      try {
        return ok(await get(cp(`/offers/drafts/${draftId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_update_offer_draft",
    {
      ...W,
      description: "Updates an offer draft",
      inputSchema: z.object({ draftId: z.number().int(), ...draftSchema.shape }),
    },
    async ({ draftId, ...body }) => {
      try {
        return ok(await mutate("PUT", cp(`/offers/drafts/${draftId}`), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_delete_offer_draft",
    {
      ...D,
      description: "Deletes an offer draft",
      inputSchema: z.object({ draftId: z.number().int() }),
    },
    async ({ draftId }) => {
      try {
        return ok(await mutate("DELETE", cp(`/offers/drafts/${draftId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_offer_draft_attachments",
    {
      ...R,
      description: "Returns all attachments for an offer draft",
      inputSchema: z.object({ draftId: z.number().int() }),
    },
    async ({ draftId }) => {
      try {
        return ok(await get(cp(`/offers/drafts/${draftId}/attachments`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_create_offer_from_draft",
    {
      ...W,
      description: "Creates a finalized offer from a draft",
      inputSchema: z.object({ draftId: z.number().int() }),
    },
    async ({ draftId }) => {
      try {
        return ok(await mutate("POST", cp(`/offers/drafts/${draftId}/createOffer`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_send_offer",
    {
      ...W,
      description: "Sends an offer via email",
      inputSchema: z.object({
        offerId: z.number().int(),
        method: z.array(z.enum(["email", "auto"])),
        recipientName: z.string().optional(),
        recipientEmail: z.string().optional(),
        message: z.string().optional(),
      }),
    },
    async (body) => {
      try {
        return ok(await mutate("POST", cp("/offers/send"), body));
      } catch (e) {
        return err(e);
      }
    },
  );
}
