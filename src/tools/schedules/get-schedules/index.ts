import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { success, errorFromCatch } from '../../../utils/response.js';
import { getSchedules, getAccounts, getPayees } from '../../../actual-api.js';
import { ToolInput } from '../../../types.js';

export const schema = {
  name: 'get-schedules',
  description: 'Get all scheduled/recurring transactions.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  } as ToolInput,
};

function formatAmount(amount: number | { amount?: number } | undefined): string {
  if (amount === undefined) return 'N/A';
  const value = typeof amount === 'object' ? amount.amount || 0 : amount;
  return `$${(value / 100).toFixed(2)}`;
}

interface Schedule {
  id: string;
  name?: string;
  next_date?: string;
  completed?: boolean;
  _payee?: string;
  payee?: string;
  _account?: string;
  account?: string;
  _amount?: number | { amount?: number };
  amount?: number | { amount?: number };
  _date?: { frequency?: string; start?: string };
  date?: { frequency?: string; start?: string };
}

export async function handler(): Promise<CallToolResult> {
  try {
    const [schedules, accounts, payees] = await Promise.all([
      getSchedules() as Promise<Schedule[]>,
      getAccounts(),
      getPayees(),
    ]);

    // Create lookup maps
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
    const payeeMap = new Map(payees.map((p) => [p.id, p.name]));

    if (schedules.length === 0) {
      return success('No scheduled transactions found.');
    }

    let markdown = '# Scheduled Transactions\n\n';
    markdown += `Found ${schedules.length} schedule(s)\n\n`;
    markdown += '| Name | Payee | Account | Amount | Frequency | Next Date | Status |\n';
    markdown += '|------|-------|---------|--------|-----------|-----------|--------|\n';

    for (const schedule of schedules) {
      const name = schedule.name || '(unnamed)';
      const payeeId = schedule._payee || schedule.payee;
      const payeeName = payeeId ? payeeMap.get(payeeId) || payeeId : 'N/A';
      const accountId = schedule._account || schedule.account;
      const accountName = accountId ? accountMap.get(accountId) || accountId : 'N/A';
      const amount = formatAmount(schedule._amount || schedule.amount);
      const dateInfo = schedule._date || schedule.date;
      const frequency = dateInfo?.frequency || 'N/A';
      const nextDate = schedule.next_date || 'N/A';
      const status = schedule.completed ? 'Completed' : 'Active';

      markdown += `| ${name} | ${payeeName} | ${accountName} | ${amount} | ${frequency} | ${nextDate} | ${status} |\n`;
    }

    return success(markdown);
  } catch (error) {
    return errorFromCatch(error);
  }
}
