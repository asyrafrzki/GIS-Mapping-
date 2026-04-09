import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx'
import Testing from './testing.jsx'
import 'leaflet/dist/leaflet.css' // Penting agar map tidak berantakan

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)