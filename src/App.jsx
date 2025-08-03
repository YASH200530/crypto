import { useEffect, useState, useRef } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "./services/auth";

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  // Dark mode functionality disabled for now
  // const [darkMode] = useState(
  //   () => localStorage.getItem("theme") === "dark"
  // );
  const [user, setUser] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setUser(user);
      setAuthChecked(true);
      
      // Redirect to login if not authenticated and not already on login page
      if (!user && location.pathname !== "/login") {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Don't render anything until auth is checked
  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Show login page if not authenticated
  if (!user && location.pathname !== "/login") {
    return null; // Will redirect to login via useEffect
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

          {/* dark-mode toggle - currently disabled
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className="bg-blue-500 text-white px-3 py-2 rounded"
          >
            {"🌙 Dark"}
          </button>
          */}

          {/* user avatar & dropdown */}
          {user && (
            <div
              className="relative"
              ref={dropdownRef}
            >
              <button
                onClick={() => setDropdownVisible(!dropdownVisible)}
                className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold hover:bg-blue-700"
              >
                {user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase()}
              </button>

              {/* dropdown menu */}
              {dropdownVisible && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.displayName || "User"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => setDropdownVisible(false)}
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

      {/* main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
