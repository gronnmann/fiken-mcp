# fiken-mcp: Model Context Protocol Server for Fiken Accounting API

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/fiken-mcp.svg)](https://www.npmjs.com/package/fiken-mcp)

A Model Context Protocol (MCP) server that connects AI assistants like **Claude** and **Cursor** to the [Fiken accounting API](https://api.fiken.no/api/v2/docs/). Manage invoices, contacts, purchases, journal entries, and more — directly from your AI assistant.

All mutating operations (POST, PUT, PATCH, DELETE) require explicit user approval before executing.

**NOTE**: This is an unofficial library and is not affiliated with or endorsed by Fiken AS. Use at own risk.

**NOTE**: Built using Claude Code. Use at own risk.

---

## Features

- **Invoices & Credit Notes**: Create, send, and manage invoices and credit notes with full draft support
- **Contacts**: Full CRUD for customers and suppliers, including contact persons
- **Purchases & Sales**: Record and manage purchases and sales transactions
- **Offers & Order Confirmations**: Create and send offers, convert to invoices
- **Accounting**: Bookkeeping accounts, bank accounts, journal entries, transactions
- **Reports**: Product sales reports, account balances
- **Time Tracking**: Projects, time entries, activities, team members

---

## Configuration

Add the server to your AI client config. No installation needed — `npx`/`pnpx` will fetch it automatically.

### Getting Your Credentials

- **API Token**: [fiken.no](https://fiken.no) → Profile → API → Personal tokens
- **Company Slug**: Found in your Fiken URL: `fiken.no/company/YOUR-SLUG/...`

---

### Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fiken": {
      "command": "npx",
      "args": ["-y", "fiken-mcp"],
      "env": {
        "FIKEN_API_TOKEN": "your-personal-token-here",
        "FIKEN_COMPANY_SLUG": "your-company-slug"
      }
    }
  }
}
```

Or with pnpm:

```json
{
  "mcpServers": {
    "fiken": {
      "command": "pnpx",
      "args": ["fiken-mcp"],
      "env": {
        "FIKEN_API_TOKEN": "your-personal-token-here",
        "FIKEN_COMPANY_SLUG": "your-company-slug"
      }
    }
  }
}
```

### Claude Code

Add to `~/.claude.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "fiken": {
      "command": "npx",
      "args": ["-y", "fiken-mcp"],
      "env": {
        "FIKEN_API_TOKEN": "your-personal-token-here",
        "FIKEN_COMPANY_SLUG": "your-company-slug"
      }
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "fiken": {
      "command": "npx",
      "args": ["-y", "fiken-mcp"],
      "env": {
        "FIKEN_API_TOKEN": "your-personal-token-here",
        "FIKEN_COMPANY_SLUG": "your-company-slug"
      }
    }
  }
}
```

---

## Available Tools

| Category                | Tools                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**                | `fiken_get_user`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Companies**           | `fiken_list_companies`, `fiken_get_company`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Accounts**            | `fiken_list_accounts`, `fiken_get_account`, `fiken_list_account_balances`, `fiken_get_account_balance`                                                                                                                                                                                                                                                                                                                                                                         |
| **Bank**                | `fiken_list_bank_accounts`, `fiken_create_bank_account`, `fiken_get_bank_account`, `fiken_list_bank_balances`                                                                                                                                                                                                                                                                                                                                                                  |
| **Contacts**            | `fiken_list_contacts`, `fiken_create_contact`, `fiken_get_contact`, `fiken_update_contact`, `fiken_delete_contact`, `fiken_list_contact_persons`, `fiken_create_contact_person`, `fiken_get_contact_person`, `fiken_update_contact_person`, `fiken_delete_contact_person`, `fiken_list_groups`                                                                                                                                                                                 |
| **Invoices**            | `fiken_list_invoices`, `fiken_create_invoice`, `fiken_get_invoice`, `fiken_update_invoice`, `fiken_get_invoice_attachments`, `fiken_send_invoice`, `fiken_get_invoice_counter`, `fiken_create_invoice_counter`, `fiken_list_invoice_drafts`, `fiken_create_invoice_draft`, `fiken_get_invoice_draft`, `fiken_update_invoice_draft`, `fiken_delete_invoice_draft`, `fiken_get_invoice_draft_attachments`, `fiken_create_invoice_from_draft`                                     |
| **Credit Notes**        | `fiken_list_credit_notes`, `fiken_get_credit_note`, `fiken_create_full_credit_note`, `fiken_create_partial_credit_note`, `fiken_send_credit_note`, `fiken_get_credit_note_counter`, `fiken_create_credit_note_counter`, `fiken_list_credit_note_drafts`, `fiken_create_credit_note_draft`, `fiken_get_credit_note_draft`, `fiken_update_credit_note_draft`, `fiken_delete_credit_note_draft`, `fiken_get_credit_note_draft_attachments`, `fiken_create_credit_note_from_draft` |
| **Offers**              | `fiken_list_offers`, `fiken_get_offer`, `fiken_get_offer_counter`, `fiken_create_offer_counter`, `fiken_list_offer_drafts`, `fiken_create_offer_draft`, `fiken_get_offer_draft`, `fiken_update_offer_draft`, `fiken_delete_offer_draft`, `fiken_get_offer_draft_attachments`, `fiken_create_offer_from_draft`, `fiken_send_offer`                                                                                                                                              |
| **Order Confirmations** | `fiken_list_order_confirmations`, `fiken_get_order_confirmation`, `fiken_get_order_confirmation_counter`, `fiken_create_order_confirmation_counter`, `fiken_create_invoice_draft_from_order_confirmation`                                                                                                                                                                                                                                                                      |
| **Purchases**           | `fiken_list_purchases`, `fiken_create_purchase`, `fiken_get_purchase`, `fiken_delete_purchase`, `fiken_get_purchase_attachments`, `fiken_list_purchase_drafts`, `fiken_create_purchase_draft`, `fiken_get_purchase_draft`, `fiken_update_purchase_draft`, `fiken_delete_purchase_draft`, `fiken_get_purchase_draft_attachments`, `fiken_create_purchase_from_draft`                                                                                                            |
| **Sales**               | `fiken_list_sales`, `fiken_create_sale`, `fiken_get_sale`, `fiken_delete_sale`, `fiken_get_sale_attachments`, `fiken_list_sale_drafts`, `fiken_create_sale_draft`, `fiken_get_sale_draft`, `fiken_update_sale_draft`, `fiken_delete_sale_draft`, `fiken_get_sale_draft_attachments`, `fiken_create_sale_from_draft`                                                                                                                                                            |
| **Journal Entries**     | `fiken_list_journal_entries`, `fiken_get_journal_entry`, `fiken_get_journal_entry_attachments`, `fiken_create_journal_entry`                                                                                                                                                                                                                                                                                                                                                   |
| **Transactions**        | `fiken_list_transactions`, `fiken_get_transaction`, `fiken_delete_transaction`                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Misc**                | `fiken_create_product_sales_report`, `fiken_list_projects`, `fiken_list_time_entries`, `fiken_list_activities`, `fiken_list_time_users`, `fiken_list_inbox`                                                                                                                                                                                                                                                                                                                    |

> **Note**: Amounts are in NOK øre (1/100 of a krone). Dates use `YYYY-MM-DD` format.

---

## Local Development

```bash
git clone https://github.com/gronnmann/fiken-mcp.git
cd fiken-mcp
pnpm install       # Install dependencies
pnpm build         # Compile TypeScript → build/
pnpm dev           # Run with tsx (no build needed)
```

---

## License

MIT
