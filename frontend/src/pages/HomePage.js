import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [serverIp, setServerIp] = useState("");
  const [serverPort, setServerPort] = useState("27015");
  const [loading, setLoading] = useState(false);
  const [serverData, setServerData] = useState(null);
  const navigate = useNavigate();

  const handleFetchServer = async () => {
    if (!serverIp || !serverPort) {
      toast.error("Please enter both IP and Port");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/query-server`, {
        ip: serverIp,
        port: parseInt(serverPort)
      });
      
      setServerData(response.data);
      toast.success("Server data fetched successfully!");
      
      // Navigate to settings page with server data
      setTimeout(() => {
        navigate("/settings", { 
          state: { 
            serverData: response.data,
            serverIp,
            serverPort: parseInt(serverPort)
          }
        });
      }, 500);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to query server. Check IP/Port and try again.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12 fade-in">
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 neon-glow" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            CS SERVER
          </h1>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6" style={{ 
            background: "linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "'Space Grotesk', sans-serif"
          }}>
            Embed Generator
          </h2>
          <p className="text-lg text-gray-400">Generate real-time HTML embeds for Counter-Strike 1.6 servers</p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-8 fade-in">
          <div className="space-y-6">
            {/* Server IP Input */}
            <div>
              <Label htmlFor="server-ip" className="text-base mb-2 block text-gray-300">
                Server IP Address
              </Label>
              <Input
                id="server-ip"
                data-testid="server-ip-input"
                type="text"
                placeholder="e.g., 192.168.1.100"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                className="input-neon text-lg h-12"
                disabled={loading}
              />
            </div>

            {/* Server Port Input */}
            <div>
              <Label htmlFor="server-port" className="text-base mb-2 block text-gray-300">
                Server Port
              </Label>
              <Input
                id="server-port"
                data-testid="server-port-input"
                type="text"
                placeholder="27015"
                value={serverPort}
                onChange={(e) => setServerPort(e.target.value)}
                className="input-neon text-lg h-12"
                disabled={loading}
              />
            </div>

            {/* Fetch Button */}
            <Button
              data-testid="fetch-server-btn"
              onClick={handleFetchServer}
              disabled={loading}
              className="w-full btn-primary h-14 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Fetching Server Data...
                </>
              ) : (
                "🔍 Fetch Server Info"
              )}
            </Button>
          </div>

          {/* Info */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="text-sm text-gray-400 space-y-2">
              <p className="flex items-center">
                <span className="text-[#00ff88] mr-2">✓</span>
                Real-time server status tracking
              </p>
              <p className="flex items-center">
                <span className="text-[#00ff88] mr-2">✓</span>
                Fully customizable widget design
              </p>
              <p className="flex items-center">
                <span className="text-[#00ff88] mr-2">✓</span>
                Auto-refresh with configurable intervals
              </p>
              <p className="flex items-center">
                <span className="text-[#00ff88] mr-2">✓</span>
                Responsive on all devices
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Source/GoldSrc Query Protocol</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
