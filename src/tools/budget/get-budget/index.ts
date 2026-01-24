import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../../utils/response.js';
import { getBudgetMonth, getCategories, getCategoryGroups } from '../../../actual-api.js';
import { GetBudgetArgsSchema, type GetBudgetArgs, ToolInput } from '../../../types.js';

export const schema = {
  name: 'get-budget',
  description: 'Get budget data for a specific month, showing budgeted amounts and spending by category.',
  inputSchema: zodToJsonSchema(GetBudgetArgsSchema) as ToolInput,
};

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatAmount(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

export async function handler(args: GetBudgetArgs): Promise<CallToolResult> {
  try {
    const month = args.month || getCurrentMonth();

    const [budgetData, categories, categoryGroups] = await Promise.all([
      getBudgetMonth(month),
      getCategories(),
      getCategoryGroups(),
    ]);

    // Create lookup maps
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const groupMap = new Map(categoryGroups.map((g) => [g.id, g]));

    // Type the budget data
    const budget = budgetData as Record<
      string,
      { budgeted?: number; spent?: number; balance?: number; carryover?: number }
    >;

    // Build the report grouped by category group
    const groupedBudget: Record<
      string,
      { name: string; categories: Array<{ name: string; budgeted: number; spent: number; balance: number }> }
    > = {};

    for (const category of categories) {
      const group = groupMap.get(category.group_id);
      if (!group) continue;

      const groupName = group.name;
      if (!groupedBudget[groupName]) {
        groupedBudget[groupName] = { name: groupName, categories: [] };
      }

      const categoryBudget = budget[category.id] || {};
      groupedBudget[groupName].categories.push({
        name: category.name,
        budgeted: categoryBudget.budgeted || 0,
        spent: categoryBudget.spent || 0,
        balance: categoryBudget.balance || 0,
      });
    }

    // Generate markdown report
    let markdown = `# Budget for ${month}\n\n`;

    for (const [groupName, group] of Object.entries(groupedBudget)) {
      const groupTotalBudgeted = group.categories.reduce((sum, c) => sum + c.budgeted, 0);
      const groupTotalSpent = group.categories.reduce((sum, c) => sum + c.spent, 0);
      const groupTotalBalance = group.categories.reduce((sum, c) => sum + c.balance, 0);

      markdown += `## ${groupName}\n`;
      markdown += `**Group Total:** Budgeted: ${formatAmount(groupTotalBudgeted)} | Spent: ${formatAmount(groupTotalSpent)} | Balance: ${formatAmount(groupTotalBalance)}\n\n`;

      markdown += '| Category | Budgeted | Spent | Balance |\n';
      markdown += '|----------|----------|-------|--------|\n';

      for (const cat of group.categories) {
        markdown += `| ${cat.name} | ${formatAmount(cat.budgeted)} | ${formatAmount(cat.spent)} | ${formatAmount(cat.balance)} |\n`;
      }

      markdown += '\n';
    }

    return success(markdown);
  } catch (error) {
    return errorFromCatch(error);
  }
}
