const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

// Constants
const API_URL = process.env.API_URL;
const PHONE_NUMBER = process.env.PHONE_NUMBER;
const TIMEZONE = "Africa/Nairobi";

// Create axios instance with token management
const axiosInstance = axios.create({
    baseURL: API_URL,
});

// Store token and its expiration time
let authToken = null;
let tokenExpiry = null;

// Token management interceptor
axiosInstance.interceptors.request.use(
    async (config) => {
        // Skip token acquisition for the token endpoint itself
        if (config.url === '/api/celery-token/') {
            return config;
        }

        // Check if we need a new token
        const currentTime = new Date().getTime();
        if (!authToken || !tokenExpiry || currentTime >= tokenExpiry) {
            try {
                // Get the token
                const tokenResponse = await axios.post(`${API_URL}/api/celery-token/`, {
                    api_key: process.env.CELERY_KEY
                });

                // Store token and set expiry (assuming token is valid for 1 hour)
                authToken = tokenResponse.data.access;
                tokenExpiry = new Date().getTime() + (3600 * 1000); // 1 hour in milliseconds

                console.log('New authentication token acquired');
            } catch (error) {
                console.error('Error getting authentication token:', error);
                return Promise.reject(error);
            }
        }

        // Add the token to the request headers
        config.headers.Authorization = `Bearer ${authToken}`;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Create WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true, // Run in headless mode for server environments
    }
});

// Error handling for WhatsApp client
client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    // Attempt to reconnect
    client.initialize();
});

// Generate QR if not authenticated yet
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above to log in!');
});

// Once authenticated
client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

// Ready to send messages
client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    setupCronJobs();
});
// Function to fetch and send insights
async function fetchAndSendInsight(endpoint, messageType) {
    try {
        console.log(`Fetching ${messageType} insight...`);
        const response = await axiosInstance.get(endpoint);

        if (response.status === 200) {
            await client.sendMessage(PHONE_NUMBER, response.data.message);
            console.log(`${messageType} insight sent successfully!`);
        } else {
            console.error(`Unexpected response status: ${response.status}`);
        }
    } catch (error) {
        console.error(`Error while fetching/sending ${messageType} insight:`, error);
        // If the error is due to token expiration, clear token to force refresh on next attempt
        if (error.response && error.response.status === 401) {
            authToken = null;
            tokenExpiry = null;
        }
    }
}

// Set up cron jobs
function setupCronJobs() {
    // Daily insight Monday to Friday at 8:30 AM
    // TODO Revert this back to 8 30 after testing
    cron.schedule('05 13 * * 1-5', async () => {
        await fetchAndSendInsight('/api/daily-ai/', 'daily');
    }, {
        timezone: TIMEZONE
    });

    // Weekly insight on Saturday at 8:30 AM
    cron.schedule('30 8 * * 6', async () => {
        await fetchAndSendInsight('/api/weekly-ai/', 'weekly');
    }, {
        timezone: TIMEZONE
    });

    console.log('Cron jobs scheduled successfully');
    console.log('- Daily insights: Monday-Friday at 8:30 AM (Africa/Nairobi)');
    console.log('- Weekly insights: Saturday at 8:30 AM (Africa/Nairobi)');
}

// Initialize the client
console.log('Starting WhatsApp bot...');
client.initialize().catch(err => {
    console.error('Failed to initialize WhatsApp client:', err);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});