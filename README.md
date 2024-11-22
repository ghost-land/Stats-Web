# Game Stats Website 📊

A modern web application for tracking and analyzing game download statistics for NX Server.

## ✨ Features

- 📈 Real-time download statistics tracking
- 🎨 Beautiful, responsive UI with dark mode support
- 📊 Interactive charts and visualizations
- 🔍 Search functionality
- ⏱️ Period-based statistics (72h, 7d, 30d, all-time)
- 🎮 Detailed game information pages

## 🚀 Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

## 💻 Installation

1. Clone the repository:
```bash
git clone https://github.com/ghost-land/Stats-Web.git
cd Stats-Web
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Data Sources
NEXT_PUBLIC_WORKING_JSON_URL=https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/working.json
NEXT_PUBLIC_TITLES_DB_URL=https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/titles_db.txt

# Indexer Configuration (1 hour in milliseconds)
REINDEX_INTERVAL=3600000
DATA_DIR=/path/to/your/data/directory
```

4. Place your data files in the `/data` directory.

## 🛠️ Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deployment

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

2. Configure Nginx and start services:
```bash
# Start application with PM2
pm2 start npm --name "game-stats" -- start
pm2 startup && pm2 save
```

## 🔧 Environment Variables

- `NEXT_PUBLIC_API_URL`: Base URL for the API
- `NEXT_PUBLIC_WORKING_JSON_URL`: URL for the working.json file
- `NEXT_PUBLIC_TITLES_DB_URL`: URL for the titles database
- `REINDEX_INTERVAL`: Interval for reindexing data (default: 3600000 - 1 hour)
- `DATA_DIR`: Directory path for game data files

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.