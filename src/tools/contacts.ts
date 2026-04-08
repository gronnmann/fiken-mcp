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

const addressSchema = z
  .object({
    streetAddress: z.string().optional(),
    streetAddressLine2: z.string().optional(),
    city: z.string().optional(),
    postCode: z.string().optional(),
    country: z.string().optional().describe('ISO 3166 country code, e.g. "NO"'),
  })
  .optional();

const contactSchema = z.object({
  name: z.string().describe("Contact name (required)"),
  email: z.string().optional(),
  organizationNumber: z.string().optional(),
  customer: z.boolean().optional().describe("True if this contact is a customer"),
  supplier: z.boolean().optional().describe("True if this contact is a supplier"),
  bankAccountNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
  memberNumber: z.number().int().optional(),
  address: addressSchema,
  groups: z.array(z.string()).optional().describe("Customer group names"),
  currency: z.string().optional().describe('ISO 4217 currency code, e.g. "NOK"'),
  language: z.string().optional().describe('Language code, e.g. "norwegian"'),
  inactive: z.boolean().optional(),
});

export function register(server: McpServer) {
  server.registerTool(
    "fiken_list_contacts",
    {
      ...R,
      description: "Retrieves all contacts for the company. Supports many filters.",
      inputSchema: z.object({
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
        sortBy: z.string().optional().describe('e.g. "name asc"'),
        supplierNumber: z.number().int().optional(),
        customerNumber: z.number().int().optional(),
        memberNumber: z.number().int().optional(),
        name: z.string().optional(),
        organizationNumber: z.string().optional(),
        email: z.string().optional(),
        customer: z.boolean().optional(),
        supplier: z.boolean().optional(),
        inactive: z.boolean().optional(),
        group: z.string().optional(),
        lastModified: z.string().optional().describe("YYYY-MM-DD"),
        lastModifiedLe: z.string().optional(),
        lastModifiedLt: z.string().optional(),
        lastModifiedGe: z.string().optional(),
        lastModifiedGt: z.string().optional(),
        createdDate: z.string().optional().describe("YYYY-MM-DD"),
        createdDateLe: z.string().optional(),
        createdDateLt: z.string().optional(),
        createdDateGe: z.string().optional(),
        createdDateGt: z.string().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/contacts"), p));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_create_contact",
    {
      ...W,
      description: "Creates a new contact (customer/supplier)",
      inputSchema: contactSchema,
    },
    async (body) => {
      try {
        return ok(await mutate("POST", cp("/contacts"), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_contact",
    {
      ...R,
      description: "Retrieves a specific contact by ID",
      inputSchema: z.object({
        contactId: z.number().int(),
      }),
    },
    async ({ contactId }) => {
      try {
        return ok(await get(cp(`/contacts/${contactId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_update_contact",
    {
      ...W,
      description: "Updates an existing contact",
      inputSchema: z.object({
        contactId: z.number().int(),
        name: z.string().optional(),
        email: z.string().optional(),
        organizationNumber: z.string().optional(),
        customer: z.boolean().optional(),
        supplier: z.boolean().optional(),
        bankAccountNumber: z.string().optional(),
        phoneNumber: z.string().optional(),
        address: addressSchema,
        groups: z.array(z.string()).optional(),
        currency: z.string().optional(),
        language: z.string().optional(),
        inactive: z.boolean().optional(),
      }),
    },
    async ({ contactId, ...body }) => {
      try {
        return ok(await mutate("PUT", cp(`/contacts/${contactId}`), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_delete_contact",
    {
      ...D,
      description: "Deletes a contact, or marks it inactive if it has associated records",
      inputSchema: z.object({
        contactId: z.number().int(),
      }),
    },
    async ({ contactId }) => {
      try {
        return ok(await mutate("DELETE", cp(`/contacts/${contactId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_list_contact_persons",
    {
      ...R,
      description: "Retrieves all contact persons for a contact",
      inputSchema: z.object({
        contactId: z.number().int(),
      }),
    },
    async ({ contactId }) => {
      try {
        return ok(await get(cp(`/contacts/${contactId}/contactPerson`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_create_contact_person",
    {
      ...W,
      description: "Adds a contact person to a contact",
      inputSchema: z.object({
        contactId: z.number().int(),
        name: z.string().optional(),
        email: z.string().optional(),
        phoneNumber: z.string().optional(),
        address: addressSchema,
      }),
    },
    async ({ contactId, ...body }) => {
      try {
        return ok(await mutate("POST", cp(`/contacts/${contactId}/contactPerson`), body));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_get_contact_person",
    {
      ...R,
      description: "Retrieves a specific contact person",
      inputSchema: z.object({
        contactId: z.number().int(),
        contactPersonId: z.number().int(),
      }),
    },
    async ({ contactId, contactPersonId }) => {
      try {
        return ok(await get(cp(`/contacts/${contactId}/contactPerson/${contactPersonId}`)));
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_update_contact_person",
    {
      ...W,
      description: "Updates a contact person",
      inputSchema: z.object({
        contactId: z.number().int(),
        contactPersonId: z.number().int(),
        name: z.string().optional(),
        email: z.string().optional(),
        phoneNumber: z.string().optional(),
        address: addressSchema,
      }),
    },
    async ({ contactId, contactPersonId, ...body }) => {
      try {
        return ok(
          await mutate("PUT", cp(`/contacts/${contactId}/contactPerson/${contactPersonId}`), body),
        );
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_delete_contact_person",
    {
      ...D,
      description: "Deletes a contact person",
      inputSchema: z.object({
        contactId: z.number().int(),
        contactPersonId: z.number().int(),
      }),
    },
    async ({ contactId, contactPersonId }) => {
      try {
        return ok(
          await mutate("DELETE", cp(`/contacts/${contactId}/contactPerson/${contactPersonId}`)),
        );
      } catch (e) {
        return err(e);
      }
    },
  );

  server.registerTool(
    "fiken_list_groups",
    {
      ...R,
      description: "Returns all customer groups for the company",
      inputSchema: z.object({
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
      }),
    },
    async (p) => {
      try {
        return ok(await get(cp("/groups"), p));
      } catch (e) {
        return err(e);
      }
    },
  );
}
