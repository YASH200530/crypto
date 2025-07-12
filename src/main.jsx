import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App.jsx";
import Home from "./page/Home.jsx";
import CoinDetail from "./page/Coindetail.jsx";
import Login from "./page/Login.jsx";
import ProtectedRoute from "./component/ProtectRoute.jsx";
import UserProfile from "./page/UserProfile";
import CryptoTrade from "./page/CryptoTrade"; // ✅ Trade page
import AddMoney from "./page/AddMoney";       // ✅ Add money page
import TransactionHistory from "./page/TransactionHistory";

import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* ✅ Protected routes for logged-in users */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="coin/:id" element={<CoinDetail />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="trade" element={<CryptoTrade />} />     {/* ✅ Added back */}
          <Route path="add-money" element={<AddMoney />} />    {/* ✅ Fixed */}
          <Route path="/transactions" element={<TransactionHistory />} />
        </Route>

        {/* ✅ Public Login route */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
