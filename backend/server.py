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
    
    widget_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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


@api_router.get("/widget/{widget_id}/config")
async def get_config(widget_id: str):
    """Retrieve a saved widget configuration"""
    config = await db.widget_configs.find_one({"widget_id": widget_id}, {"_id": 0})
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    # Convert ISO string timestamp back to datetime
    if isinstance(config['created_at'], str):
        config['created_at'] = datetime.fromisoformat(config['created_at'])
    
    return config


@api_router.get("/widget/{widget_id}/status")
async def get_server_status(widget_id: str):
    """Get real-time server status for a saved configuration"""
    config = await db.widget_configs.find_one({"widget_id": widget_id}, {"_id": 0})
    
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
            "background_color": config["background_color"],
            "text_color": config["text_color"],
            "font_family": config["font_family"],
            "dark_mode": config["dark_mode"],
            "border_radius": config["border_radius"],
            "border_style": config["border_style"],
            "shadow_intensity": config["shadow_intensity"],
            "animation_speed": config["animation_speed"],
            "refresh_interval": config["refresh_interval"]
        }
    }


@api_router.get("/widget/{widget_id}", response_class=HTMLResponse)
async def serve_widget(widget_id: str):
    """Serve the live widget HTML for iframe embedding - Mobile-First Design"""
    config = await db.widget_configs.find_one({"widget_id": widget_id}, {"_id": 0})
    
    if not config:
        return HTMLResponse("<div style='color:red;padding:20px;'>Widget configuration not found</div>", status_code=404)
    
    # Get the backend URL from environment
    backend_url = os.environ.get('BACKEND_URL', 'http://localhost:8001')
    
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CS Server Status</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * {{ 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }}
        
        html, body {{
            width: 100%;
            height: 100%;
            overflow: hidden;
            position: fixed;
            -webkit-overflow-scrolling: touch;
        }}
        
        body {{
            font-family: {config['font_family']};
            background: transparent;
            color: {'#e0e0e0' if config['dark_mode'] else '#1a1a1a'};
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
        }}
        
        .widget-container {{
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            background: {config['background_color']};
            color: {config['text_color']};
            border-radius: {config['border_radius']}px;
            border: 2px {config['border_style']} {config['accent_color']};
            box-shadow: 0 0 {20 + config['shadow_intensity']//5}px {config['accent_color']}40;
            padding: clamp(12px, 3vw, 20px);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }}
        
        .widget-header {{
            margin-bottom: clamp(12px, 3vw, 16px);
            padding-bottom: clamp(8px, 2vw, 12px);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
        }}
        
        .server-name {{
            font-size: clamp(14px, 4vw, 18px);
            font-weight: 700;
            color: {config['accent_color']};
            margin-bottom: 4px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.3;
        }}
        
        .server-address {{
            font-size: clamp(10px, 2.5vw, 12px);
            opacity: 0.5;
            font-family: 'JetBrains Mono', monospace;
        }}
        
        .status-badge {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px);
            background: {config['accent_color']};
            color: #000;
            border-radius: 8px;
            font-size: clamp(10px, 2.5vw, 12px);
            font-weight: 700;
            margin-top: 8px;
        }}
        
        .status-indicator {{
            width: 6px;
            height: 6px;
            background: #000;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
        }}
        
        @keyframes pulse {{
            0%, 100% {{ opacity: 1; transform: scale(1); }}
            50% {{ opacity: 0.7; transform: scale(0.9); }}
        }}
        
        .info-grid {{
            display: grid;
            gap: clamp(8px, 2vw, 12px);
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: {config['accent_color']}40 transparent;
        }}
        
        .info-grid::-webkit-scrollbar {{
            width: 4px;
        }}
        
        .info-grid::-webkit-scrollbar-track {{
            background: transparent;
        }}
        
        .info-grid::-webkit-scrollbar-thumb {{
            background: {config['accent_color']}40;
            border-radius: 2px;
        }}
        
        .info-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: clamp(8px, 2vw, 12px);
            background: rgba(0,0,0,0.3);
            border-radius: clamp(6px, 1.5vw, 10px);
            font-size: clamp(11px, 2.8vw, 14px);
            transition: all 0.3s ease;
            min-height: 40px;
        }}
        
        .info-item:hover {{
            background: rgba(0,0,0,0.4);
            transform: translateX(2px);
        }}
        
        .info-label {{
            opacity: 0.7;
            display: flex;
            align-items: center;
            gap: clamp(4px, 1vw, 8px);
            flex-shrink: 0;
        }}
        
        .info-value {{
            font-weight: 600;
            text-align: right;
            word-break: break-word;
            overflow-wrap: break-word;
            max-width: 60%;
        }}
        
        .player-list {{
            width: 100%;
            margin-top: 8px;
            max-height: 200px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }}
        
        .player {{
            padding: clamp(6px, 1.5vw, 8px);
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            margin-bottom: 6px;
            font-size: clamp(10px, 2.5vw, 12px);
        }}
        
        .error {{
            padding: clamp(16px, 4vw, 24px);
            text-align: center;
            color: #ef4444;
            font-size: clamp(12px, 3vw, 14px);
        }}
        
        .loading {{
            display: flex;
            align-items: center;
            justify-content: center;
            padding: clamp(20px, 5vw, 40px);
            font-size: clamp(12px, 3vw, 14px);
            opacity: 0.7;
        }}
        
        .footer {{
            margin-top: clamp(8px, 2vw, 12px);
            padding-top: clamp(8px, 2vw, 12px);
            border-top: 1px solid rgba(255,255,255,0.05);
            text-align: center;
            font-size: clamp(8px, 2vw, 10px);
            opacity: 0.3;
            flex-shrink: 0;
        }}
        
        /* Tablet styles */
        @media (min-width: 768px) {{
            .widget-container {{
                max-width: 500px;
            }}
            
            .info-grid {{
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            }}
        }}
        
        /* Desktop styles */
        @media (min-width: 1024px) {{
            .widget-container {{
                max-width: 600px;
            }}
        }}
    </style>
</head>
<body>
    <div id="widget" class="loading">Loading server data...</div>

    <script>
        const WIDGET_ID = '{widget_id}';
        const API_URL = '{backend_url}/api/widget/' + WIDGET_ID + '/status';
        const REFRESH_INTERVAL = {config['refresh_interval']} * 1000;

        async function fetchServerData() {{
            try {{
                const response = await fetch(API_URL);
                const result = await response.json();
                
                if (!result.success) {{
                    document.getElementById('widget').innerHTML = `
                        <div class="widget-container">
                            <div class="error">⚠️ Server offline or unreachable</div>
                        </div>
                    `;
                    return;
                }}
                
                const data = result.data;
                const cfg = result.config;
                
                let html = '<div class="widget-container">';
                
                // Header
                if (data.hostname) {{
                    html += `
                        <div class="widget-header">
                            <div class="server-name">${{data.hostname}}</div>
                            <div class="server-address">{config['server_ip']}:{config['server_port']}</div>
                            <div class="status-badge">
                                <div class="status-indicator"></div>
                                ONLINE
                            </div>
                        </div>
                    `;
                }}
                
                html += '<div class="info-grid">';
                
                if (data.map !== undefined) {{
                    html += `
                        <div class="info-item">
                            <span class="info-label">🗺️ Map</span>
                            <span class="info-value">${{data.map}}</span>
                        </div>
                    `;
                }}
                
                if (data.current_players !== undefined) {{
                    html += `
                        <div class="info-item">
                            <span class="info-label">👥 Players</span>
                            <span class="info-value">${{data.current_players}}/${{data.max_players}}</span>
                        </div>
                    `;
                }}
                
                if (data.game !== undefined) {{
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
                
                html += '</div>';
                
                if (data.player_list && data.player_list.length > 0) {{
                    html += `
                        <div style="margin-top: clamp(12px, 3vw, 16px);">
                            <div class="info-label" style="margin-bottom: 8px;">Active Players ($ {{data.player_list.length}})</div>
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
                
                html += `
                    <div class="footer">
                        ⚡ Auto-refresh: ${{{config['refresh_interval']}}}s
                    </div>
                </div>`;
                
                document.getElementById('widget').innerHTML = html;
            }} catch (error) {{
                document.getElementById('widget').innerHTML = `
                    <div class="widget-container">
                        <div class="error">Failed to load server data</div>
                    </div>
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
