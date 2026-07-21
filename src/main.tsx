import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initGA, trackPageView } from './utils/analytics';

initGA();
trackPageView('/', 'MF Rolling Returns — Home');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
