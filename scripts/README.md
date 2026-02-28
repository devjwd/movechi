# Leaderboard Indexer Scripts

Backend indexing service for Movechi leaderboard data.

## Why?

Relying purely on on-chain queries is slow and unreliable because:
- Multiple RPC calls required (1 per player)
- Rate limiting issues
- Slow page load times
- Not scalable as player count grows

This indexer solves it by:
- Periodically syncing all player data to a local cache file
- Frontend loads from fast JSON file instead of blockchain
- Can run as background service or cron job

## Setup

```bash
cd scripts
npm install
```

## Usage

### One-time sync
```bash
npm run index
```

### Watch mode (auto-sync every 30s)
```bash
npm run index:watch
```

### Fast sync (every 10s for development)
```bash
npm run index:fast
```

### Custom interval
```bash
node leaderboard-indexer.js --watch --interval=60  # Every 60 seconds
```

## Output

Creates `frontend/public/leaderboard-cache.json` with:
```json
{
  "lastSync": 1705276800000,
  "gameState": {
    "seasonId": 1,
    "totalGlobalXP": "456789",
    "seasonStarted": true
  },
  "players": [
    {
      "rank": 1,
      "address": "0x...",
      "displayAddr": "0x1234...ab56",
      "xp": "125430",
      "xpNumber": 125430,
      "nonce": 847,
      "winnings": 15234.50,
      "tickets": 23,
      "stakedNfts": 12
    }
  ],
  "metadata": {
    "totalPlayers": 156,
    "totalXP": 2456789,
    "totalSpins": 18934,
    "avgXP": 15748
  }
}
```

## Frontend Integration

Update your leaderboard to load from cache:

```javascript
// Load cached data for instant display
const cachedData = await fetch('/leaderboard-cache.json').then(r => r.json())

// Use cached data immediately, then refresh from chain in background
```

## Production Deployment

### Option 1: Cron Job
```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * cd /path/to/movechi && node scripts/leaderboard-indexer.js
```

### Option 2: Background Service (systemd)
```ini
# /etc/systemd/system/movechi-indexer.service
[Unit]
Description=Movechi Leaderboard Indexer
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/movechi/scripts
ExecStart=/usr/bin/node leaderboard-indexer.js --watch --interval=30
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable movechi-indexer
sudo systemctl start movechi-indexer
sudo systemctl status movechi-indexer
```

### Option 3: PM2 (Node.js process manager)
```bash
npm install -g pm2
pm2 start leaderboard-indexer.js --name movechi-indexer -- --watch
pm2 save
pm2 startup
```

## Environment Variables

Set in `.env` or pass directly:
```bash
VITE_CONTRACT_ADDRESS=0xa00435... \
VITE_FULLNODE_URL=https://testnet.movementnetwork.xyz/v1 \
node leaderboard-indexer.js --watch
```

## Monitoring

Check logs:
```bash
# PM2
pm2 logs movechi-indexer

# Systemd
journalctl -u movechi-indexer -f
```

## Cache File Location

Default: `frontend/public/leaderboard-cache.json`

This is served by Vite/Vercel as a static file at `/leaderboard-cache.json`
