# CS Server Embed Generator

A full-stack application for generating customizable, real-time HTML embed widgets for Counter-Strike 1.6 servers.

## Features

- 🎮 Query CS 1.6 servers using Source/GoldSrc protocol
- 🎨 8+ pre-built themes (Neon, Classic, Minimal, Terminal, Retro, Glassmorphism, Military, Cyberpunk)
- 🎯 Fully customizable colors, fonts, layouts
- 📊 Real-time server status updates
- 🔄 Auto-refresh with configurable intervals
- 📱 Responsive design (mobile, tablet, desktop)
- 🔗 Shareable widget configurations
- 📦 Both iframe and standalone embed options

## Tech Stack

**Backend:**
- FastAPI (Python)
- MongoDB with Motor (async driver)
- python-a2s for CS server queries

**Frontend:**
- React 19
- Tailwind CSS
- Shadcn/UI components
- Axios for API calls

## Installation

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and configure MongoDB connection

# Run server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
cd frontend
yarn install

# Create .env file
cp .env.example .env
# Edit .env and set REACT_APP_BACKEND_URL

# Run development server
yarn start
```

## API Endpoints

- `POST /api/query-server` - Query a CS 1.6 server
- `POST /api/save-config` - Save widget configuration
- `GET /api/config/{id}` - Retrieve configuration
- `GET /api/server-status/{id}` - Get real-time server data
- `GET /api/widget/{id}` - Serve widget HTML

## Environment Variables

**Backend (.env):**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=cs_server_db
CORS_ORIGINS=*
BACKEND_URL=http://localhost:8001
```

**Frontend (.env):**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Usage

1. Enter CS 1.6 server IP and port on the homepage
2. Click "Fetch Server Info" to query the server
3. Customize widget appearance on the settings page
4. Generate embed code and copy it to your website

## License

Open Source - MIT License

## Credits

Built with ❤️ using FastAPI and React
# cs-server-embed-generator
