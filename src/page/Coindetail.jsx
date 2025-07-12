import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function CoinDetail() {
  const { id } = useParams();
  const [coin, setCoin] = useState(null);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Fetch coin basic data
    fetch(`https://api.coingecko.com/api/v3/coins/${id}`)
      .then((res) => res.json())
      .then(setCoin)
      .catch(console.error);

    // Fetch chart data
    fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7`
    )
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.prices.map(([timestamp, price]) => ({
          date: new Date(timestamp).toLocaleDateString(),
          price: price.toFixed(2),
        }));
        setChartData(formatted);
      })
      .catch(console.error);
  }, [id]);

  if (!coin) return <p className="text-center p-4">Loading...</p>;

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <img src={coin.image.large} alt={coin.name} className="w-16 h-16" />
        <h1 className="text-3xl font-bold">{coin.name}</h1>
      </div>

      <p className="text-lg">
        <strong>Symbol:</strong> {coin.symbol.toUpperCase()}
      </p>
      <p className="text-lg">
        <strong>Current Price:</strong> $
        {coin.market_data.current_price.usd.toLocaleString()}
      </p>
      <p className="text-lg">
        <strong>Market Cap:</strong> $
        {coin.market_data.market_cap.usd.toLocaleString()}
      </p>

      {/* Chart */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">7-Day Price Chart</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Line type="monotone" dataKey="price" stroke="#4F46E5" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Description */}
      <div
        className="mt-6 prose max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{
          __html: coin.description.en?.slice(0, 500) + '...',
        }}
      />
    </div>
  );
}
