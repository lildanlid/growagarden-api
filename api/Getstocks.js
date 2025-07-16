const https = require("https");

const options = {
    method: "GET",
    hostname: "growagarden.gg",
    port: null,
    path: "/api/stock",
    headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        priority: "u=1, i",
        referer: "https://growagarden.gg/stocks",
        "trpc-accept": "application/json",
        "x-trpc-source": "gag"
    }
};

function fetchStocks() {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            const chunks = [];
            res.on("data", (chunk) => {
                chunks.push(chunk);
            });

            res.on("end", () => {
                try {
                    const body = Buffer.concat(chunks);
                    const parsedData = JSON.parse(body.toString());
                    resolve(parsedData);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on("error", (e) => {
            reject(e);
        });

        req.end();
    });
}

function formatStockItems(items, imageData) {
    if (!Array.isArray(items) || items.length === 0) return [];

    return items.map(item => {
        const image = imageData?.[item.name] || null;
        return {
            name: item?.name || "Unknown Item",
            value: item?.value ?? null,
            ...(image && { image })
        };
    });
}

function formatLastSeenItems(items, imageData) {
    if (!Array.isArray(items) || items.length === 0) return [];

    return items.map(item => {
        const image = imageData?.[item.name] || null;
        return {
            name: item?.name || "Unknown",
            emoji: item?.emoji || "❓",
            seen: item?.seen ?? null,
            ...(image && { image })
        };
    });
}

function formatStocks(stocks) {
    const imageData = stocks.imageData || {};

    return {
        easterStock: formatStockItems(stocks.easterStock, imageData),
        gearStock: formatStockItems(stocks.gearStock, imageData),
        eggStock: formatStockItems(stocks.eggStock, imageData),
        nightStock: formatStockItems(stocks.nightStock, imageData),
        honeyStock: formatStockItems(stocks.honeyStock, imageData),
        cosmeticsStock: formatStockItems(stocks.cosmeticsStock, imageData),
        seedsStock: formatStockItems(stocks.seedsStock, imageData),

        lastSeen: {
            Seeds: formatLastSeenItems(stocks.lastSeen?.Seeds, imageData),
            Gears: formatLastSeenItems(stocks.lastSeen?.Gears, imageData),
            Weather: formatLastSeenItems(stocks.lastSeen?.Weather, imageData),
            Eggs: formatLastSeenItems(stocks.lastSeen?.Eggs, imageData),
            Honey: formatLastSeenItems(stocks.lastSeen?.Honey, imageData)
        },

        restockTimers: stocks.restockTimers || {},
    };
}

async function FetchStockData() {
    try {
        const data = await fetchStocks();
        return formatStocks(data);
    } catch (err) {
        console.error("Error fetching stock data:", err);
        return null;
    }
}

function register(app) {
    app.get('/api/stock/GetStock', async (req, res) => {
        try {
            const stockData = await FetchStockData();
            if (!stockData) {
                res.status(500).json({ error: "Failed to fetch stock data" });
                return;
            }
            res.json(stockData);
        } catch (err) {
            res.status(500).json({ error: "Error fetching stock data" });
        }
    });
}

module.exports = { register };
