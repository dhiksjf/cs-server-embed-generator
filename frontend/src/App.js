import { useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import SettingsPage from "@/pages/SettingsPage";
import PreviewPage from "@/pages/PreviewPage";
import SecretDownloadPage from "@/pages/SecretDownloadPage";
import { Toaster } from "sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/preview/:configId" element={<PreviewPage />} />
          <Route path="/secret-download" element={<SecretDownloadPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
