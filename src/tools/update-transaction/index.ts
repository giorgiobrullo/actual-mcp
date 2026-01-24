import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../utils/response.js';
import { updateTransaction, createPayee, getPayees } from '../../actual-api.js';
import { UpdateTransactionArgsSchema, type UpdateTransactionArgs, ToolInput } from '../../types.js';

export const schema = {
  name: 'update-transaction',
  description:
    'Update an existing transaction. Can modify date, amount, payee, category, notes, cleared status, subtransactions, and convert to a transfer. When using transfer_account to convert a transaction to a transfer, check if the target account has a duplicate transaction from bank sync that should be deleted.',
  inputSchema: zodToJsonSchema(UpdateTransactionArgsSchema) as ToolInput,
};

export async function handler(args: UpdateTransactionArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = UpdateTransactionArgsSchema.parse(args);
    const { id: transactionId, ...updateData } = validatedArgs;

    // Filter out undefined values to only send fields that were explicitly provided
    const filteredUpdateData: Record<string, unknown> = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    // Handle payee_name: the API doesn't support payee_name for updates,
    // so we need to create/find the payee first and use its ID
    if ('payee_name' in filteredUpdateData && filteredUpdateData.payee_name) {
      const payeeName = filteredUpdateData.payee_name as string;
      // createPayee will return existing payee ID if name matches
      const payeeId = await createPayee({ name: payeeName });
      filteredUpdateData.payee = payeeId;
      delete filteredUpdateData.payee_name;
    }

    // Handle transfer_account: find the transfer payee for the target account
    // Transfer payees are special payees linked to accounts via transfer_acct
    if ('transfer_account' in filteredUpdateData && filteredUpdateData.transfer_account) {
      const targetAccountId = filteredUpdateData.transfer_account as string;
      const payees = await getPayees();
      const transferPayee = payees.find((p) => p.transfer_acct === targetAccountId);
      if (transferPayee) {
        filteredUpdateData.payee = transferPayee.id;
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Could not find transfer payee for account ${targetAccountId}. Make sure the account ID is correct.`,
            },
          ],
          isError: true,
        };
      }
      delete filteredUpdateData.transfer_account;
    }

    if (Object.keys(filteredUpdateData).length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No fields provided to update. Please specify at least one field to modify.',
          },
        ],
        isError: true,
      };
    }

    await updateTransaction(transactionId, filteredUpdateData);

    const updatedFields = Object.keys(filteredUpdateData).join(', ');
    return success(`Successfully updated transaction ${transactionId}. Updated fields: ${updatedFields}`);
  } catch (error) {
    return errorFromCatch(error);
  }
}
