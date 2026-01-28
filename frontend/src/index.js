import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Fixed import path
import './App.css';   // Import your custom neon styles
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
