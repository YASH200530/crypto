import { useEffect, useState } from "react";
import { getWalletBalance, executeTrade } from "../services/api";
import { onAuthStateChanged } from "../services/auth";

export default function CryptoTrade() {
  const [amount, setAmount] = useState("");
  const [coin, setCoin] = useState("Bitcoin");
  const [action, setAction] = useState("buy");
  const [balance, setBalance] = useState(null);

  // Fetch user balance and holdings
  useEffect(() => {
    const fetchBalance = async () => {
      const unsubscribe = onAuthStateChanged(async (user) => {
        if (!user) return;

        try {
          const balanceData = await getWalletBalance();
          setBalance(balanceData.balance || 0);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(0);
        }
      });

      return () => unsubscribe();
    };

    fetchBalance();
  }, []);

  const handleTrade = async () => {
    const amountFloat = parseFloat(amount);
    if (!amount || isNaN(amountFloat) || amountFloat <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      const tradeData = {
        type: action,
        coinId: coin.toLowerCase(),
        coinName: coin,
        price: 1, // Simplified - in real app you'd get current price
        quantity: amountFloat,
        amount: amountFloat
      };

      const result = await executeTrade(tradeData);
      setBalance(result.balance);
      setAmount("");
      alert(`${action === "buy" ? "Buy" : "Sell"} order successful!`);
    } catch (error) {
      console.error("Trade failed:", error);
      alert("Trade failed: " + error.message);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
        Trade Crypto
      </h2>

      {balance !== null && (
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          Wallet Balance: ₹{balance.toFixed(2)}
        </p>
      )}

      <select
        className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
        value={coin}
        onChange={(e) => setCoin(e.target.value)}
      >
        <option value="Bitcoin">Bitcoin</option>
        <option value="Ethereum">Ethereum</option>
        <option value="Solana">Solana</option>
        {/* Add more coins as needed */}
      </select>

      <input
        type="number"
        className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div className="flex justify-between">
        <button
          onClick={() => {
            setAction("buy");
            handleTrade();
          }}
          className="w-[48%] bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          Buy
        </button>
        <button
          onClick={() => {
            setAction("sell");
            handleTrade();
          }}
          className="w-[48%] bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
        >
          Sell
        </button>
      </div>
    </div>
  );
}
