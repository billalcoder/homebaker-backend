import fetch from "node-fetch"; // If using Node 18+, built-in fetch works — remove this line.

const URL = process.env.SERVER_URL; // Your backend URL

setInterval(async () => {
  try {
    await fetch(URL);
    console.log("🔄 Pinged server at:", new Date().toISOString());
  } catch (err) {
    console.error("❌ Ping failed:", err.message);
  }
}, 1000 * 60 * 5); // Runs every 5 minutes
