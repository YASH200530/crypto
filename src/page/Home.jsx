import { useEffect, useState } from 'react';
import { fetchCoins } from '../services/api';
import CryptoCard from '../component/Card';
import { Link } from "react-router-dom";

export default function Home() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [sortOption, setSortOption] = useState('');

  useEffect(() => {
    const loadCoins = async () => {
      setLoading(true);
      const data = await fetchCoins(page);

      const filtered = query
        ? data.filter((coin) =>
            coin.name.toLowerCase().includes(query.toLowerCase()) ||
            coin.symbol.toLowerCase().includes(query.toLowerCase())
          )
        : data;

      if (page === 1) {
        setCoins(filtered);
      } else {
        setCoins((prev) => [...prev, ...filtered]);
      }

      setLoading(false);
    };

    loadCoins();
  }, [page, query]);

  const sortedCoins = [...coins].sort((a, b) => {
    switch (sortOption) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'price-asc':
        return a.current_price - b.current_price;
      case 'price-desc':
        return b.current_price - a.current_price;
      case 'change-asc':
        return a.price_change_percentage_24h - b.price_change_percentage_24h;
      case 'change-desc':
        return b.price_change_percentage_24h - a.price_change_percentage_24h;
      default:
        return 0;
    }
  });

  const handleSearch = (e) => {
    setQuery(e.target.value);
    setPage(1); // Reset page on new search
  };

  return (
    <div className="p-4">
      {/* 💱 Buy/Sell Crypto Button */}
      <div className="mb-4 flex justify-end">
        <Link
          to="/trade"
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded shadow"
        >
          💱 Buy / Sell Crypto
        </Link>
      </div>

      {/* 🔍 Search Bar */}
      <input
        type="text"
        placeholder="Search by name or symbol..."
        className="w-full mb-4 p-2 border rounded dark:bg-gray-800 dark:text-white"
        value={query}
        onChange={handleSearch}
      />

      {/* 🔃 Sort Dropdown */}
      <div className="mb-4">
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white"
        >
          <option value="">Sort by...</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="price-asc">Price (Low to High)</option>
          <option value="price-desc">Price (High to Low)</option>
          <option value="change-asc">% Change (Low to High)</option>
          <option value="change-desc">% Change (High to Low)</option>
        </select>
      </div>

      {/* 🪙 Coin Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {sortedCoins.length > 0 ? (
          sortedCoins.map((coin) => (
            <CryptoCard key={coin.id} coin={coin} />
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">No coins found.</p>
        )}
      </div>

      {/* ⏬ Load More Button */}
      {!loading && (
        <div className="text-center mt-6">
          <button
            onClick={() => setPage((prev) => prev + 1)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          >
            Load More
          </button>
        </div>
      )}

      {loading && <p className="text-center mt-4">Loading...</p>}
    </div>
  );
}
