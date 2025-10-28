// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp';
import HallTicket from './HallTicket';
// 1. Import the new Scanner component
import './index.css';
import Scanpage from './Scanpage';
import { initializeAppInsights } from './appInsights';

// Initialize Application Insights
initializeAppInsights();

const root = ReactDOM.createRoot(document.getElementById('root'));

// Simple router based on the URL path
let ComponentToRender;
const pathname = window.location.pathname;

if (pathname.startsWith('/hallticket')) {
  ComponentToRender = HallTicket;
} else if (pathname.startsWith('/scanner')) { // 2. Add the new route
  ComponentToRender = Scanpage;
} else {
  // Any other path will default to the admin panel
  ComponentToRender = AdminApp;
}

root.render(
  <React.StrictMode>
    <ComponentToRender />
  </React.StrictMode>
);