# Game Stats Website 📊

A modern web application for tracking and analyzing game download statistics.

https://github.com/user-attachments/assets/0cd9f3c3-e986-46ec-a2af-36aff6a3c1ab

## ✨ Features

- 📈 Real-time download statistics tracking
- 🎨 Beautiful, responsive UI with dark mode support
- 📊 Interactive charts and visualizations
- 🔍 Advanced search functionality with filters
- ⏱️ Period-based statistics (72h, 7d, 30d, all-time)
- 🎮 Detailed game information pages
- 📱 Mobile-friendly design
- 🌐 Public REST API
- 💾 Direct database access for offline analysis
- 📊 Pre-calculated analytics
- 🏆 Real-time rankings
- 📈 Growth rate tracking
- 📦 Content type filtering (Base Games, Updates, DLC)
- 📅 Custom date range filtering
- 📊 Advanced analytics dashboard

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ghost-land/Stats-Web.git
cd Stats-Web
```

2. Install dependencies:
```bash
npm install
```

3. Place your data files in the `/data` directory.

## 🛠️ Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 API Access

The project provides a comprehensive REST API for accessing game statistics. All endpoints are publicly available without authentication.

### Base URL
```
https://your-domain.com
```

### Database Access
For offline analysis or personal projects, you can download the complete SQLite database:
```
https://your-domain.com/games.db
```

### Rate Limits
- 100 requests per minute per IP
- Analytics data cached for 5 minutes
- Game data cached for 1 hour
- Rankings updated hourly

### Available Endpoints

#### Analytics
- `GET /api/analytics` - Get detailed analytics with various filters
- `GET /api/stats` - Get global statistics

#### Games
- `GET /api/games` - Get all games with statistics
- `GET /api/games/[tid]` - Get details for a specific game
- `GET /api/search` - Search games by name or TID

#### Rankings
- `GET /api/rankings/[tid]` - Get rankings for a specific game
- `GET /api/top/[period]` - Get top games by period

#### System
- `GET /api/uptime` - Get server uptime information

For detailed API documentation, visit `/api/docs` in your browser.

## 🔧 Environment Variables

All environment variables are configured in `ecosystem.config.js`:

- `NEXT_PUBLIC_API_URL`: Base URL for the API
- `NEXT_PUBLIC_WORKING_JSON_URL`: URL for the working.json file
- `NEXT_PUBLIC_TITLES_DB_URL`: URL for the titles database
- `REINDEX_INTERVAL`: Interval for reindexing data (default: 3600000 - 1 hour)
- `DATA_DIR`: Directory path for game data files

## 🚀 Deployment

1. Install dependencies and build:
```bash
# Install Node.js and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2

# Set up application
cd /var/www/game-stats
npm install
npm run build

# Configure data directory
sudo mkdir -p data
sudo chown -R $USER:$USER data
```

2. Configure PM2 with ecosystem.config.js:
```bash
# Start application with PM2
pm2 start ecosystem.config.js
pm2 startup && pm2 save
```

## 📝 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📫 Support

For support or questions, please open an issue in the [GitHub repository](https://github.com/ghost-land/Stats-Web/issues).