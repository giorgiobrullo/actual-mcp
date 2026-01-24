import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { success, errorFromCatch } from '../../utils/response.js';
import { updateTransaction, createPayee, getPayees } from '../../actual-api.js';
import {
  BatchUpdateTransactionsArgsSchema,
  type BatchUpdateTransactionsArgs,
  type UpdateTransactionArgs,
  ToolInput,
} from '../../types.js';

export const schema = {
  name: 'batch-update-transactions',
  description:
    'Update multiple transactions at once. Useful for bulk categorization, converting to transfers, or other batch operations. Maximum 100 transactions per call. When using transfer_account, check target accounts for duplicate transactions from bank sync that should be deleted.',
  inputSchema: zodToJsonSchema(BatchUpdateTransactionsArgsSchema) as ToolInput,
};

interface Payee {
  id: string;
  name: string;
  transfer_acct?: string;
}

async function processSingleUpdate(
  update: UpdateTransactionArgs,
  payees: Payee[]
): Promise<{ id: string; success: boolean; error?: string }> {
  try {
    const { id: transactionId, ...updateData } = update;

    // Filter out undefined values
    const filteredUpdateData: Record<string, unknown> = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    // Handle payee_name: create/find payee first
    if ('payee_name' in filteredUpdateData && filteredUpdateData.payee_name) {
      const payeeName = filteredUpdateData.payee_name as string;
      const payeeId = await createPayee({ name: payeeName });
      filteredUpdateData.payee = payeeId;
      delete filteredUpdateData.payee_name;
    }

    // Handle transfer_account: find the transfer payee for the target account
    if ('transfer_account' in filteredUpdateData && filteredUpdateData.transfer_account) {
      const targetAccountId = filteredUpdateData.transfer_account as string;
      const transferPayee = payees.find((p) => p.transfer_acct === targetAccountId);
      if (transferPayee) {
        filteredUpdateData.payee = transferPayee.id;
      } else {
        return {
          id: transactionId,
          success: false,
          error: `Could not find transfer payee for account ${targetAccountId}`,
        };
      }
      delete filteredUpdateData.transfer_account;
    }

    if (Object.keys(filteredUpdateData).length === 0) {
      return { id: transactionId, success: false, error: 'No fields to update' };
    }

    await updateTransaction(transactionId, filteredUpdateData);
    return { id: transactionId, success: true };
  } catch (error) {
    return {
      id: update.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function handler(args: BatchUpdateTransactionsArgs): Promise<CallToolResult> {
  try {
    const validatedArgs = BatchUpdateTransactionsArgsSchema.parse(args);
    const { updates } = validatedArgs;

    // Fetch payees once for transfer_account lookups
    const payees = await getPayees();

    // Process all updates
    const results = await Promise.all(updates.map((update) => processSingleUpdate(update, payees)));

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    let message = `Batch update complete: ${successful.length}/${results.length} succeeded`;

    if (failed.length > 0) {
      message += `\n\nFailed updates:\n${failed
        .map((f) => `- ${f.id}: ${f.error}`)
        .join('\n')}`;
    }

    if (successful.length > 0) {
      message += `\n\nSuccessfully updated: ${successful.map((s) => s.id).join(', ')}`;
    }

    return success(message);
  } catch (error) {
    return errorFromCatch(error);
  }
}
