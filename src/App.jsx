import { useEffect, useState, useRef } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "./services/auth";

export default function App() {
 const [authChecked, setAuthChecked] = useState(false);
 const [_darkMode, _setDarkMode] = useState(
 () => localStorage.getItem("theme") === "dark"
 );
 const [user, setUser] = useState(null);
 const [dropdownVisible, setDropdownVisible] = useState(false);
 const dropdownRef = useRef(null);

 const navigate = useNavigate();
 const location = useLocation();

 /* ───────────────── auth check ───────────────── */
 useEffect(() => {
 const unsubscribe = onAuthStateChanged((currentUser) => {
 setUser(currentUser);
 setAuthChecked(true);

 if (!currentUser && location.pathname !== "/login") navigate("/login");
 if (currentUser && location.pathname === "/login") navigate("/");
 });
 return () => unsubscribe();
 }, [location.pathname, navigate]);

   /* ───────────────── dark-mode sync ───────────────── */
  useEffect(() => {
    if (_darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [_darkMode]);

 const getInitial = () =>
 (user?.displayName || user?.email || "?")[0].toUpperCase();

 const handleSignOut = async () => {
 await signOut();
 navigate("/login");
 };

 if (!authChecked) {
 return (
 <div className="min-h-screen flex justify-center items-center text-lg">
 🔐 Checking authentication…
 </div>
 );
 }

 /* ───────────────── ui ───────────────── */
 return (
 <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
 {/* header */}
 <header className="w-full p-4 flex justify-between items-center bg-gray-100 dark:bg-gray-800 shadow sticky top-0 z-10">
 <h1 className="text-xl font-bold">Crypto Dashboard</h1>

 {/* right-side buttons */}
 <div className="flex items-center gap-3">
 {/* Transaction history link */}
 <Link to="/transactions">
 <button className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700">
 📄 History
 </button>
 </Link>

 {/* Add-money link */}
 <Link to="/add-money">
 <button className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
 💰 Add Money
 </button>
 </Link>

 {/* dark-mode toggle 
 <button
 onClick={() => _setDarkMode((prev) => !prev)}
 className="bg-blue-500 text-white px-3 py-2 rounded"
 >
 {_darkMode ? "☀️ Light" : "🌙 Dark"}
 </button>

 {/* user avatar & dropdown */}
 {user && (
 <div
 className="relative"
 ref={dropdownRef}
 onMouseEnter={() => setDropdownVisible(true)}
 onMouseLeave={() => setDropdownVisible(false)}
 >
 {user.photoURL ? (
 <img
 src={user.photoURL}
 alt="user avatar"
 className="w-10 h-10 rounded-full border-2 border-white cursor-pointer"
 />
 ) : (
 <div className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full cursor-pointer select-none">
 {getInitial()}
 </div>
 )}

 {dropdownVisible && (
 <div className="absolute right-0 mt-2 bg-white dark:bg-gray-700 border rounded shadow-lg w-40 z-50">
 <Link
 to="/profile"
 className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
 >
 Profile
 </Link>
 <button
 onClick={handleSignOut}
 className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
 >
                    Sign Out
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </header>

 {/* routed pages */}
 <main className="p-4">
 <Outlet />
 </main>
 </div>
 );
}
