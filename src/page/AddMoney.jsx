import { useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export default function AddMoney() {
  const [amount, setAmount] = useState("");

  const handleAddMoney = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in.");
      return;
    }

    const walletRef = doc(db, "users", user.uid);
    const walletSnap = await getDoc(walletRef);

    let currentBalance = 0;
    if (walletSnap.exists()) {
      currentBalance = walletSnap.data().balance || 0;
    }

    const newBalance = currentBalance + parseFloat(amount);
    await setDoc(walletRef, { balance: newBalance }, { merge: true });

    alert(`₹${amount} added to wallet!`);
    setAmount("");
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-md mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
        Add Money to Wallet
      </h2>
      <input
        type="number"
        className="w-full p-2 mb-4 border rounded dark:bg-gray-700 dark:text-white"
        placeholder="Enter amount (₹)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        onClick={handleAddMoney}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Add Money
      </button>
    </div>
  );
}
