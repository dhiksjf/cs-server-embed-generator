import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2, Lock, CheckCircle, FileCode, Folder, ArrowLeft } from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SecretDownloadPage = () => {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadComplete(false);
    
    try {
      toast.info("📦 Preparing project files...");
      
      const response = await axios.get(`${API}/download-project`, {
        responseType: 'blob',
        timeout: 60000 // 60 seconds timeout
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cs-server-embed-generator-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setDownloadComplete(true);
      toast.success("✨ Project files downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("❌ Failed to download project files");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#00ff88] opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00d4ff] opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <Button
          onClick={() => navigate("/")}
          variant="ghost"
          className="mb-6 text-gray-400 hover:text-[#00ff88] transition-colors fade-in"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        {/* Main Card */}
        <div className="glass-card p-8 sm:p-12 text-center fade-in">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00ff88] opacity-20 blur-2xl rounded-full"></div>
              <div className="relative bg-gradient-to-br from-[#00ff88] to-[#00d4ff] p-6 rounded-full">
                <Lock className="h-12 w-12 text-black" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 neon-glow" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Secret Developer Zone
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            🔒 You've discovered the hidden download page!
          </p>

          {/* Features List */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8 text-left">
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-black/20">
              <FileCode className="h-5 w-5 text-[#00ff88] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-sm mb-1">Complete Source Code</h3>
                <p className="text-xs text-gray-400">Frontend & Backend files</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-black/20">
              <Folder className="h-5 w-5 text-[#00ff88] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-sm mb-1">Project Structure</h3>
                <p className="text-xs text-gray-400">Organized & documented</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-black/20">
              <CheckCircle className="h-5 w-5 text-[#00ff88] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-sm mb-1">Dependencies</h3>
                <p className="text-xs text-gray-400">All requirements included</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-black/20">
              <CheckCircle className="h-5 w-5 text-[#00ff88] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-sm mb-1">Ready to Deploy</h3>
                <p className="text-xs text-gray-400">Configuration files included</p>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <Button
            data-testid="download-project-btn"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary h-16 text-lg px-12 w-full sm:w-auto"
          >
            {downloading ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Preparing Download...
              </>
            ) : downloadComplete ? (
              <>
                <CheckCircle className="mr-3 h-6 w-6" />
                Download Complete!
              </>
            ) : (
              <>
                <Download className="mr-3 h-6 w-6" />
                Download Project Files
              </>
            )}
          </Button>

          {downloadComplete && (
            <p className="mt-4 text-sm text-[#00ff88] fade-in">
              ✓ Check your downloads folder
            </p>
          )}

          {/* Info */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              💡 This package includes all source code, configurations, and documentation
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Format: ZIP Archive | License: Open Source
            </p>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="glass-card p-6 mt-6 fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-lg font-semibold mb-3 text-[#00ff88]">What's Included?</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <span className="text-[#00ff88]">✓</span>
              <span>React Frontend (src/)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#00ff88]">✓</span>
              <span>FastAPI Backend (server.py)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#00ff88]">✓</span>
              <span>Database Models</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#00ff88]">✓</span>
              <span>API Documentation</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#00ff88]">✓</span>
              <span>Requirements.txt</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#00ff88]">✓</span>
              <span>Package.json</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#00ff88]">✓</span>
              <span>Environment Config</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#00ff88]">✓</span>
              <span>README.md</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecretDownloadPage;
