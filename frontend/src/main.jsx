/**
 * main.jsx
 * --------
 * React application bootstrap.
 * Mounts the root <App /> component into the #root div of index.html.
 * StrictMode is enabled to highlight potential issues during development.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
