import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, ExternalLink, ArrowLeft, Share2, Code2, Terminal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PreviewPage = () => {
  const { configId } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiResponse, setApiResponse] = useState(null);

  useEffect(() => {
    if (configId) {
      fetchConfig();
      fetchApiExample();
    }
  }, [configId]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config/${configId}`);
      setConfig(response.data);
    } catch (error) {
      toast.error("Failed to load configuration");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchApiExample = async () => {
    try {
      const response = await axios.get(`${API}/server-status/${configId}`);
      setApiResponse(response.data);
    } catch (error) {
      console.error("Failed to fetch API example", error);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      console.error('Copy failed:', error);
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success(`${label} copied to clipboard!`);
      } catch (err) {
        toast.error(`Failed to copy ${label}`);
      }
      document.body.removeChild(textArea);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="pulse text-4xl mb-4">⏳</div>
          <p className="text-gray-400">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const widgetUrl = `${BACKEND_URL}/api/widget/${configId}`;
  const previewUrl = `${window.location.origin}/preview/${configId}`;
  const apiEndpoint = `${API}/server-status/${configId}`;
  
  const iframeCode = `<iframe src="${widgetUrl}" width="100%" height="400" frameborder="0" style="border-radius: 16px;"></iframe>`;
  
  const standaloneCode = `<!-- CS Server Widget - Standalone Version -->
<div id="cs-server-widget-${configId}"></div>
<script>
(function() {
  const containerId = 'cs-server-widget-${configId}';
  const apiUrl = '${API}/server-status/${configId}';
  const refreshInterval = ${config.refresh_interval} * 1000;
  
  async function fetchData() {
    try {
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      const container = document.getElementById(containerId);
      if (!result.success) {
        container.innerHTML = '<div style="color: #ff4444; padding: 20px; text-align: center;">❌ Server offline or unavailable</div>';
        return;
      }
      
      const data = result.data;
      const cfg = result.config;
      
      let html = '<div style="font-family: ' + cfg.font_family + '; background: ' + (cfg.dark_mode ? 'rgba(15, 15, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)') + '; border-radius: 16px; padding: 20px; border: 1px solid ' + cfg.accent_color + '40; backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);">';
      
      if (data.hostname) {
        html += '<div style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: ' + cfg.accent_color + ';">' + data.hostname + '</div>';
      }
      
      html += '<div style="display: grid; gap: 12px;">';
      
      if (data.map) {
        html += '<div style="display: flex; justify-content: space-between; padding: 10px; background: ' + (cfg.dark_mode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)') + '; border-radius: 8px; border-left: 3px solid ' + cfg.accent_color + ';"><span style="opacity: 0.7;">🗺️ Map</span><span style="font-weight: 600;">' + data.map + '</span></div>';
      }
      
      if (data.current_players !== undefined) {
        const maxPlayers = data.max_players !== undefined ? '/' + data.max_players : '';
        html += '<div style="display: flex; justify-content: space-between; padding: 10px; background: ' + (cfg.dark_mode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)') + '; border-radius: 8px; border-left: 3px solid ' + cfg.accent_color + ';"><span style="opacity: 0.7;">👥 Players</span><span style="font-weight: 600;">' + data.current_players + maxPlayers + '</span></div>';
      }
      
      if (data.game) {
        html += '<div style="display: flex; justify-content: space-between; padding: 10px; background: ' + (cfg.dark_mode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)') + '; border-radius: 8px; border-left: 3px solid ' + cfg.accent_color + ';"><span style="opacity: 0.7;">🎮 Game</span><span style="font-weight: 600;">' + data.game + '</span></div>';
      }
      
      if (data.ping !== undefined) {
        html += '<div style="display: flex; justify-content: space-between; padding: 10px; background: ' + (cfg.dark_mode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)') + '; border-radius: 8px; border-left: 3px solid ' + cfg.accent_color + ';"><span style="opacity: 0.7;">📡 Ping</span><span style="font-weight: 600;">' + data.ping + 'ms</span></div>';
      }
      
      html += '</div></div>';
      container.innerHTML = html;
    } catch (error) {
      console.error('Failed to fetch server data:', error);
    }
  }
  
  fetchData();
  setInterval(fetchData, refreshInterval);
})();
</script>`;

  // API Code Examples
  const javascriptFetch = `// Fetch CS Server Status with JavaScript
const apiUrl = '${apiEndpoint}';

async function getServerStatus() {
  try {
    const response = await fetch(apiUrl);
    const result = await response.json();
    
    if (result.success) {
      console.log('Server Data:', result.data);
      console.log('Widget Config:', result.config);
      
      // Use the data in your custom design
      const serverData = result.data;
      document.getElementById('hostname').textContent = serverData.hostname;
      document.getElementById('map').textContent = serverData.map;
      document.getElementById('players').textContent = 
        \`\${serverData.current_players}/\${serverData.max_players}\`;
      document.getElementById('ping').textContent = \`\${serverData.ping}ms\`;
    } else {
      console.error('Server offline:', result.error);
    }
  } catch (error) {
    console.error('API Error:', error);
  }
}

// Auto-refresh every ${config.refresh_interval} seconds
getServerStatus();
setInterval(getServerStatus, ${config.refresh_interval * 1000});`;

  const pythonFetch = `# Fetch CS Server Status with Python
import requests
import time

API_URL = '${apiEndpoint}'

def get_server_status():
    try:
        response = requests.get(API_URL, timeout=10)
        result = response.json()
        
        if result['success']:
            server_data = result['data']
            print(f"Server: {server_data.get('hostname', 'N/A')}")
            print(f"Map: {server_data.get('map', 'N/A')}")
            print(f"Players: {server_data.get('current_players', 0)}/{server_data.get('max_players', 0)}")
            print(f"Ping: {server_data.get('ping', 0)}ms")
            return server_data
        else:
            print(f"Server offline: {result.get('error', 'Unknown error')}")
            return None
    except Exception as e:
        print(f"API Error: {e}")
        return None

# Auto-refresh every ${config.refresh_interval} seconds
while True:
    get_server_status()
    time.sleep(${config.refresh_interval})`;

  const curlCommand = `# Fetch CS Server Status with cURL
curl -X GET '${apiEndpoint}' \\
  -H 'Content-Type: application/json'`;

  const reactExample = `// React Component Example
import { useState, useEffect } from 'react';
import axios from 'axios';

function ServerStatus() {
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServer = async () => {
      try {
        const response = await axios.get('${apiEndpoint}');
        if (response.data.success) {
          setServerData(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch server:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServer();
    const interval = setInterval(fetchServer, ${config.refresh_interval * 1000});
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!serverData) return <div>Server offline</div>;

  return (
    <div className="server-status">
      <h2>{serverData.hostname}</h2>
      <p>Map: {serverData.map}</p>
      <p>Players: {serverData.current_players}/{serverData.max_players}</p>
      <p>Ping: {serverData.ping}ms</p>
    </div>
  );
}`;

  const jsonResponse = apiResponse ? JSON.stringify(apiResponse, null, 2) : `{
  "success": true,
  "data": {
    "hostname": "CS 1.6 Server Name",
    "map": "de_dust2",
    "current_players": 12,
    "max_players": 16,
    "game": "Counter-Strike",
    "ping": 45.23,
    "password_protected": false,
    "vac_enabled": true
  },
  "config": {
    "theme": "${config.theme}",
    "accent_color": "${config.accent_color}",
    "dark_mode": ${config.dark_mode},
    "refresh_interval": ${config.refresh_interval}
  }
}`;

  return (
    <div className="min-h-screen p-4 sm:p-8 relative z-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 fade-in">
          <Button
            data-testid="back-to-home-btn"
            onClick={() => navigate("/")}
            variant="ghost"
            className="mb-4 text-gray-400 hover:text-[#00ff88] transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-4xl sm:text-5xl font-bold neon-glow mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Your Widget is Ready! 🎉
          </h1>
          <p className="text-gray-400 text-lg">Copy the embed code or use the API endpoint for custom integrations</p>
        </div>

        <Tabs defaultValue="embed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="embed" data-testid="embed-codes-tab">
              <Code2 className="mr-2 h-4 w-4" />
              Embed Codes
            </TabsTrigger>
            <TabsTrigger value="api" data-testid="developer-api-tab">
              <Terminal className="mr-2 h-4 w-4" />
              Developer API
            </TabsTrigger>
          </TabsList>

          {/* Embed Codes Tab */}
          <TabsContent value="embed" className="space-y-6">
            {/* Share Preview Link */}
            <div className="glass-card p-6 slide-in-left">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg font-semibold text-[#00ff88]">📤 Shareable Preview Link</Label>
                <Button
                  data-testid="copy-preview-link-btn"
                  onClick={() => copyToClipboard(previewUrl, "Preview link")}
                  variant="ghost"
                  size="sm"
                  className="text-[#00ff88] hover:text-[#00d4ff]"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
              </div>
              <div className="code-block text-xs">
                {previewUrl}
              </div>
            </div>

            {/* Embed Code Tabs */}
            <div className="glass-card p-6 slide-in-left" style={{ animationDelay: '0.1s' }}>
              <Tabs defaultValue="iframe" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="iframe" data-testid="iframe-tab">🖼️ iFrame Embed</TabsTrigger>
                  <TabsTrigger value="standalone" data-testid="standalone-tab">📄 Standalone HTML</TabsTrigger>
                </TabsList>
                
                <TabsContent value="iframe" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold text-[#00ff88]">iFrame Embed Code</Label>
                    <Button
                      data-testid="copy-iframe-btn"
                      onClick={() => copyToClipboard(iframeCode, "iFrame code")}
                      variant="ghost"
                      size="sm"
                      className="text-[#00ff88] hover:text-[#00d4ff]"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </Button>
                  </div>
                  <div className="code-block text-xs">
                    {iframeCode}
                  </div>
                  <p className="text-sm text-gray-400">
                    ✓ Easiest option - just paste this code wherever you want the widget to appear
                  </p>
                </TabsContent>
                
                <TabsContent value="standalone" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold text-[#00ff88]">Standalone HTML Code</Label>
                    <Button
                      data-testid="copy-standalone-btn"
                      onClick={() => copyToClipboard(standaloneCode, "Standalone code")}
                      variant="ghost"
                      size="sm"
                      className="text-[#00ff88] hover:text-[#00d4ff]"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </Button>
                  </div>
                  <div className="code-block text-xs" style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {standaloneCode}
                  </div>
                  <p className="text-sm text-gray-400">
                    ✓ Self-contained code - no iFrame needed, fetches data directly from the API
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Live Widget Preview */}
            <div className="glass-card p-6 slide-in-left" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold text-[#00ff88]">🔴 Live Widget Preview</Label>
                <Button
                  data-testid="open-widget-btn"
                  onClick={() => window.open(widgetUrl, '_blank')}
                  variant="ghost"
                  size="sm"
                  className="text-[#00ff88] hover:text-[#00d4ff]"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
              <div className="border border-gray-700 rounded-lg overflow-hidden bg-black/30">
                <iframe
                  data-testid="widget-preview-iframe"
                  src={widgetUrl}
                  width="100%"
                  height="400"
                  frameBorder="0"
                  title="CS Server Widget Preview"
                  className="w-full"
                />
              </div>
            </div>
          </TabsContent>

          {/* Developer API Tab */}
          <TabsContent value="api" className="space-y-6">
            {/* API Endpoint */}
            <div className="glass-card p-6 slide-in-right">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg font-semibold text-[#00ff88]">🔗 API Endpoint</Label>
                <Button
                  data-testid="copy-api-endpoint-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    copyToClipboard(apiEndpoint, "API endpoint");
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-[#00ff88] hover:text-[#00d4ff]"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy URL
                </Button>
              </div>
              <div className="code-block text-xs break-all">
                {apiEndpoint}
              </div>
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400">
                  <strong>💡 Use this endpoint to build your own custom design!</strong>
                  <br />
                  Fetch real-time server data and display it however you want.
                </p>
              </div>
            </div>

            {/* JSON Response Example */}
            <div className="glass-card p-6 slide-in-right" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg font-semibold text-[#00ff88]">📋 JSON Response Format</Label>
                <Button
                  data-testid="copy-json-response-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    copyToClipboard(jsonResponse, "JSON response");
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-[#00ff88] hover:text-[#00d4ff]"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
              <div className="code-block text-xs" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {jsonResponse}
              </div>
            </div>

            {/* Code Examples */}
            <div className="glass-card p-6 slide-in-right" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-lg font-semibold mb-4 text-[#00ff88]">💻 Code Examples</h3>
              <Tabs defaultValue="js" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="js" data-testid="js-example-tab">JavaScript</TabsTrigger>
                  <TabsTrigger value="react" data-testid="react-example-tab">React</TabsTrigger>
                  <TabsTrigger value="python" data-testid="python-example-tab">Python</TabsTrigger>
                  <TabsTrigger value="curl" data-testid="curl-example-tab">cURL</TabsTrigger>
                </TabsList>

                <TabsContent value="js">
                  <div className="flex justify-end mb-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        copyToClipboard(javascriptFetch, "JavaScript code");
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-[#00ff88] hover:text-[#00d4ff]"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="code-block text-xs" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {javascriptFetch}
                  </div>
                </TabsContent>

                <TabsContent value="react">
                  <div className="flex justify-end mb-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        copyToClipboard(reactExample, "React code");
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-[#00ff88] hover:text-[#00d4ff]"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="code-block text-xs" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {reactExample}
                  </div>
                </TabsContent>

                <TabsContent value="python">
                  <div className="flex justify-end mb-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        copyToClipboard(pythonFetch, "Python code");
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-[#00ff88] hover:text-[#00d4ff]"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="code-block text-xs" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {pythonFetch}
                  </div>
                </TabsContent>

                <TabsContent value="curl">
                  <div className="flex justify-end mb-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        copyToClipboard(curlCommand, "cURL command");
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-[#00ff88] hover:text-[#00d4ff]"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="code-block text-xs">
                    {curlCommand}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* API Documentation */}
            <div className="glass-card p-6 slide-in-right" style={{ animationDelay: '0.3s' }}>
              <h3 className="text-lg font-semibold mb-4 text-[#00ff88]">📚 API Documentation</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Request Method</h4>
                  <p className="text-gray-400">GET</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Response Fields</h4>
                  <ul className="text-gray-400 space-y-1 list-disc list-inside">
                    <li><code>success</code> - Boolean indicating if request was successful</li>
                    <li><code>data.hostname</code> - Server hostname/name</li>
                    <li><code>data.map</code> - Current map being played</li>
                    <li><code>data.current_players</code> - Number of players online</li>
                    <li><code>data.max_players</code> - Maximum player capacity</li>
                    <li><code>data.game</code> - Game name</li>
                    <li><code>data.ping</code> - Server ping in milliseconds</li>
                    <li><code>data.password_protected</code> - Whether server requires password</li>
                    <li><code>data.vac_enabled</code> - VAC anti-cheat status</li>
                    <li><code>data.player_list</code> - Array of active players (if enabled)</li>
                    <li><code>config</code> - Widget configuration settings</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Error Handling</h4>
                  <p className="text-gray-400">If server is offline, <code>success</code> will be <code>false</code> and an <code>error</code> field will contain the error message.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Rate Limiting</h4>
                  <p className="text-gray-400">Recommended refresh interval: {config.refresh_interval} seconds. Avoid excessive requests to prevent server load.</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Configuration Info */}
        <div className="glass-card p-6 mt-6 fade-in">
          <h3 className="text-lg font-semibold mb-4 text-[#00ff88]">⚙️ Configuration Details</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Server:</span>
              <span className="ml-2 font-semibold">{config.server_ip}:{config.server_port}</span>
            </div>
            <div>
              <span className="text-gray-400">Theme:</span>
              <span className="ml-2 font-semibold capitalize">{config.theme}</span>
            </div>
            <div>
              <span className="text-gray-400">Accent Color:</span>
              <span className="ml-2 font-semibold">{config.accent_color}</span>
            </div>
            <div>
              <span className="text-gray-400">Refresh Interval:</span>
              <span className="ml-2 font-semibold">{config.refresh_interval}s</span>
            </div>
            <div>
              <span className="text-gray-400">Mode:</span>
              <span className="ml-2 font-semibold">{config.dark_mode ? "Dark" : "Light"}</span>
            </div>
            <div>
              <span className="text-gray-400">Config ID:</span>
              <span className="ml-2 font-mono text-xs">{config.config_id}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button
            data-testid="create-another-btn"
            onClick={() => navigate("/")}
            className="flex-1 btn-primary h-12"
          >
            ➕ Create Another Widget
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreviewPage;
