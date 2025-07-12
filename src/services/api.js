// api.js

 //🔗 Fetch crypto coins from CoinGecko
export const fetchCoins = async (page = 1) => {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=${page}`
    );
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return [];
  }
};
