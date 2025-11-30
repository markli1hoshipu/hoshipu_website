import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // ✅ only this works
import './index.css';
import 'react-datepicker/dist/react-datepicker.css';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Toaster />
  </>
);