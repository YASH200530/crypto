// src/pages/TransactionHistory.jsx
import { useEffect, useState } from "react";
import { getTransactions } from "../services/api";
import { format } from "date-fns";

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);

  const fetchTransactions = async () => {
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-white dark:bg-gray-900 shadow rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Transaction History
      </h2>

      {transactions.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No transactions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white text-sm">
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Coin</th>
                <th className="px-4 py-2 text-left">Amount (₹)</th>
                <th className="px-4 py-2 text-left">Quantity</th>
                <th className="px-4 py-2 text-left">Price</th>
                <th className="px-4 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200"
                >
                  <td className="px-4 py-2 capitalize">{tx.type}</td>
                  <td className="px-4 py-2">{tx.coin || "-"}</td>
                  <td className="px-4 py-2">₹{tx.amount}</td>
                  <td className="px-4 py-2">{tx.quantity || "-"}</td>
                  <td className="px-4 py-2">
                    {tx.priceAtTransaction ? `₹${tx.priceAtTransaction}` : "-"}
                  </td>
                  <td className="px-4 py-2">
                    {tx.timestamp?.toDate
                      ? format(tx.timestamp.toDate(), "dd MMM yyyy, hh:mm a")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
