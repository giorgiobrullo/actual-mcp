import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../../utils/response.js';
import { setBudgetAmount, getCategories } from '../../../actual-api.js';
import { SetBudgetArgsSchema, type SetBudgetArgs, ToolInput } from '../../../types.js';

export const schema = {
  name: 'set-budget',
  description: 'Set the budget amount for a category in a specific month.',
  inputSchema: zodToJsonSchema(SetBudgetArgsSchema) as ToolInput,
};

export async function handler(args: SetBudgetArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = SetBudgetArgsSchema.parse(args);
    const { month, categoryId, amount } = validatedArgs;

    // Get category name for confirmation message
    const categories = await getCategories();
    const category = categories.find((c) => c.id === categoryId);
    const categoryName = category?.name || categoryId;

    await setBudgetAmount(month, categoryId, amount);

    const formattedAmount = `$${(amount / 100).toFixed(2)}`;
    return success(`Successfully set budget for "${categoryName}" in ${month} to ${formattedAmount}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
