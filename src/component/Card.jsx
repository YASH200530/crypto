import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';

export default function CryptoCard({ coin }) {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('favorites')) || [];
    setIsFavorite(favs.includes(coin.id));
  }, [coin.id]);

  // Toggle favorite status
  const toggleFavorite = () => {
    const favs = JSON.parse(localStorage.getItem('favorites')) || [];
    let updatedFavs;

    if (favs.includes(coin.id)) {
      updatedFavs = favs.filter((id) => id !== coin.id);
    } else {
      updatedFavs = [...favs, coin.id];
    }

    localStorage.setItem('favorites', JSON.stringify(updatedFavs));
    setIsFavorite(updatedFavs.includes(coin.id));
  };

  const handleCardClick = () => {
    navigate(`/coin/${coin.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white shadow-md rounded p-4 dark:bg-gray-800 cursor-pointer relative transition hover:shadow-lg"
    >
      {/* Star icon button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite();
        }}
        title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        aria-label="Toggle favorite"
        className="absolute top-2 right-2 text-yellow-400 hover:scale-110 transition"
      >
        <FaStar fill={isFavorite ? '#FACC15' : 'transparent'} stroke="#FACC15" />
      </button>

      {/* Coin Info */}
      <img src={coin.image} alt={coin.name} className="w-10 h-10 mb-2 mx-auto" />
      <h2 className="font-bold text-lg text-center">{coin.name}</h2>
      <p className="text-center">💰 ${coin.current_price.toLocaleString()}</p>
      <p
        className={`text-center ${
          coin.price_change_percentage_24h > 0 ? 'text-green-500' : 'text-red-500'
        }`}
      >
        {coin.price_change_percentage_24h.toFixed(2)}%
      </p>
    </div>
  );
}
