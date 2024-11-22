# Game Stats Website

A modern web application for tracking and analyzing game download statistics.

## Features

- Real-time download statistics tracking
- Beautiful, responsive UI with dark mode support
- Interactive charts and visualizations
- Search functionality
- Period-based statistics (72h, 7d, 30d, all-time)
- Detailed game information pages

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Git (optional)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ghost-land/Stats-Web.git
cd Stats-Web
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with the following content:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WORKING_JSON_URL=https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/working.json
NEXT_PUBLIC_TITLES_DB_URL=https://raw.githubusercontent.com/ghost-land/NX-Missing/refs/heads/main/data/titles_db.txt
REINDEX_INTERVAL=3600000
DATA_DIR=/path/to/your/data/directory
```

4. Place your data files in the `/data` directory.

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
npm run build
# or
yarn build
```

## Deployment

### Deploy to Ubuntu Server

1. Install Node.js and npm:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Install PM2 globally:
```bash
sudo npm install -g pm2
```

3. Clone the repository and install dependencies:
```bash
git clone https://github.com/ghost-land/Stats-Web.git
cd Stats-Web
npm install
```

4. Build the application:
```bash
npm run build
```

5. Set up Nginx:
```bash
sudo apt-get install nginx
```

6. Create the data directory and set permissions:
```bash
# Create data directory
mkdir -p /var/www/game-stats/data

# Set appropriate permissions
sudo chown -R $USER:$USER /var/www/game-stats/data
sudo chmod -R 755 /var/www/game-stats/data
```

7. Copy your data files:
```bash
# Copy data files to the production directory
cp -r ./data/* /var/www/game-stats/data/
```

8. Create and configure Nginx site:
```bash
sudo nano /etc/nginx/sites-available/game-stats
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

9. Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/game-stats /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

10. Start the application with PM2:
```bash
pm2 start npm --name "game-stats" -- start
```

11. Set up PM2 to start on boot:
```bash
pm2 startup
pm2 save
```

## Environment Variables

- `NEXT_PUBLIC_API_URL`: The base URL for the API
- `NEXT_PUBLIC_WORKING_JSON_URL`: URL for the working.json file
- `NEXT_PUBLIC_TITLES_DB_URL`: URL for the titles database
- `REINDEX_INTERVAL`: Interval for reindexing data in milliseconds (default: 3600000 - 1 hour)
- `DATA_DIR`: Directory path for game data files

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details