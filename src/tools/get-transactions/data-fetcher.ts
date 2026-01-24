// Fetches transactions and related data for get-transactions tool
import { fetchTransactionsForAccount } from '../../core/data/fetch-transactions.js';
import { getAccounts } from '../../actual-api.js';
import type { Transaction } from '../../core/types/domain.js';

export class GetTransactionsDataFetcher {
  async fetch(accountId: string | undefined, start: string, end: string): Promise<Transaction[]> {
    if (accountId) {
      return await fetchTransactionsForAccount(accountId, start, end);
    }

    // Fetch from all accounts
    const accounts = await getAccounts();
    const allTransactions: Transaction[] = [];

    for (const account of accounts) {
      const transactions = await fetchTransactionsForAccount(account.id, start, end);
      allTransactions.push(...transactions);
    }

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allTransactions;
  }
}
