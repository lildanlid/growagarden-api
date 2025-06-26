import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import './App.css';

const GIF_URL = '/gagstock.gif'; // Place gagstock.gif in public folder

function formatCountdown(updatedAt, intervalSec) {
  const now = Date.now();
  const passed = Math.floor((now - updatedAt) / 1000);
  const remaining = Math.max(intervalSec - passed, 0);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
}

function getHoneyRestockCountdown() {
  const nowPH = moment.tz('Asia/Manila');
  const currentMinutes = nowPH.minute();
  const currentSeconds = nowPH.second();
  const remainingMinutes = 59 - currentMinutes;
  const remainingSeconds = 60 - currentSeconds;
  const m = remainingMinutes < 10 ? `0${remainingMinutes}` : remainingMinutes;
  const s = remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds;
  return `${m}m ${s}s`;
}

function App() {
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = async () => {
    try {
      const [gearSeed, egg, weather, honey, cosmetics, emojiSeeds] = await Promise.all([
        axios.get("https://growagardenstock.com/api/stock?type=gear-seeds"),
        axios.get("https://growagardenstock.com/api/stock?type=egg"),
        axios.get("https://growagardenstock.com/api/stock/weather"),
        axios.get("http://65.108.103.151:22377/api/stocks?type=honeyStock"),
        axios.get("https://growagardenstock.com/api/special-stock?type=cosmetics"),
        axios.get("http://65.108.103.151:22377/api/stocks?type=seedsStock")
      ]);

      setData({
        gearSeed: gearSeed.data,
        egg: egg.data,
        weather: weather.data,
        honey: honey.data,
        cosmetics: cosmetics.data,
        emojiSeeds: emojiSeeds.data?.seedsStock || []
      });

      setLastUpdated(moment().tz('Asia/Manila').format('hh:mm:ss A'));
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div className="text-center p-10 text-white">Loading stock data...</div>;

  const { gearSeed, egg, weather, honey, cosmetics, emojiSeeds } = data;

  const gearRestock = formatCountdown(gearSeed.updatedAt, 300);
  const eggRestock = formatCountdown(egg.updatedAt, 600);
  const cosmeticsRestock = formatCountdown(cosmetics.updatedAt, 14400);
  const honeyRestock = getHoneyRestockCountdown();

  const gearList = gearSeed.gear?.map(item => `- ${item}`).join("\n") || "No gear.";
  const seedList = gearSeed.seeds?.map(seed => {
    const name = seed.split(" **")[0];
    const matched = emojiSeeds.find(s => s.name.toLowerCase() === name.toLowerCase());
    const emoji = matched?.emoji || "";
    return `- ${emoji ? `${emoji} ` : ""}${seed}`;
  }).join("\n") || "No seeds.";

  const eggList = egg.egg?.map(item => `- ${item}`).join("\n") || "No eggs.";
  const cosmeticsList = cosmetics.cosmetics?.map(item => `- ${item}`).join("\n") || "No cosmetics.";
  const honeyList = honey.honeyStock?.map(h => `- ${h.name}: ${h.value}`).join("\n") || "No honey stock.";

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-mono relative overflow-hidden">
      <img
        src={GIF_URL}
        alt="Banner"
        className="w-full max-h-60 object-cover rounded-xl shadow mb-4 border border-green-400"
      />
      <h1 className="text-3xl font-bold text-green-400 mb-4 text-center">🌾 Grow A Garden — Stock Tracker</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold">🛠️ Gear</h2>
          <pre>{gearList}</pre>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold">🌱 Seeds</h2>
          <pre>{seedList}</pre>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold">🥚 Eggs</h2>
          <pre>{eggList}</pre>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold">🎨 Cosmetics</h2>
          <pre>{cosmeticsList}</pre>
          <p className="mt-2 text-yellow-300">⏳ Restock in: {cosmeticsRestock}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold">🍯 Honey Stock</h2>
          <pre>{honeyList}</pre>
          <p className="mt-2 text-yellow-300">⏳ Restock in: {honeyRestock}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <h2 className="text-lg font-semibold">🌤️ Weather</h2>
          <p>{weather.icon || '🌦️'} {weather.currentWeather || 'Unknown'}</p>
          <h3 className="mt-2">🪴 Crop Bonus:</h3>
          <p>{weather.cropBonuses || 'None'}</p>
        </div>
      </div>

      <div className="mt-6 text-center text-green-400">
        <p>⏳ Gear/Seed Restock: {gearRestock}</p>
        <p>⏳ Egg Restock: {eggRestock}</p>
        <p className="mt-2">🕒 Last Updated: {lastUpdated} (Asia/Manila)</p>
      </div>
    </div>
  );
}

export default App;
