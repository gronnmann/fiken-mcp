#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { register as registerUser } from "./tools/user.js";
import { register as registerAccounts } from "./tools/accounts.js";
import { register as registerContacts } from "./tools/contacts.js";
import { register as registerInvoices } from "./tools/invoices.js";
import { register as registerCreditNotes } from "./tools/creditNotes.js";
import { register as registerOffers } from "./tools/offers.js";
import { register as registerOrderConfirmations } from "./tools/orderConfirmations.js";
import { register as registerJournalEntries } from "./tools/journalEntries.js";
import { register as registerTransactions } from "./tools/transactions.js";
import { register as registerPurchases } from "./tools/purchases.js";
import { register as registerSales } from "./tools/sales.js";
import { register as registerMisc } from "./tools/misc.js";

const server = new McpServer({
    name: "fiken-mcp",
    version: "1.0.0",
});

registerUser(server);
registerAccounts(server);
registerContacts(server);
registerInvoices(server);
registerCreditNotes(server);
registerOffers(server);
registerOrderConfirmations(server);
registerJournalEntries(server);
registerTransactions(server);
registerPurchases(server);
registerSales(server);
registerMisc(server);

const transport = new StdioServerTransport();
await server.connect(transport);
