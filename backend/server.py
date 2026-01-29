from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, Response
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'cs_server_widget')

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="CS Server Widget API", version="2.0")

# CORS Setup - Essential for your frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"], # Allow all origins for the generator to work
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# --- Models (Same as before, slightly optimized) ---
class ServerQueryRequest(BaseModel):
    ip: str
    port: int

class WidgetConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    widget_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    server_ip: str
    server_port: int
    enabled_fields: Dict[str, bool] = Field(default_factory=lambda: {
        "hostname": True, "map": True, "current_players": True,
        "max_players": True, "player_list": False, "game": True,
        "ping": True, "password_protected": True, "vac_enabled": True
    })
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

# --- Logic ---

def query_cs_server(ip: str, port: int, timeout: float = 2.0) -> Dict[str, Any]:
    """Optimized query function with better error handling"""
    try:
        address = (ip, port)
        start_time = time.time()
        
        # 1. Get Info
        info = a2s.info(address, timeout=timeout)
        ping = (time.time() - start_time) * 1000
        
        # 2. Get Players (Fail silently if this part times out, but return info)
        player_list = []
        try:
            players = a2s.players(address, timeout=timeout)
            player_list = [
                {"name": p.name, "score": p.score, "duration": int(p.duration)}
                for p in players if p.name
            ]
            # Sort by score
            player_list.sort(key=lambda x: x['score'], reverse=True)
        except Exception:
            pass # Player query failed, but server is online
        
        return {
            "success": True,
            "data": {
                "hostname": info.server_name,
                "map": info.map_name,
                "current_players": info.player_count,
                "max_players": info.max_players,
                "game": info.game,
                "server_type": str(info.server_type),
                "os": str(info.platform),
                "password_protected": info.password_protected,
                "vac_enabled": info.vac_enabled,
                "ping": round(ping),
                "player_list": player_list
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def generate_widget_html(config: dict, widget_id: str, backend_url: str) -> str:
    """Centralized HTML generator"""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Status</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        /* [Insert the CSS from your original code here - keeping it shortened for brevity] */
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: {config['font_family']}; background: transparent; color: {config['text_color']}; overflow: hidden; }}
        .widget-container {{
            background: {config['background_color']};
            border: 2px {config['border_style']} {config['accent_color']};
            border-radius: {config['border_radius']}px;
            box-shadow: 0 0 {20 + config['shadow_intensity']//5}px {config['accent_color']}40;
            padding: 16px;
            height: 100vh;
            display: flex; flex-direction: column;
            position: relative;
        }}
        .server-name {{ color: {config['accent_color']}; font-weight: 700; font-size: 1.1rem; margin-bottom: 4px; }}
        .status-badge {{ background: {config['accent_color']}; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 5px; }}
        .status-indicator {{ width: 8px; height: 8px; background: #000; border-radius: 50%; animation: pulse 1.5s infinite; }}
        @keyframes pulse {{ 0% {{ opacity: 1; }} 50% {{ opacity: 0.5; }} 100% {{ opacity: 1; }} }}
        .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }}
        .info-item {{ background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; font-size: 0.9rem; }}
        .info-label {{ opacity: 0.6; font-size: 0.8rem; display: block; }}
        .player-list {{ margin-top: 12px; overflow-y: auto; flex-grow: 1; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; }}
        .player {{ font-size: 0.85rem; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; }}
        .footer {{ font-size: 0.7rem; opacity: 0.4; text-align: center; margin-top: 8px; }}
        .loading, .error {{ height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; color: {config['text_color']}; }}
        .error {{ color: #ff4444; }}
    </style>
</head>
<body>
    <div id="widget" class="loading">Initializing...</div>
    <script>
        const WIDGET_ID = '{widget_id}';
        const API_URL = '{backend_url}/api/widget/' + WIDGET_ID + '/status';
        const CONFIG = {config};

        async function updateWidget() {{
            try {{
                const res = await fetch(API_URL);
                const json = await res.json();
                
                if(!json.success) {{
                    document.getElementById('widget').innerHTML = `<div class="widget-container"><div class="error">OFFLINE<br><span style="font-size:0.8em;opacity:0.7">${{json.error}}</span></div></div>`;
                    return;
                }}

                const d = json.data;
                const c = json.config;
                
                let html = `<div class="widget-container">`;
                
                // Header
                html += `
                    <div>
                        <div class="server-name">${{d.hostname}}</div>
                        <div class="status-badge"><div class="status-indicator"></div> ONLINE</div>
                    </div>
                `;

                // Grid
                html += `<div class="info-grid">`;
                if(c.enabled_fields.map) html += `<div class="info-item"><span class="info-label">MAP</span>${{d.map}}</div>`;
                if(c.enabled_fields.current_players) html += `<div class="info-item"><span class="info-label">PLAYERS</span>${{d.current_players}}/${{d.max_players}}</div>`;
                if(c.enabled_fields.ping) html += `<div class="info-item"><span class="info-label">PING</span>${{d.ping}}ms</div>`;
                if(c.enabled_fields.game) html += `<div class="info-item"><span class="info-label">GAME</span>${{d.game}}</div>`;
                html += `</div>`;

                // Player List
                if(c.enabled_fields.player_list && d.player_list.length > 0) {{
                    html += `<div class="player-list">`;
                    d.player_list.forEach(p => {{
                        html += `<div class="player"><span>${{p.name}}</span><span>${{p.score}}</span></div>`;
                    }});
                    html += `</div>`;
                }}

                html += `<div class="footer">${{d.current_players > 0 ? 'Active' : 'Waiting for players'}} | ${{{config['server_ip']}}}:${{{config['server_port']}}}</div>`;
                html += `</div>`;

                document.getElementById('widget').innerHTML = html;
            }} catch(e) {{
                console.error(e);
            }}
        }}

        updateWidget();
        setInterval(updateWidget, {config['refresh_interval']} * 1000);
    </script>
</body>
</html>
    """

# --- API Routes ---

@api_router.post("/query-server")
async def query_server(request: ServerQueryRequest):
    return await asyncio.to_thread(query_cs_server, request.ip, request.port)

@api_router.post("/save-config", response_model=WidgetConfig)
async def save_config(config: WidgetConfigCreate):
    config_obj = WidgetConfig(**config.model_dump())
    doc = config_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.widget_configs.insert_one(doc)
    return config_obj

@api_router.get("/widget/{widget_id}/status")
async def get_server_status(widget_id: str):
    config = await db.widget_configs.find_one({"widget_id": widget_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    result = await asyncio.to_thread(query_cs_server, config["server_ip"], config["server_port"])
    return {"success": result["success"], "data": result.get("data"), "error": result.get("error"), "config": config}

@api_router.get("/widget/{widget_id}", response_class=HTMLResponse)
async def serve_widget(widget_id: str):
    config = await db.widget_configs.find_one({"widget_id": widget_id}, {"_id": 0})
    if not config:
        return HTMLResponse("Widget not found", status_code=404)
    
    # Use the Koyeb URL provided
    backend_url = "https://unusual-rafaela-cs-server-embed-generator-879fda74.koyeb.app"
    return HTMLResponse(content=generate_widget_html(config, widget_id, backend_url))

# NEW FEATURE: Download the widget as a standalone HTML file
@api_router.get("/widget/{widget_id}/download")
async def download_widget(widget_id: str):
    config = await db.widget_configs.find_one({"widget_id": widget_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
        
    backend_url = "https://unusual-rafaela-cs-server-embed-generator-879fda74.koyeb.app"
    html_content = generate_widget_html(config, widget_id, backend_url)
    
    return Response(
        content=html_content,
        media_type="text/html",
        headers={"Content-Disposition": f"attachment; filename=cs_widget_{widget_id}.html"}
    )

app.include_router(api_router)
