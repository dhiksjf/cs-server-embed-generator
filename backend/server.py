from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import a2s
import asyncio
import socket
import time
import zipfile
import io
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class ServerQueryRequest(BaseModel):
    ip: str
    port: int

class ServerInfo(BaseModel):
    hostname: str
    map: str
    current_players: int
    max_players: int
    game: str
    server_type: str
    os: str
    password_protected: bool
    vac_enabled: bool
    ping: Optional[float] = None

class WidgetConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    config_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    server_ip: str
    server_port: int
    enabled_fields: Dict[str, bool] = Field(default_factory=lambda: {
        "hostname": True,
        "map": True,
        "current_players": True,
        "max_players": True,
        "player_list": False,
        "game": True,
        "ping": True,
        "password_protected": True,
        "vac_enabled": True
    })
    theme: str = "neon"  # neon, classic, minimal, terminal, retro, glassmorphism, military, cyberpunk
    accent_color: str = "#00ff88"
    background_color: str = "#0f0f14"
    text_color: str = "#e0e0e0"
    font_family: str = "'Space Grotesk', sans-serif"
    refresh_interval: int = 30  # seconds
    dark_mode: bool = True
    border_radius: int = 16
    border_style: str = "solid"
    shadow_intensity: int = 50
    animation_speed: str = "normal"
    layout: str = "default"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WidgetConfigCreate(BaseModel):
    server_ip: str
    server_port: int
    enabled_fields: Dict[str, bool]
    theme: str = "neon"
    accent_color: str = "#00ff88"
    background_color: str = "#0f0f14"
    text_color: str = "#e0e0e0"
    font_family: str = "'Space Grotesk', sans-serif"
    refresh_interval: int = 30
    dark_mode: bool = True
    border_radius: int = 16
    border_style: str = "solid"
    shadow_intensity: int = 50
    animation_speed: str = "normal"
    layout: str = "default"


# Helper function to query CS 1.6 server
def query_cs_server(ip: str, port: int, timeout: float = 3.0) -> Dict[str, Any]:
    """Query a CS 1.6 server using the Source/GoldSrc protocol"""
    try:
        address = (ip, port)
        
        # Measure ping
        start_time = time.time()
        info = a2s.info(address, timeout=timeout)
        ping = (time.time() - start_time) * 1000
        
        # Try to get player list
        try:
            players = a2s.players(address, timeout=timeout)
            player_list = [
                {"name": p.name, "score": p.score, "duration": p.duration}
                for p in players if p.name
            ]
        except Exception:
            player_list = []
        
        return {
            "success": True,
            "data": {
                "hostname": info.server_name,
                "map": info.map_name,
                "current_players": info.player_count,
                "max_players": info.max_players,
                "game": info.game,
                "server_type": info.server_type,
                "os": info.platform,
                "password_protected": info.password_protected,
                "vac_enabled": info.vac_enabled,
                "ping": round(ping, 2),
                "player_list": player_list
            }
        }
    except socket.timeout:
        return {"success": False, "error": "Connection timeout - server may be offline"}
    except ConnectionRefusedError:
        return {"success": False, "error": "Connection refused - invalid IP or port"}
    except Exception as e:
        return {"success": False, "error": f"Failed to query server: {str(e)}"}


# API Routes
@api_router.post("/query-server")
async def query_server(request: ServerQueryRequest):
    """Query a CS 1.6 server and return its information"""
    result = await asyncio.to_thread(query_cs_server, request.ip, request.port)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result["data"]


@api_router.post("/save-config", response_model=WidgetConfig)
async def save_config(config: WidgetConfigCreate):
    """Save widget configuration to database"""
    config_obj = WidgetConfig(**config.model_dump())
    
    # Convert to dict and serialize datetime
    doc = config_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.widget_configs.insert_one(doc)
    return config_obj


@api_router.get("/config/{config_id}")
async def get_config(config_id: str):
    """Retrieve a saved widget configuration"""
    config = await db.widget_configs.find_one({"config_id": config_id}, {"_id": 0})
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    # Convert ISO string timestamp back to datetime
    if isinstance(config['created_at'], str):
        config['created_at'] = datetime.fromisoformat(config['created_at'])
    
    return config


@api_router.get("/server-status/{config_id}")
async def get_server_status(config_id: str):
    """Get real-time server status for a saved configuration"""
    config = await db.widget_configs.find_one({"config_id": config_id}, {"_id": 0})
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    result = await asyncio.to_thread(
        query_cs_server, 
        config["server_ip"], 
        config["server_port"]
    )
    
    if not result["success"]:
        return {"success": False, "error": result["error"]}
    
    # Filter data based on enabled fields
    filtered_data = {}
    for field, enabled in config["enabled_fields"].items():
        if enabled and field in result["data"]:
            filtered_data[field] = result["data"][field]
    
    return {
        "success": True,
        "data": filtered_data,
        "config": {
            "theme": config["theme"],
            "accent_color": config["accent_color"],
            "font_family": config["font_family"],
            "dark_mode": config["dark_mode"],
            "refresh_interval": config["refresh_interval"]
        }
    }


@api_router.get("/widget/{config_id}", response_class=HTMLResponse)
async def serve_widget(config_id: str):
    """Serve the live widget HTML for iframe embedding"""
    config = await db.widget_configs.find_one({"config_id": config_id}, {"_id": 0})
    
    if not config:
        return HTMLResponse("<div style='color:red;padding:20px;'>Widget configuration not found</div>", status_code=404)
    
    # Get the backend URL from environment
    backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8001')
    
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CS Server Status</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: {config['font_family']};
            background: transparent;
            color: {'#e0e0e0' if config['dark_mode'] else '#1a1a1a'};
            padding: 16px;
        }}
        .widget-container {{
            background: {'rgba(15, 15, 20, 0.95)' if config['dark_mode'] else 'rgba(255, 255, 255, 0.95)'};
            border-radius: 16px;
            padding: 20px;
            border: 1px solid {'rgba(0, 255, 136, 0.3)' if config['dark_mode'] else 'rgba(0, 0, 0, 0.1)'};
            backdrop-filter: blur(12px);
            box-shadow: 0 8px 32px {'rgba(0, 255, 136, 0.1)' if config['dark_mode'] else 'rgba(0, 0, 0, 0.1)'};
            max-width: 600px;
        }}
        .server-title {{
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: {config['accent_color']};
        }}
        .info-grid {{
            display: grid;
            gap: 12px;
        }}
        .info-item {{
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: {'rgba(255, 255, 255, 0.05)' if config['dark_mode'] else 'rgba(0, 0, 0, 0.03)'};
            border-radius: 8px;
            border-left: 3px solid {config['accent_color']};
        }}
        .info-label {{
            font-weight: 500;
            opacity: 0.7;
            font-size: 14px;
        }}
        .info-value {{
            font-weight: 600;
            font-size: 14px;
        }}
        .player-list {{
            margin-top: 8px;
            font-size: 13px;
        }}
        .player {{
            padding: 6px;
            background: {'rgba(255, 255, 255, 0.03)' if config['dark_mode'] else 'rgba(0, 0, 0, 0.02)'};
            border-radius: 4px;
            margin-top: 4px;
        }}
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            background: {config['accent_color']};
            color: #000;
        }}
        .error {{
            color: #ff4444;
            padding: 12px;
            text-align: center;
            font-weight: 500;
        }}
        .loading {{
            text-align: center;
            padding: 20px;
            opacity: 0.6;
        }}
    </style>
</head>
<body>
    <div class="widget-container" id="widget">
        <div class="loading">Loading server data...</div>
    </div>
    <script>
        const API_URL = '{backend_url}/api';
        const CONFIG_ID = '{config_id}';
        const REFRESH_INTERVAL = {config['refresh_interval']} * 1000;

        async function fetchServerData() {{
            try {{
                const response = await fetch(`${{API_URL}}/server-status/${{CONFIG_ID}}`);
                const result = await response.json();
                
                if (!result.success) {{
                    document.getElementById('widget').innerHTML = `
                        <div class="error">❌ ${{result.error || 'Server offline'}}</div>
                    `;
                    return;
                }}
                
                const data = result.data;
                let html = '';
                
                if (data.hostname) {{
                    html += `<div class="server-title">${{data.hostname}}</div>`;
                }}
                
                html += '<div class="info-grid">';
                
                if (data.map) {{
                    html += `
                        <div class="info-item">
                            <span class="info-label">🗺️ Map</span>
                            <span class="info-value">${{data.map}}</span>
                        </div>
                    `;
                }}
                
                if (data.current_players !== undefined) {{
                    const maxPlayers = data.max_players !== undefined ? `/${{data.max_players}}` : '';
                    html += `
                        <div class="info-item">
                            <span class="info-label">👥 Players</span>
                            <span class="info-value">${{data.current_players}}${{maxPlayers}}</span>
                        </div>
                    `;
                }} else if (data.max_players !== undefined) {{
                    html += `
                        <div class="info-item">
                            <span class="info-label">Max Players</span>
                            <span class="info-value">${{data.max_players}}</span>
                        </div>
                    `;
                }}
                
                if (data.game) {{
                    html += `
                        <div class="info-item">
                            <span class="info-label">🎮 Game</span>
                            <span class="info-value">${{data.game}}</span>
                        </div>
                    `;
                }}
                
                if (data.ping !== undefined) {{
                    html += `
                        <div class="info-item">
                            <span class="info-label">📡 Ping</span>
                            <span class="info-value">${{data.ping}}ms</span>
                        </div>
                    `;
                }}
                
                if (data.password_protected !== undefined) {{
                    html += `
                        <div class="info-item">
                            <span class="info-label">🔒 Password</span>
                            <span class="info-value">${{data.password_protected ? 'Yes' : 'No'}}</span>
                        </div>
                    `;
                }}
                
                if (data.vac_enabled !== undefined) {{
                    html += `
                        <div class="info-item">
                            <span class="info-label">🛡️ VAC</span>
                            <span class="info-value">${{data.vac_enabled ? 'Enabled' : 'Disabled'}}</span>
                        </div>
                    `;
                }}
                
                if (data.player_list && data.player_list.length > 0) {{
                    html += `
                        <div class="info-item" style="flex-direction: column; align-items: flex-start;">
                            <span class="info-label">Active Players</span>
                            <div class="player-list">
                    `;
                    data.player_list.forEach(player => {{
                        const duration = Math.floor(player.duration / 60);
                        html += `
                            <div class="player">
                                ${{player.name}} - Score: ${{player.score}} - Time: ${{duration}}m
                            </div>
                        `;
                    }});
                    html += '</div></div>';
                }}
                
                html += '</div>';
                
                document.getElementById('widget').innerHTML = html;
            }} catch (error) {{
                document.getElementById('widget').innerHTML = `
                    <div class="error">Failed to load server data</div>
                `;
            }}
        }}

        // Initial fetch
        fetchServerData();
        
        // Auto-refresh
        setInterval(fetchServerData, REFRESH_INTERVAL);
    </script>
</body>
</html>
    """
    
    return HTMLResponse(content=html)


@api_router.get("/download-project")
async def download_project():
    """Create and download a ZIP file of the project"""
    try:
        # Create a BytesIO object to store the zip file in memory
        zip_buffer = io.BytesIO()
        
        # Create a ZIP file
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Define the project root
            project_root = Path('/app')
            
            # Files to include
            files_to_include = [
                'backend/server.py',
                'backend/requirements.txt',
                'backend/.env.example',
                'frontend/src/App.js',
                'frontend/src/App.css',
                'frontend/src/index.js',
                'frontend/src/pages/HomePage.js',
                'frontend/src/pages/SettingsPage.js',
                'frontend/src/pages/PreviewPage.js',
                'frontend/src/pages/SecretDownloadPage.js',
                'frontend/src/components/WidgetPreview.js',
                'frontend/package.json',
                'frontend/tailwind.config.js',
                'frontend/postcss.config.js',
                'frontend/.env.example'
            ]
            
            # Add files to ZIP
            for file_path in files_to_include:
                full_path = project_root / file_path
                if full_path.exists():
                    # Add file to zip with its relative path
                    zip_file.write(full_path, f'cs-server-embed-generator/{file_path}')
            
            # Create README.md
            readme_content = """# CS Server Embed Generator

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
"""
            
            # Add README to ZIP
            zip_file.writestr('cs-server-embed-generator/README.md', readme_content)
            
            # Create .env.example files
            backend_env_example = """MONGO_URL=mongodb://localhost:27017
DB_NAME=cs_server_db
CORS_ORIGINS=*
BACKEND_URL=http://localhost:8001
"""
            zip_file.writestr('cs-server-embed-generator/backend/.env.example', backend_env_example)
            
            frontend_env_example = """REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=443
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
"""
            zip_file.writestr('cs-server-embed-generator/frontend/.env.example', frontend_env_example)
        
        # Seek to the beginning of the BytesIO object
        zip_buffer.seek(0)
        
        # Return the ZIP file as a streaming response
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=cs-server-embed-generator-{int(time.time())}.zip"
            }
        )
    
    except Exception as e:
        logger.error(f"Error creating project download: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create project download")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
