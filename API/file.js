const axios = require('axios');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const moment = require('moment-timezone');

const activeSessions = new Map();

const GIF_PATH = './assets/gagstock.gif'; // Make sure to put your gif here

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

async function fetchStockData() {
  const [
    gearSeedRes,
    eggRes,
    weatherRes,
    honeyRes,
    cosmeticsRes,
    seedsEmojiRes
  ] = await Promise.all([
    axios.get("https://growagardenstock.com/api/stock?type=gear-seeds"),
    axios.get("https://growagardenstock.com/api/stock?type=egg"),
    axios.get("https://growagardenstock.com/api/stock/weather"),
    axios.get("http://65.108.103.151:22377/api/stocks?type=honeyStock"),
    axios.get("https://growagardenstock.com/api/special-stock?type=cosmetics"),
    axios.get("http://65.108.103.151:22377/api/stocks?type=seedsStock")
  ]);

  return {
    gearSeed: gearSeedRes.data,
    egg: eggRes.data,
    weather: weatherRes.data,
    honey: honey.data,
    cosmetics: cosmeticsRes.data,
    emojiSeeds: seedsEmojiRes.data?.seedsStock || []
  };
}

function createEmbed(data, lastUpdated) {
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

  const weatherIcon = weather.icon || "🌦️";
  const weatherCurrent = weather.currentWeather || "Unknown";
  const cropBonus = weather.cropBonuses || "None";

  const embed = new EmbedBuilder()
    .setTitle("🌾 Grow A Garden — Stock Tracker")
    .setColor(0x6A9955)
    .addFields(
      { name: "🛠️ Gear", value: gearList, inline: true },
      { name: "🌱 Seeds", value: seedList, inline: true },
      { name: "🥚 Eggs", value: eggList, inline: true },
      { name: "🎨 Cosmetics", value: cosmeticsList + `\n⏳ Restock in: ${cosmeticsRestock}`, inline: false },
      { name: "🍯 Honey Stock", value: honeyList + `\n⏳ Restock in: ${honeyRestock}`, inline: false },
      { name: "🌤️ Weather", value: `${weatherIcon} ${weatherCurrent}`, inline: true },
      { name: "🪴 Crop Bonus", value: cropBonus, inline: true },
      { name: "⏳ Gear/Seed Restock", value: gearRestock, inline: true },
      { name: "⏳ Egg Restock", value: eggRestock, inline: true }
    )
    .setFooter({ text: `Created by Sunnel | Last Updated: ${lastUpdated}` });

  return embed;
}

async function startTracking(channel, userId) {
  if (activeSessions.has(userId)) {
    return channel.send("📡 You're already tracking GAG stock! Use `!gagstock off` to stop.");
  }

  channel.send("✅ Started tracking Grow A Garden stock. Updates every 10 seconds!");

  const session = {
    interval: null,
    lastCombinedKey: null,
  };

  session.interval = setInterval(async () => {
    try {
      const data = await fetchStockData();

      const combinedKey = JSON.stringify({
        gear: data.gearSeed.gear,
        seeds: data.gearSeed.seeds,
        egg: data.egg.egg,
        weather: data.weather.updatedAt,
        honeyStock: data.honey.honeyStock,
        cosmetics: data.cosmetics.cosmetics
      });

      if (combinedKey === session.lastCombinedKey) return;
      session.lastCombinedKey = combinedKey;

      const lastUpdated = moment().tz('Asia/Manila').format('hh:mm:ss A');

      const embed = createEmbed(data, lastUpdated);
      const gif = new AttachmentBuilder(GIF_PATH);

      await channel.send({ embeds: [embed], files: [gif] });
    } catch (err) {
      console.error("Error fetching GAG stock:", err);
    }
  }, 10000);

  activeSessions.set(userId, session);
}

function stopTracking(channel, userId) {
  const session = activeSessions.get(userId);
  if (!session) return channel.send("⚠️ You don't have an active GAG stock tracking session.");

  clearInterval(session.interval);
  activeSessions.delete(userId);
  return channel.send("🛑 Stopped tracking Grow A Garden stock.");
}

module.exports = {
  name: 'gagstock',
  description: 'Track Grow A Garden stock with auto updates.',
  options: [
    {
      name: 'action',
      type: 3, // STRING
      description: 'Use "on" to start or "off" to stop tracking',
      required: true,
      choices: [
        { name: 'on', value: 'on' },
        { name: 'off', value: 'off' },
      ],
    },
  ],
  async execute(interactionOrMessage, args) {
    const isInteraction = interactionOrMessage.isChatInputCommand?.() ?? false;

    // Channel & userId extraction
    const channel = isInteraction ? interactionOrMessage.channel : interactionOrMessage.channel;
    const userId = isInteraction ? interactionOrMessage.user.id : interactionOrMessage.author.id;

    let action;
    if (isInteraction) {
      action = interactionOrMessage.options.getString('action');
    } else {
      action = args[0]?.toLowerCase();
    }

    if (action === 'off') {
      if (isInteraction) {
        await stopTracking(channel, userId);
        await interactionOrMessage.reply({ content: '🛑 GAG stock tracking stopped.', ephemeral: true });
      } else {
        await stopTracking(channel, userId);
      }
      return;
    }

    if (action !== 'on') {
      const usageMsg = '📌 Usage:\n• `!gagstock on` to start tracking\n• `!gagstock off` to stop tracking';
      if (isInteraction) {
        await interactionOrMessage.reply({ content: usageMsg, ephemeral: true });
      } else {
        await channel.send(usageMsg);
      }
      return;
    }

    if (activeSessions.has(userId)) {
      const alreadyMsg = "📡 You're already tracking GAG stock! Use `!gagstock off` to stop.";
      if (isInteraction) {
        await interactionOrMessage.reply({ content: alreadyMsg, ephemeral: true });
      } else {
        await channel.send(alreadyMsg);
      }
      return;
    }

    await startTracking(channel, userId);

    if (isInteraction) {
      await interactionOrMessage.reply({ content: '✅ GAG stock tracking started! Updates every 10 seconds.', ephemeral: true });
    }
  }
};
