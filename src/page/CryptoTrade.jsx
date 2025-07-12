import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function CryptoTrade() {
  const [amount, setAmount] = useState("");
  const [coin, setCoin] = useState("Bitcoin");
  const [action, setAction] = useState("buy");
  const [balance, setBalance] = useState(null);

  // Fetch user balance and holdings
  useEffect(() => {
    const fetchBalance = async () => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setBalance(data.balance || 0);
        } else {
          await setDoc(userRef, { balance: 100000, holdings: {} }); // Default setup
          setBalance(100000);
        }
      });

      return () => unsubscribe();
    };

    fetchBalance();
  }, []);

  const handleTrade = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to trade.");
      return;
    }

    const amountFloat = parseFloat(amount);
    if (!amount || isNaN(amountFloat) || amountFloat <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      alert("User data not found.");
      return;
    }

    const userData = userSnap.data();
    const currentBalance = userData.balance || 0;
    const holdings = userData.holdings || {};
    const coinHolding = holdings[coin]?.quantity || 0;

    let updatedBalance = currentBalance;
    let updatedHoldings = { ...holdings };

    if (action === "buy") {
      if (amountFloat > currentBalance) {
        alert("Insufficient balance.");
        return;
      }

      updatedBalance -= amountFloat;
      updatedHoldings[coin] = {
        quantity: coinHolding + amountFloat,
      };
    } else {
      if (amountFloat > coinHolding) {
        alert("Not enough crypto to sell.");
        return;
      }

      updatedBalance += amountFloat;
      updatedHoldings[coin] = {
        quantity: coinHolding - amountFloat,
      };
    }

    try {
      await updateDoc(userRef, {
        balance: updatedBalance,
        holdings: updatedHoldings,
      });

      // Optional: Save trade record
      await setDoc(
        doc(db, "trades", `${user.uid}_${Date.now()}`),
        {
          userId: user.uid,
          email: user.email,
          coin,
          amount: amountFloat,
          action,
          timestamp: serverTimestamp(),
        }
      );

      setBalance(updatedBalance);
      setAmount("");
      alert(`${action === "buy" ? "Buy" : "Sell"} order successful!`);
    } catch (err) {
      console.error("Trade failed:", err);
      alert("Trade failed. Please try again.");
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
