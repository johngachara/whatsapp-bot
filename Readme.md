# WhatsApp Insights Bot

A Node.js-based WhatsApp bot that automatically sends daily and weekly insights from an API to a specified WhatsApp number.

## Features

- **Automated Insights Delivery**: Sends daily insights on weekdays and weekly insights on Saturdays
- **Authentication Management**: Automatically handles API token acquisition and renewal
- **Persistent Authentication**: Maintains WhatsApp session between restarts
- **Timezone Support**: Configurable timezone for scheduled deliveries
- **Auto-Response**: Responds to messages with a friendly explanation of the bot's purpose


## Usage

### Starting the Bot

```bash
node client.js
```

On first run, the bot will display a QR code in the terminal. Scan this with WhatsApp on your phone to authenticate the session.

### Scheduled Messages

- **Daily Insights**: Sent Monday through Friday at 8:30 AM (Africa/Nairobi timezone)
- **Weekly Insights**: Sent every Saturday at 8:30 AM (Africa/Nairobi timezone)

### Auto-Response

The bot will automatically respond to messages that suggest the user thinks it's a conversational AI, clarifying its purpose as an insights delivery system.

## API Endpoints

The bot interacts with the following API endpoints:

- `/api/celery-token/`: Authenticates and returns an access token
- `/api/daily-ai/`: Retrieves the daily insight message
- `/api/weekly-ai/`: Retrieves the weekly insight message
