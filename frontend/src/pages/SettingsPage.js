import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Sparkles, Palette, Layout, Settings } from "lucide-react";
import WidgetPreview from "@/components/WidgetPreview";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SettingsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { serverData, serverIp, serverPort } = location.state || {};

  const [enabledFields, setEnabledFields] = useState({
    hostname: true,
    map: true,
    current_players: true,
    max_players: true,
    player_list: false,
    game: true,
    ping: true,
    password_protected: true,
    vac_enabled: true
  });

  const [theme, setTheme] = useState("neon");
  const [accentColor, setAccentColor] = useState("#00ff88");
  const [backgroundColor, setBackgroundColor] = useState("#0f0f14");
  const [textColor, setTextColor] = useState("#e0e0e0");
  const [fontFamily, setFontFamily] = useState("'Space Grotesk', sans-serif");
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [darkMode, setDarkMode] = useState(true);
  const [borderRadius, setBorderRadius] = useState(16);
  const [borderStyle, setBorderStyle] = useState("solid");
  const [shadowIntensity, setShadowIntensity] = useState(50);
  const [animationSpeed, setAnimationSpeed] = useState("normal");
  const [layout, setLayout] = useState("default");
  const [loading, setLoading] = useState(false);

  // If no server data, show message
  if (!serverData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="glass-card p-8 text-center max-w-md fade-in">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-4 text-[#00ff88]">No Server Data</h2>
          <p className="text-gray-400 mb-6">Please enter a server IP and port on the home page first.</p>
          <Button
            data-testid="go-home-btn"
            onClick={() => navigate("/")}
            className="btn-primary"
          >
            🏠 Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const toggleField = (field) => {
    setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleGenerateEmbed = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/save-config`, {
        server_ip: serverIp,
        server_port: serverPort,
        enabled_fields: enabledFields,
        theme,
        accent_color: accentColor,
        background_color: backgroundColor,
        text_color: textColor,
        font_family: fontFamily,
        refresh_interval: refreshInterval,
        dark_mode: darkMode,
        border_radius: borderRadius,
        border_style: borderStyle,
        shadow_intensity: shadowIntensity,
        animation_speed: animationSpeed,
        layout: layout
      });

      const configId = response.data.config_id;
      toast.success("✨ Widget configuration saved!");
      
      setTimeout(() => {
        navigate(`/preview/${configId}`);
      }, 500);
    } catch (error) {
      toast.error("❌ Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  const themePresets = {
    neon: { accent: "#00ff88", bg: "#0f0f14", text: "#e0e0e0" },
    classic: { accent: "#4a9eff", bg: "#1a1d29", text: "#e5e7eb" },
    minimal: { accent: "#888888", bg: "#ffffff", text: "#1a1a1a" },
    terminal: { accent: "#00ff00", bg: "#000000", text: "#00ff00" },
    retro: { accent: "#ff6b9d", bg: "#2d1b4e", text: "#ffd700" },
    glassmorphism: { accent: "#60a5fa", bg: "#1e293b", text: "#f1f5f9" },
    military: { accent: "#84cc16", bg: "#1c1c1c", text: "#d4d4d4" },
    cyberpunk: { accent: "#ff00ff", bg: "#0a0a1e", text: "#00ffff" }
  };

  useEffect(() => {
    const preset = themePresets[theme];
    if (preset) {
      setAccentColor(preset.accent);
      setBackgroundColor(preset.bg);
      setTextColor(preset.text);
    }
  }, [theme]);

  const fieldLabels = {
    hostname: "Server Hostname",
    map: "Current Map",
    current_players: "Players Online",
    max_players: "Max Players",
    player_list: "Player List (with names & scores)",
    game: "Game Name",
    ping: "Server Ping",
    password_protected: "Password Status",
    vac_enabled: "VAC Status"
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 relative z-10">
      <div className="max-w-7xl mx-auto">
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
            Customize Your Widget
          </h1>
          <p className="text-gray-400 text-lg">Create a unique embed that matches your website's style</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Settings Panel */}
          <div className="space-y-6 slide-in-left">
            <Tabs defaultValue="fields" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="fields" data-testid="fields-tab">
                  <Layout className="mr-2 h-4 w-4" />
                  Fields
                </TabsTrigger>
                <TabsTrigger value="design" data-testid="design-tab">
                  <Palette className="mr-2 h-4 w-4" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="advanced" data-testid="advanced-tab">
                  <Settings className="mr-2 h-4 w-4" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              {/* Fields Tab */}
              <TabsContent value="fields" className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4 text-[#00ff88] flex items-center">
                    📊 Display Fields
                  </h2>
                  <div className="space-y-3">
                    {Object.entries(fieldLabels).map(([field, label]) => (
                      <div key={field} className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                        <Label htmlFor={field} className="text-sm font-medium cursor-pointer flex-1">
                          {label}
                        </Label>
                        <Switch
                          id={field}
                          data-testid={`toggle-${field}`}
                          checked={enabledFields[field]}
                          onCheckedChange={() => toggleField(field)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Design Tab */}
              <TabsContent value="design" className="space-y-6">
                {/* Theme Selection */}
                <div className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4 text-[#00ff88]">🎨 Widget Theme</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.keys(themePresets).map((t) => (
                      <div
                        key={t}
                        data-testid={`theme-${t}`}
                        onClick={() => setTheme(t)}
                        className={`theme-card p-4 rounded-lg border-2 text-center cursor-pointer transition-all ${
                          theme === t ? 'selected border-[#00ff88]' : 'border-gray-700 hover:border-gray-500'
                        }`}
                        style={{ 
                          background: themePresets[t].bg,
                          color: themePresets[t].text
                        }}
                      >
                        <div className="text-xs font-semibold uppercase tracking-wider">{t}</div>
                        <div className="mt-2 h-2 rounded" style={{ background: themePresets[t].accent }}></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color Customization */}
                <div className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4 text-[#00ff88]">🎨 Colors</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="accent-color" className="mb-2 block text-sm">Accent Color</Label>
                      <div className="flex gap-3">
                        <Input
                          id="accent-color"
                          data-testid="accent-color-input"
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="h-12 w-20 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="input-neon flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bg-color" className="mb-2 block text-sm">Background Color</Label>
                      <div className="flex gap-3">
                        <Input
                          id="bg-color"
                          data-testid="bg-color-input"
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="h-12 w-20 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="input-neon flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="text-color" className="mb-2 block text-sm">Text Color</Label>
                      <div className="flex gap-3">
                        <Input
                          id="text-color"
                          data-testid="text-color-input"
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="h-12 w-20 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="input-neon flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Font & Layout */}
                <div className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4 text-[#00ff88]">🔤 Typography & Layout</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="font" className="mb-2 block">Font Family</Label>
                      <Select value={fontFamily} onValueChange={setFontFamily}>
                        <SelectTrigger id="font" data-testid="font-select" className="input-neon">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="'Space Grotesk', sans-serif">Space Grotesk</SelectItem>
                          <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                          <SelectItem value="'Roboto Mono', monospace">Roboto Mono</SelectItem>
                          <SelectItem value="'Orbitron', sans-serif">Orbitron</SelectItem>
                          <SelectItem value="'Press Start 2P', cursive">Press Start 2P</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="layout" className="mb-2 block">Layout Style</Label>
                      <Select value={layout} onValueChange={setLayout}>
                        <SelectTrigger id="layout" data-testid="layout-select" className="input-neon">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="wide">Wide</SelectItem>
                          <SelectItem value="cards">Card-based</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4 text-[#00ff88]">⚙️ Advanced Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="border-radius" className="mb-3 block">
                        Border Radius: <span className="text-[#00ff88]">{borderRadius}px</span>
                      </Label>
                      <Slider
                        id="border-radius"
                        data-testid="border-radius-slider"
                        value={[borderRadius]}
                        onValueChange={(val) => setBorderRadius(val[0])}
                        min={0}
                        max={30}
                        step={2}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label htmlFor="shadow" className="mb-3 block">
                        Shadow Intensity: <span className="text-[#00ff88]">{shadowIntensity}%</span>
                      </Label>
                      <Slider
                        id="shadow"
                        data-testid="shadow-slider"
                        value={[shadowIntensity]}
                        onValueChange={(val) => setShadowIntensity(val[0])}
                        min={0}
                        max={100}
                        step={10}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label htmlFor="border-style" className="mb-2 block">Border Style</Label>
                      <Select value={borderStyle} onValueChange={setBorderStyle}>
                        <SelectTrigger id="border-style" data-testid="border-style-select" className="input-neon">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="dashed">Dashed</SelectItem>
                          <SelectItem value="dotted">Dotted</SelectItem>
                          <SelectItem value="double">Double</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="animation" className="mb-2 block">Animation Speed</Label>
                      <Select value={animationSpeed} onValueChange={setAnimationSpeed}>
                        <SelectTrigger id="animation" data-testid="animation-select" className="input-neon">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="slow">Slow</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="fast">Fast</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="refresh-interval" className="mb-2 block">
                        Auto-Refresh Interval (seconds)
                      </Label>
                      <Input
                        id="refresh-interval"
                        data-testid="refresh-interval-input"
                        type="number"
                        min="5"
                        max="300"
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 30)}
                        className="input-neon"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                      <Label htmlFor="dark-mode" className="cursor-pointer">Dark Mode</Label>
                      <Switch
                        id="dark-mode"
                        data-testid="dark-mode-switch"
                        checked={darkMode}
                        onCheckedChange={setDarkMode}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Generate Button */}
            <Button
              data-testid="generate-embed-btn"
              onClick={handleGenerateEmbed}
              disabled={loading}
              className="w-full btn-primary h-14 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Embed Code
                </>
              )}
            </Button>
          </div>

          {/* Live Preview */}
          <div className="lg:sticky lg:top-8 h-fit slide-in-right">
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-4 text-[#00ff88] flex items-center">
                👁️ Live Preview
              </h2>
              <div className="border border-gray-700 rounded-lg p-4 bg-black/30">
                <WidgetPreview
                  serverData={serverData}
                  enabledFields={enabledFields}
                  theme={theme}
                  accentColor={accentColor}
                  backgroundColor={backgroundColor}
                  textColor={textColor}
                  fontFamily={fontFamily}
                  darkMode={darkMode}
                  borderRadius={borderRadius}
                  borderStyle={borderStyle}
                  shadowIntensity={shadowIntensity}
                  animationSpeed={animationSpeed}
                  layout={layout}
                />
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Preview updates in real-time as you customize
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
