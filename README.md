# Actual Budget MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-000000?style=for-the-badge&logo=anthropic&logoColor=white)](https://modelcontextprotocol.io/)
[![Actual Budget](https://img.shields.io/badge/Actual_Budget-5B21B6?style=for-the-badge)](https://actualbudget.com/)

MCP server for integrating Actual Budget with Claude and other LLM assistants. This is a soft fork of [s-stefanov/actual-mcp](https://github.com/s-stefanov/actual-mcp) with additional features for batch operations, budget management, scheduled transactions, and transfer handling. This fork is configured to build against the [Actual Budget source](https://github.com/actualbudget/actual) (`@actual-app/api` points to `file:../actual/packages/api`), so you'll need a local clone of the Actual repo as a sibling directory or update the dependency to use the published npm package.

## Overview

The Actual Budget MCP Server allows you to interact with your personal financial data from [Actual Budget](https://actualbudget.com/) using natural language through LLMs. It exposes your accounts, transactions, and financial metrics through the Model Context Protocol (MCP).

## Features

### Resources

- **Account Listings** - Browse all your accounts with their balances
- **Account Details** - View detailed information about specific accounts
- **Transaction History** - Access transaction data with complete details

### Tools

#### Transaction & Account Management

- **`get-transactions`** - Retrieve and filter transactions by account, date, amount, category, payee, notes, or uncategorized status. Supports searching across all accounts.
- **`create-transaction`** - Create a new transaction in an account with optional category, payee, and notes
- **`update-transaction`** - Update an existing transaction with new category, payee, notes, amount, or convert to a transfer between accounts
- **`batch-update-transactions`** - Update multiple transactions at once for bulk categorization or transfer conversion (up to 100 per call)
- **`delete-transaction`** - Delete a transaction
- **`get-accounts`** - Retrieve a list of all accounts with their current balance and ID
- **`balance-history`** - View account balance changes over time
- **`run-bank-sync`** - Trigger bank sync for connected accounts

#### Budget Management

- **`get-budget`** - Get budget data for a specific month showing budgeted amounts and spending by category
- **`set-budget`** - Set the budget amount for a category in a specific month

#### Scheduled Transactions

- **`get-schedules`** - Retrieve all scheduled/recurring transactions with their frequency and next date

#### Reporting & Analytics

- **`spending-by-category`** - Generate spending breakdowns categorized by type
- **`monthly-summary`** - Get monthly income, expenses, and savings metrics

#### Categories

- **`get-grouped-categories`** - Retrieve a list of all category groups with their categories
- **`create-category`** - Create a new category within a category group
- **`update-category`** - Update an existing category's name or group
- **`delete-category`** - Delete a category
- **`create-category-group`** - Create a new category group
- **`update-category-group`** - Update a category group's name
- **`delete-category-group`** - Delete a category group

#### Payees

- **`get-payees`** - Retrieve a list of all payees with their details
- **`create-payee`** - Create a new payee
- **`update-payee`** - Update an existing payee's details
- **`delete-payee`** - Delete a payee

#### Rules

- **`get-rules`** - Retrieve a list of all transaction rules
- **`create-rule`** - Create a new transaction rule with conditions and actions
- **`update-rule`** - Update an existing transaction rule
- **`delete-rule`** - Delete a transaction rule

### Prompts

- **`financial-insights`** - Generate insights and recommendations based on your financial data
- **`budget-review`** - Analyze your budget compliance and suggest adjustments

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Yarn](https://yarnpkg.com/) (for building Actual source)
- [Actual Budget source](https://github.com/actualbudget/actual) cloned as a sibling directory
- [Actual Budget](https://actualbudget.com/) server running with your data
- [Claude Desktop](https://claude.ai/download) or another MCP-compatible client
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (optional)

### Setup

This fork builds against the Actual Budget source, so you need both repos as siblings:

```bash
# Clone both repositories as siblings
git clone https://github.com/actualbudget/actual.git
git clone https://github.com/giorgiobrullo/actual-mcp.git

# Build Actual first
cd actual
yarn install
yarn build

# Then build the MCP server
cd ../actual-mcp
npm install
npm run build
```

> If you prefer using the published npm package instead, update `package.json` to replace `"@actual-app/api": "file:../actual/packages/api"` with `"@actual-app/api": "^x.x.x"` (check npm for the latest version).

Build the local docker image (optional):

```bash
docker build -t <local-image-name> .
```

5. Configure environment variables (optional):

```bash
# Path to your Actual Budget data directory (default: ~/.actual)
export ACTUAL_DATA_DIR="/path/to/your/actual/data"

# If using a remote Actual server
export ACTUAL_SERVER_URL="https://your-actual-server.com"
export ACTUAL_PASSWORD="your-password"

# Specific budget to use (optional)
export ACTUAL_BUDGET_SYNC_ID="your-budget-id"
```

Optional: separate encryption budget password

If your Actual setup requires a different password to unlock the local/encrypted budget data than the server authentication password, you can set `ACTUAL_BUDGET_ENCRYPTION_PASSWORD` in addition to `ACTUAL_PASSWORD`.

```bash
# If server auth and encryption/unlock use different passwords
export ACTUAL_BUDGET_ENCRYPTION_PASSWORD="your-encryption-password"
```

## Usage with Claude Desktop

To use this server with Claude Desktop, add it to your Claude configuration:

On MacOS:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

On Windows:

```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

Add the following to your configuration:

```json
{
  "mcpServers": {
    "actualBudget": {
      "command": "node",
      "args": ["/path/to/actual-mcp/build/index.js", "--enable-write"],
      "env": {
        "ACTUAL_PASSWORD": "your-password",
        "ACTUAL_SERVER_URL": "http://your-actual-server.com",
        "ACTUAL_BUDGET_SYNC_ID": "your-budget-id"
      }
    }
  }
}
```

After saving the configuration, restart Claude Desktop.

> Use `--enable-write` to enable write-access tools.

## Example Queries

Once connected, you can ask Claude questions like:

- "What's my current account balance?"
- "Show me my spending by category last month"
- "How much did I spend on groceries in January?"
- "What's my savings rate over the past 3 months?"
- "Analyze my budget and suggest areas to improve"
- "Find all uncategorized transactions and categorize them"
- "Show me my budget for this month"
- "What scheduled transactions do I have coming up?"
- "Find transactions with my name as payee and convert them to transfers"

## Usage with Codex CLI

Example Codex configuration:

In `~/.codex/config.toml`:
```toml
[mcp_servers.actual-budget]
url = "http://localhost:3000"
```

Point Codex at the same port you pass to `npm start -- --sse --port <PORT>`.

## Development

For development with auto-rebuild:

```bash
npm run watch
```

### Testing the connection to Actual

To verify the server can connect to your Actual Budget data:

```bash
node build/index.js --test-resources
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Project Structure

- `index.ts` - Main server implementation
- `types.ts` - Type definitions for API responses and parameters
- `prompts.ts` - Prompt templates for LLM interactions
- `utils.ts` - Helper functions for date formatting and more

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
