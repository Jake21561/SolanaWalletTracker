require('dotenv').config();
const axios = require('axios');
const WebSocket = require('ws');

const SOLSCAN_API_KEY = process.env.SOLSCAN_API_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Read wallets from the .env file
const wallets = process.env.WALLETS ? process.env.WALLETS.split(',') : [];

if (wallets.length === 0) {
  console.error('No wallets provided. Please add wallet addresses to the `WALLETS` variable in the .env file.');
  process.exit(1); // Exit the application if no wallets are provided
}


async function sendDiscordNotification(wallet, transaction) {
  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      content: `New transaction detected for wallet: ${wallet}\nDetails: ${JSON.stringify(transaction, null, 2)}`,
    });
    console.log(`Notification sent for wallet: ${wallet}`);
  } catch (error) {
    console.error(`Error sending notification: ${error.message}`);
  }
}

async function trackTransactions() {
  console.log('Starting real-time tracking for wallets...');

  const ws = new WebSocket(`https://api.solscan.io/transaction-realtime?apikey=${SOLSCAN_API_KEY}`);

  ws.on('open', () => {
    console.log('Connected to Solscan WebSocket');
    ws.send(JSON.stringify({ wallets }));
  });

  ws.on('message', (data) => {
    const transactionData = JSON.parse(data);
    const { wallet, transaction } = transactionData;

    if (wallets.includes(wallet)) {
      console.log(`Transaction detected for wallet: ${wallet}`, transaction);
      sendDiscordNotification(wallet, transaction);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed. Reconnecting...');
    setTimeout(trackTransactions, 5000); // Reconnect after 5 seconds
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
}

trackTransactions();
